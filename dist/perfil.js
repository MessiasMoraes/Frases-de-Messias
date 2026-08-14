import { app, db } from "./firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection,
  collectionGroup,
  doc,
  getCountFromServer,
  getDoc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const auth = getAuth(app);
const NOME_PADRAO = "Membro da comunidade";
const LIMITE_FRASES = 50;
const params = new URLSearchParams(window.location.search);
const uidPerfil = String(params.get("uid") || "").trim();

const refs = {
  estado: document.getElementById("estadoPerfil"),
  conteudo: document.getElementById("conteudoPerfil"),
  avatar: document.getElementById("avatarPerfil"),
  iniciais: document.getElementById("iniciaisPerfil"),
  foto: document.getElementById("fotoPerfil"),
  nome: document.getElementById("nomePerfil"),
  bio: document.getElementById("bioPerfil"),
  seguidores: document.getElementById("contadorSeguidores"),
  seguindo: document.getElementById("contadorSeguindo"),
  botaoSeguir: document.getElementById("botaoSeguir"),
  botaoEditar: document.getElementById("botaoEditarPerfil"),
  mensagem: document.getElementById("mensagemPerfil"),
  abaPublicadas: document.getElementById("abaPublicadas"),
  abaPendentes: document.getElementById("abaPendentes"),
  listaFrases: document.getElementById("listaFrasesPerfil"),
  template: document.getElementById("templateFrasePerfil"),
  alternarTema: document.getElementById("alternarTemaPerfil")
};

let usuarioAtual = null;
let dadosPerfil = null;
let seguindo = false;
let abaAtual = "publicadas";
let cancelarPerfil = null;
let cancelarFrases = null;

function textoLimpo(valor = "") {
  return String(valor).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function nomePadrao(usuario) {
  return textoLimpo(usuario?.displayName || usuario?.email?.split("@")[0] || NOME_PADRAO).slice(0, 48) || NOME_PADRAO;
}

function iniciais(nome) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase() || "FM";
}

function urlDeImagemSegura(valor) {
  const texto = textoLimpo(valor).slice(0, 500);
  if (!texto) return "";
  try {
    const url = new URL(texto);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function formatarNumero(valor) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(Math.max(0, Number(valor) || 0));
}

function dataFormatada(valor) {
  const data = valor?.toDate?.() || null;
  if (!data) return "Enviada recentemente";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(data);
}

function mostrarEstado(mensagem, erro = false) {
  refs.estado.textContent = mensagem;
  refs.estado.classList.toggle("erro", erro);
  refs.estado.hidden = false;
  refs.conteudo.hidden = true;
}

function mostrarMensagem(mensagem = "", erro = false) {
  refs.mensagem.textContent = mensagem;
  refs.mensagem.classList.toggle("erro", erro);
}

function ajustarTema() {
  const escuro = localStorage.getItem("tema") === "escuro";
  document.body.classList.toggle("tema-escuro", escuro);
  refs.alternarTema.textContent = escuro ? "☀️" : "🌙";
  refs.alternarTema.setAttribute("aria-label", escuro ? "Ativar tema claro" : "Ativar tema escuro");
}

function souDonoDoPerfil() {
  return Boolean(usuarioAtual && usuarioAtual.uid === uidPerfil);
}

function mostrarImagem(url, nome) {
  const segura = urlDeImagemSegura(url);
  refs.iniciais.textContent = iniciais(nome);
  refs.foto.removeAttribute("src");
  refs.foto.alt = segura ? `Foto de perfil de ${nome}` : "";
  refs.avatar.classList.remove("tem-foto");
  if (!segura) return;
  refs.foto.src = segura;
  refs.avatar.classList.add("tem-foto");
}

function renderizarPerfil() {
  const nome = textoLimpo(dadosPerfil?.nome || NOME_PADRAO);
  const bio = textoLimpo(dadosPerfil?.bio || "") || "Este membro ainda não adicionou uma biografia.";
  refs.nome.textContent = nome;
  refs.bio.textContent = bio;
  refs.seguidores.textContent = "…";
  refs.seguindo.textContent = "…";
  carregarContadoresSociais();
  mostrarImagem(dadosPerfil?.fotoUrl, nome);
  document.title = `${nome} | Frases de Messias`;

  const dono = souDonoDoPerfil();
  refs.botaoEditar.hidden = !dono;
  refs.botaoSeguir.hidden = dono;
  refs.abaPendentes.hidden = !dono;
  if (!dono && abaAtual === "pendentes") mudarAba("publicadas");
  atualizarBotaoSeguir();
}

function atualizarBotaoSeguir() {
  if (souDonoDoPerfil()) return;
  if (!usuarioAtual) {
    refs.botaoSeguir.textContent = "Entrar para seguir";
    refs.botaoSeguir.classList.remove("botao-seguindo");
    refs.botaoSeguir.disabled = false;
    return;
  }
  refs.botaoSeguir.textContent = seguindo ? "✓ Seguindo" : "Seguir";
  refs.botaoSeguir.classList.toggle("botao-seguindo", seguindo);
  refs.botaoSeguir.disabled = false;
}

async function garantirPerfilPublico(usuario) {
  const referencia = doc(db, "comunidadePerfis", usuario.uid);
  const existente = await getDoc(referencia);
  if (existente.exists()) return;
  await setDoc(referencia, {
    nome: nomePadrao(usuario),
    bio: "",
    fotoUrl: "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });
}

async function carregarContadoresSociais() {
  if (!uidPerfil) return;
  try {
    const [seguidores, seguindo] = await Promise.all([
      getCountFromServer(collection(db, "comunidadePerfis", uidPerfil, "seguidores")),
      getCountFromServer(query(collectionGroup(db, "seguidores"), where("usuarioId", "==", uidPerfil)))
    ]);
    refs.seguidores.textContent = formatarNumero(seguidores.data().count);
    refs.seguindo.textContent = formatarNumero(seguindo.data().count);
  } catch (erro) {
    console.warn("Não foi possível carregar os contadores sociais.", erro);
    refs.seguidores.textContent = "0";
    refs.seguindo.textContent = "0";
  }
}

async function atualizarEstadoDeSeguimento() {
  if (!usuarioAtual || souDonoDoPerfil() || !dadosPerfil) {
    seguindo = false;
    atualizarBotaoSeguir();
    return;
  }
  try {
    const registro = await getDoc(doc(db, "comunidadePerfis", uidPerfil, "seguidores", usuarioAtual.uid));
    seguindo = registro.exists();
  } catch (erro) {
    console.warn("Não foi possível verificar o seguimento.", erro);
    seguindo = false;
  }
  atualizarBotaoSeguir();
}

function renderizarEstadoVazio(mensagem) {
  refs.listaFrases.innerHTML = "";
  const estado = document.createElement("div");
  estado.className = "estado-feed";
  estado.textContent = mensagem;
  refs.listaFrases.appendChild(estado);
}

function renderizarFrases(resultado) {
  const frases = resultado.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const dataA = (a.publicadoEm || a.criadoEm)?.toMillis?.() || 0;
      const dataB = (b.publicadoEm || b.criadoEm)?.toMillis?.() || 0;
      return dataB - dataA;
    });

  if (!frases.length) {
    renderizarEstadoVazio(abaAtual === "pendentes"
      ? "Você ainda não tem frases aguardando aprovação."
      : "Ainda não há frases publicadas neste perfil.");
    return;
  }

  refs.listaFrases.innerHTML = "";
  frases.forEach((frase) => {
    const fragmento = refs.template.content.cloneNode(true);
    fragmento.querySelector(".selo-categoria").textContent = textoLimpo(frase.categoria || "Inspiração");
    fragmento.querySelector(".meta-frase-perfil").textContent = abaAtual === "pendentes"
      ? `Enviada em ${dataFormatada(frase.criadoEm)}`
      : `Publicada em ${dataFormatada(frase.publicadoEm)}`;
    fragmento.querySelector(".texto-publicacao").textContent = `“${textoLimpo(frase.texto)}”`;
    if (abaAtual === "pendentes") {
      const status = fragmento.querySelector(".status-frase-perfil");
      status.textContent = "Em análise pela moderação";
      status.hidden = false;
      status.classList.add("visivel");
    }
    refs.listaFrases.appendChild(fragmento);
  });
}

function escutarFrases() {
  if (cancelarFrases) cancelarFrases();
  if (!uidPerfil) return;
  const status = abaAtual === "pendentes" ? "pendente" : "publicado";
  const consulta = query(
    collection(db, "comunidadePublicacoes"),
    where("autorId", "==", uidPerfil),
    where("status", "==", status),
    limit(LIMITE_FRASES)
  );
  refs.listaFrases.innerHTML = '<div class="estado-feed carregando-feed">⏳ Carregando frases...</div>';
  cancelarFrases = onSnapshot(consulta, renderizarFrases, (erro) => {
    console.error("Erro ao carregar frases do perfil.", erro);
    renderizarEstadoVazio("Não foi possível carregar as frases deste perfil agora.");
  });
}

function mudarAba(aba) {
  if (aba === "pendentes" && !souDonoDoPerfil()) return;
  abaAtual = aba;
  refs.abaPublicadas.classList.toggle("ativa", aba === "publicadas");
  refs.abaPublicadas.setAttribute("aria-selected", String(aba === "publicadas"));
  refs.abaPendentes.classList.toggle("ativa", aba === "pendentes");
  refs.abaPendentes.setAttribute("aria-selected", String(aba === "pendentes"));
  escutarFrases();
}

async function alternarSeguimento() {
  if (!usuarioAtual) {
    const retorno = `${window.location.pathname}${window.location.search}`;
    window.location.href = `comunidade.html?entrar=1&retorno=${encodeURIComponent(retorno)}`;
    return;
  }
  if (souDonoDoPerfil() || !dadosPerfil) return;

  refs.botaoSeguir.disabled = true;
  mostrarMensagem(seguindo ? "Deixando de seguir..." : "Seguindo perfil...");
  const seguidorNoAlvo = doc(db, "comunidadePerfis", uidPerfil, "seguidores", usuarioAtual.uid);
  const alvoNoMeuSeguindo = doc(db, "comunidadePerfis", usuarioAtual.uid, "seguindo", uidPerfil);

  try {
    const novoEstado = await runTransaction(db, async (transacao) => {
      const registroAtual = await transacao.get(seguidorNoAlvo);
      const jaSegue = registroAtual.exists();
      if (jaSegue) {
        transacao.delete(seguidorNoAlvo);
        transacao.delete(alvoNoMeuSeguindo);
      } else {
        transacao.set(seguidorNoAlvo, { usuarioId: usuarioAtual.uid, criadoEm: serverTimestamp() });
        transacao.set(alvoNoMeuSeguindo, { usuarioId: uidPerfil, criadoEm: serverTimestamp() });
      }
      return !jaSegue;
    });
    seguindo = novoEstado;
    atualizarBotaoSeguir();
    carregarContadoresSociais();
    mostrarMensagem(seguindo ? "Agora você segue este perfil." : "Você deixou de seguir este perfil.");
  } catch (erro) {
    console.error("Erro ao atualizar seguimento.", erro);
    mostrarMensagem("Não foi possível atualizar o seguimento agora. Tente novamente.", true);
  } finally {
    refs.botaoSeguir.disabled = false;
  }
}

function iniciarPerfil() {
  if (!uidPerfil || uidPerfil.length > 128) {
    mostrarEstado("Perfil inválido ou não informado.", true);
    return;
  }
  const referencia = doc(db, "comunidadePerfis", uidPerfil);
  if (cancelarPerfil) cancelarPerfil();
  cancelarPerfil = onSnapshot(referencia, (resultado) => {
    if (!resultado.exists()) {
      mostrarEstado("Este perfil ainda não está disponível. Ele será ativado quando a pessoa voltar à Comunidade.");
      return;
    }
    dadosPerfil = resultado.data();
    refs.estado.hidden = true;
    refs.conteudo.hidden = false;
    renderizarPerfil();
    atualizarEstadoDeSeguimento();
    if (!cancelarFrases) escutarFrases();
  }, (erro) => {
    console.error("Erro ao carregar perfil.", erro);
    mostrarEstado("Não foi possível carregar este perfil agora. Tente novamente mais tarde.", true);
  });
}

refs.botaoSeguir.addEventListener("click", alternarSeguimento);
refs.abaPublicadas.addEventListener("click", () => mudarAba("publicadas"));
refs.abaPendentes.addEventListener("click", () => mudarAba("pendentes"));
refs.alternarTema.addEventListener("click", () => {
  localStorage.setItem("tema", document.body.classList.contains("tema-escuro") ? "claro" : "escuro");
  ajustarTema();
});

onAuthStateChanged(auth, async (usuario) => {
  usuarioAtual = usuario || null;
  if (usuario) {
    try { await garantirPerfilPublico(usuario); } catch (erro) { console.warn("Não foi possível preparar o perfil público.", erro); }
  }
  if (dadosPerfil) {
    renderizarPerfil();
    atualizarEstadoDeSeguimento();
    if (souDonoDoPerfil()) escutarFrases();
  }
});

window.addEventListener("beforeunload", () => {
  if (cancelarPerfil) cancelarPerfil();
  if (cancelarFrases) cancelarFrases();
});

ajustarTema();
iniciarPerfil();
