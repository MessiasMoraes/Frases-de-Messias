import { app, db } from "./firebase.js";
import { MOTIVOS_DENUNCIA, alternarBloqueio, carregarBloqueios, mensagemDeErroSeguranca, registrarDenuncia } from "./seguranca-comunidade.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
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
  metricas: document.querySelector(".metricas-perfil"),
  seguidores: document.getElementById("contadorSeguidores"),
  seguindo: document.getElementById("contadorSeguindo"),
  publicacoes: document.getElementById("contadorPublicacoesPerfil"),
  comentarios: document.getElementById("contadorComentariosPerfil"),
  membroDesde: document.getElementById("membroDesdePerfil"),
  botaoSeguir: document.getElementById("botaoSeguir"),
  botaoBloquear: document.getElementById("botaoBloquearPerfil"),
  botaoDenunciar: document.getElementById("botaoDenunciarPerfil"),
  modalDenuncia: document.getElementById("modalDenunciaPerfil"),
  fecharDenuncia: document.getElementById("fecharDenunciaPerfil"),
  formularioDenuncia: document.getElementById("formularioDenunciaPerfil"),
  motivoDenuncia: document.getElementById("motivoDenunciaPerfil"),
  detalhesDenuncia: document.getElementById("detalhesDenunciaPerfil"),
  enviarDenuncia: document.getElementById("enviarDenunciaPerfil"),
  mensagemDenuncia: document.getElementById("mensagemDenunciaPerfil"),
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
let perfilBloqueado = false;
let abaAtual = "publicadas";
let cancelarPerfil = null;
let cancelarFrases = null;
let cancelarSeguidores = null;
let cancelarSeguindo = null;
let comentariosAbertos = new Map();

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

function membroDesdeFormatado(valor) {
  const data = valor?.toDate?.() || null;
  if (!data) return "Membro da Comunidade";
  return `Membro desde ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(data)}`;
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
  const dono = souDonoDoPerfil();
  const mostrarMetricas = dono || dadosPerfil?.mostrarMetricasSociais !== false;
  refs.metricas.hidden = !mostrarMetricas;
  refs.seguidores.textContent = mostrarMetricas ? "…" : "";
  refs.seguindo.textContent = mostrarMetricas ? "…" : "";
  carregarContadoresSociais();
  carregarAtividadePublica();
  refs.membroDesde.textContent = membroDesdeFormatado(dadosPerfil?.criadoEm);
  mostrarImagem(dadosPerfil?.fotoUrl, nome);
  document.title = `${nome} | Frases de Messias`;


  refs.botaoEditar.hidden = !dono;
  refs.botaoSeguir.hidden = dono;
  refs.botaoBloquear.hidden = dono;
  refs.botaoDenunciar.hidden = dono;
  refs.abaPendentes.hidden = !dono;
  if (!dono && abaAtual === "pendentes") mudarAba("publicadas");
  atualizarBotaoSeguir();
  atualizarBotaoBloquear();
}

function atualizarBotaoSeguir() {
  if (souDonoDoPerfil()) return;
  const aceitaSeguidores = dadosPerfil?.aceitaSeguidores !== false;
  if (!aceitaSeguidores && !seguindo) {
    refs.botaoSeguir.textContent = "Este perfil não aceita seguidores";
    refs.botaoSeguir.classList.remove("botao-seguindo");
    refs.botaoSeguir.disabled = true;
    return;
  }
  if (!usuarioAtual) {
    refs.botaoSeguir.textContent = "Entrar para seguir";
    refs.botaoSeguir.classList.remove("botao-seguindo");
    refs.botaoSeguir.disabled = false;
    return;
  }
  if (perfilBloqueado) {
    refs.botaoSeguir.textContent = "Perfil bloqueado";
    refs.botaoSeguir.classList.remove("botao-seguindo");
    refs.botaoSeguir.disabled = true;
    return;
  }
  refs.botaoSeguir.textContent = seguindo ? "✓ Seguindo" : "Seguir";
  refs.botaoSeguir.classList.toggle("botao-seguindo", seguindo);
  refs.botaoSeguir.disabled = false;
}

function atualizarBotaoBloquear() {
  if (souDonoDoPerfil()) return;
  if (!usuarioAtual) {
    refs.botaoBloquear.textContent = "Entrar para bloquear";
    refs.botaoBloquear.classList.remove("ativo");
    refs.botaoBloquear.disabled = false;
    return;
  }
  refs.botaoBloquear.textContent = perfilBloqueado ? "Desbloquear perfil" : "Bloquear perfil";
  refs.botaoBloquear.classList.toggle("ativo", perfilBloqueado);
  refs.botaoBloquear.disabled = false;
}

async function atualizarEstadoDeBloqueio() {
  if (!usuarioAtual || souDonoDoPerfil()) {
    perfilBloqueado = false;
    atualizarBotaoBloquear();
    atualizarBotaoSeguir();
    return;
  }
  try {
    const bloqueados = await carregarBloqueios(usuarioAtual.uid);
    perfilBloqueado = bloqueados.has(uidPerfil);
  } catch (erro) {
    console.warn("Não foi possível carregar a lista de bloqueios.", erro);
    perfilBloqueado = false;
  }
  atualizarBotaoBloquear();
  atualizarBotaoSeguir();
  escutarFrases();
}

async function garantirPerfilPublico(usuario) {
  const referencia = doc(db, "comunidadePerfis", usuario.uid);
  const existente = await getDoc(referencia);
  if (existente.exists()) return;
  await setDoc(referencia, {
    nome: nomePadrao(usuario),
    bio: "",
    fotoUrl: "",
    visivelEmExplorar: true,
    aceitaSeguidores: true,
    mostrarMetricasSociais: true,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });
}

function carregarContadoresSociais() {
  if (!uidPerfil) return;
  if (cancelarSeguidores) cancelarSeguidores();
  if (cancelarSeguindo) cancelarSeguindo();
  cancelarSeguidores = null;
  cancelarSeguindo = null;

  if (!souDonoDoPerfil() && dadosPerfil?.mostrarMetricasSociais === false) return;

  // O contador de seguidores é sempre uma coleção pública do perfil exibido.
  // Usar um observador separado impede que falhas no cálculo de “seguindo”
  // façam este número aparecer como zero.
  cancelarSeguidores = onSnapshot(
    collection(db, "comunidadePerfis", uidPerfil, "seguidores"),
    (resultado) => { refs.seguidores.textContent = formatarNumero(resultado.size); },
    (erro) => {
      console.warn("Não foi possível atualizar seguidores.", erro);
      refs.seguidores.textContent = "—";
    }
  );

  // Para o próprio membro, a coleção privada “seguindo” oferece a contagem
  // direta. Para visitantes, contamos as relações públicas de seguidores em
  // todos os perfis, sem revelar quem são as pessoas seguidas.
  const consultaSeguindo = souDonoDoPerfil()
    ? collection(db, "comunidadePerfis", uidPerfil, "seguindo")
    : query(collectionGroup(db, "seguidores"), where("usuarioId", "==", uidPerfil));

  cancelarSeguindo = onSnapshot(
    consultaSeguindo,
    (resultado) => { refs.seguindo.textContent = formatarNumero(resultado.size); },
    (erro) => {
      console.warn("Não foi possível atualizar seguindo.", erro);
      refs.seguindo.textContent = "—";
    }
  );
}

async function carregarAtividadePublica() {
  if (!uidPerfil) return;
  refs.publicacoes.textContent = "…";
  refs.comentarios.textContent = "…";
  try {
    const publicacoesAprovadas = query(
      collection(db, "comunidadePublicacoes"),
      where("autorId", "==", uidPerfil),
      where("status", "==", "publicado")
    );
    const comentariosAprovados = query(
      collectionGroup(db, "comentarios"),
      where("autorId", "==", uidPerfil),
      where("status", "==", "publicado")
    );
    const [resultadoPublicacoes, resultadoComentarios] = await Promise.allSettled([
      getCountFromServer(publicacoesAprovadas),
      getCountFromServer(comentariosAprovados)
    ]);
    if (resultadoPublicacoes.status === "fulfilled") {
      refs.publicacoes.textContent = formatarNumero(resultadoPublicacoes.value.data().count);
    } else {
      console.warn("Não foi possível carregar as publicações aprovadas do perfil.", resultadoPublicacoes.reason);
      refs.publicacoes.textContent = "—";
    }
    if (resultadoComentarios.status === "fulfilled") {
      refs.comentarios.textContent = formatarNumero(resultadoComentarios.value.data().count);
    } else {
      console.warn("Não foi possível carregar os comentários aprovados do perfil.", resultadoComentarios.reason);
      refs.comentarios.textContent = "—";
    }
  } catch (erro) {
    console.warn("Não foi possível preparar a atividade pública do perfil.", erro);
    refs.publicacoes.textContent = "—";
    refs.comentarios.textContent = "—";
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

function pedirLogin() {
  const retorno = `${window.location.pathname}${window.location.search}`;
  window.location.href = `comunidade.html?entrar=1&retorno=${encodeURIComponent(retorno)}`;
}

function atualizarBotaoCurtir(botao, ativo) {
  botao.classList.toggle("ativo", ativo);
  botao.innerHTML = ativo ? "❤️ <span>Curtido</span>" : "🤍 <span>Curtir</span>";
}

function atualizarBotaoSalvar(botao, ativo) {
  botao.classList.toggle("ativo", ativo);
  botao.innerHTML = ativo ? "🔖 <span>Salvo</span>" : "🔖 <span>Salvar</span>";
}

async function sincronizarInteracoesDaFrase(publicacaoId, botaoCurtir, botaoSalvar) {
  if (!usuarioAtual) {
    atualizarBotaoCurtir(botaoCurtir, false);
    atualizarBotaoSalvar(botaoSalvar, false);
    return;
  }
  try {
    const [curtida, salvo] = await Promise.all([
      getDoc(doc(db, "comunidadePublicacoes", publicacaoId, "curtidas", usuarioAtual.uid)),
      getDoc(doc(db, "comunidadeUsuarios", usuarioAtual.uid, "salvos", publicacaoId))
    ]);
    atualizarBotaoCurtir(botaoCurtir, curtida.exists());
    atualizarBotaoSalvar(botaoSalvar, salvo.exists());
  } catch (erro) {
    console.warn("Não foi possível sincronizar as interações da frase.", erro);
  }
}

async function curtirFrase(frase, botao) {
  if (!usuarioAtual) { pedirLogin(); return; }
  const publicacaoId = frase?.id || "";
  if (!publicacaoId) return;

  const referencia = doc(db, "comunidadePublicacoes", publicacaoId, "curtidas", usuarioAtual.uid);
  const autorId = String(frase.autorId || "");
  const deveNotificar = Boolean(autorId && autorId !== usuarioAtual.uid);
  const referenciaNotificacao = deveNotificar
    ? doc(db, "comunidadeUsuarios", autorId, "notificacoes", `curtida_${publicacaoId}_${usuarioAtual.uid}`)
    : null;

  try {
    const existente = await getDoc(referencia);
    const lote = writeBatch(db);
    if (existente.exists()) {
      lote.delete(referencia);
      if (referenciaNotificacao) lote.delete(referenciaNotificacao);
      await lote.commit();
      atualizarBotaoCurtir(botao, false);
    } else {
      lote.set(referencia, { usuarioId: usuarioAtual.uid, criadoEm: serverTimestamp() });
      if (referenciaNotificacao) {
        lote.set(referenciaNotificacao, {
          tipo: "curtida",
          atorId: usuarioAtual.uid,
          atorNome: nomePadrao(usuarioAtual),
          publicacaoId,
          texto: "curtiu sua publicação.",
          lida: false,
          criadoEm: serverTimestamp()
        });
      }
      await lote.commit();
      atualizarBotaoCurtir(botao, true);
    }
  } catch (erro) {
    console.error("Erro ao curtir frase.", erro);
    mostrarMensagem("Não foi possível registrar a curtida agora.", true);
  }
}

async function salvarFrase(publicacaoId, botao) {
  if (!usuarioAtual) { pedirLogin(); return; }
  const referencia = doc(db, "comunidadeUsuarios", usuarioAtual.uid, "salvos", publicacaoId);
  try {
    const existente = await getDoc(referencia);
    if (existente.exists()) {
      await deleteDoc(referencia);
      atualizarBotaoSalvar(botao, false);
    } else {
      await setDoc(referencia, { publicacaoId, criadoEm: serverTimestamp() });
      atualizarBotaoSalvar(botao, true);
    }
  } catch (erro) {
    console.error("Erro ao salvar frase.", erro);
    mostrarMensagem("Não foi possível salvar esta frase agora.", true);
  }
}

async function compartilharTexto(texto, titulo = "Frases de Messias") {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: titulo, text: texto, url });
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${texto}\n${url}`);
      mostrarMensagem("Link copiado para compartilhar.");
      return;
    }
    mostrarMensagem("Use o menu do navegador para compartilhar este conteúdo.");
  } catch (erro) {
    if (erro?.name !== "AbortError") mostrarMensagem("Não foi possível preparar o compartilhamento agora.", true);
  }
}

function atualizarBotaoCurtirComentario(botao, ativo) {
  botao.classList.toggle("ativo", ativo);
  botao.textContent = ativo ? "❤️ Curtido" : "🤍 Curtir";
}

async function sincronizarCurtidaComentario(publicacaoId, comentarioId, botao) {
  if (!usuarioAtual) { atualizarBotaoCurtirComentario(botao, false); return; }
  try {
    const registro = await getDoc(doc(db, "comunidadePublicacoes", publicacaoId, "comentarios", comentarioId, "curtidas", usuarioAtual.uid));
    atualizarBotaoCurtirComentario(botao, registro.exists());
  } catch (erro) {
    console.warn("Não foi possível sincronizar a curtida do comentário.", erro);
  }
}

async function curtirComentario(publicacaoId, comentarioId, botao) {
  if (!usuarioAtual) { pedirLogin(); return; }
  const referencia = doc(db, "comunidadePublicacoes", publicacaoId, "comentarios", comentarioId, "curtidas", usuarioAtual.uid);
  try {
    const existente = await getDoc(referencia);
    if (existente.exists()) {
      await deleteDoc(referencia);
      atualizarBotaoCurtirComentario(botao, false);
    } else {
      await setDoc(referencia, { usuarioId: usuarioAtual.uid, criadoEm: serverTimestamp() });
      atualizarBotaoCurtirComentario(botao, true);
    }
  } catch (erro) {
    console.error("Erro ao curtir comentário.", erro);
    mostrarMensagem("Não foi possível curtir este comentário agora.", true);
  }
}

function criarComentario(publicacaoId, comentarioId, dados, input) {
  const comentario = document.createElement("article");
  comentario.className = "comentario";
  const cabecalho = document.createElement("div");
  cabecalho.className = "cabecalho-comentario";
  const autor = document.createElement("a");
  autor.className = "link-autor-comentario";
  autor.href = `perfil.html?uid=${encodeURIComponent(dados.autorId || "")}`;
  autor.textContent = textoLimpo(dados.autorNome || NOME_PADRAO);
  const texto = document.createElement("p");
  texto.className = "texto-comentario-publicado";
  texto.textContent = textoLimpo(dados.texto);
  const acoes = document.createElement("footer");
  acoes.className = "acoes-comentario";
  const curtir = document.createElement("button");
  curtir.type = "button";
  curtir.className = "acao-comentario botao-curtir-comentario";
  atualizarBotaoCurtirComentario(curtir, false);
  curtir.addEventListener("click", () => curtirComentario(publicacaoId, comentarioId, curtir));
  sincronizarCurtidaComentario(publicacaoId, comentarioId, curtir);
  const responder = document.createElement("button");
  responder.type = "button";
  responder.className = "acao-comentario";
  responder.textContent = "↩ Responder";
  responder.addEventListener("click", () => {
    if (!usuarioAtual) { pedirLogin(); return; }
    const mencao = `@${textoLimpo(dados.autorNome || NOME_PADRAO)} `;
    if (!input.value.startsWith(mencao)) input.value = `${mencao}${input.value}`.slice(0, 240);
    input.focus();
  });
  const compartilhar = document.createElement("button");
  compartilhar.type = "button";
  compartilhar.className = "acao-comentario";
  compartilhar.textContent = "↗ Compartilhar";
  compartilhar.addEventListener("click", () => compartilharTexto(`“${textoLimpo(dados.texto)}”`, "Comentário | Frases de Messias"));
  cabecalho.appendChild(autor);
  acoes.append(curtir, responder, compartilhar);
  comentario.append(cabecalho, texto, acoes);
  return comentario;
}

function alternarComentarios(publicacaoId, area, lista, botao, input) {
  const abrir = area.hidden;
  area.hidden = !abrir;
  botao.classList.toggle("ativo", abrir);
  if (!abrir || comentariosAbertos.has(publicacaoId)) return;
  const consulta = query(
    collection(db, "comunidadePublicacoes", publicacaoId, "comentarios"),
    where("status", "==", "publicado"),
    limit(LIMITE_FRASES)
  );
  const cancelar = onSnapshot(consulta, (resultado) => {
    lista.innerHTML = "";
    if (resultado.empty) {
      const vazio = document.createElement("p");
      vazio.className = "comentario";
      vazio.textContent = "Ainda não há comentários aprovados. Seja o primeiro a deixar uma palavra positiva.";
      lista.appendChild(vazio);
      return;
    }
    const comentarios = resultado.docs.slice().sort((a, b) => (a.data().publicadoEm?.toMillis?.() || 0) - (b.data().publicadoEm?.toMillis?.() || 0));
    comentarios.forEach((item) => lista.appendChild(criarComentario(publicacaoId, item.id, item.data(), input)));
  }, () => {
    lista.innerHTML = '<p class="comentario">Os comentários não puderam ser carregados agora.</p>';
  });
  comentariosAbertos.set(publicacaoId, cancelar);
}

async function enviarComentario(evento, publicacaoId, input, mensagem) {
  evento.preventDefault();
  if (!usuarioAtual) { pedirLogin(); return; }
  const texto = textoLimpo(input.value);
  if (texto.length < 2) {
    mensagem.textContent = "Escreva um comentário com pelo menos 2 caracteres.";
    return;
  }
  try {
    await addDoc(collection(db, "comunidadePublicacoes", publicacaoId, "comentarios"), {
      texto,
      autorId: usuarioAtual.uid,
      autorNome: nomePadrao(usuarioAtual),
      status: "pendente",
      criadoEm: serverTimestamp(),
      publicadoEm: null
    });
    input.value = "";
    mensagem.textContent = "Comentário enviado para aprovação.";
  } catch (erro) {
    console.error("Erro ao enviar comentário.", erro);
    mensagem.textContent = "Não foi possível enviar seu comentário agora.";
  }
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

  // Autores que já publicaram antes desta atualização passam a ter um perfil
  // público utilizável na primeira visita. O nome vem apenas do campo público
  // da publicação; a pessoa poderá completar bio e foto em Meu Perfil.
  if (dadosPerfil?.perfilProvisorio && frases[0]?.autorNome) {
    dadosPerfil = {
      ...dadosPerfil,
      nome: textoLimpo(frases[0].autorNome) || NOME_PADRAO,
      perfilProvisorio: false
    };
    renderizarPerfil();
    atualizarEstadoDeSeguimento();
  }

  refs.listaFrases.innerHTML = "";
  frases.forEach((frase) => {
    const fragmento = refs.template.content.cloneNode(true);
    fragmento.querySelector(".selo-categoria").textContent = textoLimpo(frase.categoria || "Inspiração");
    fragmento.querySelector(".meta-frase-perfil").textContent = abaAtual === "pendentes"
      ? `Enviada em ${dataFormatada(frase.criadoEm)}`
      : `Publicada em ${dataFormatada(frase.publicadoEm)}`;
    fragmento.querySelector(".texto-publicacao").textContent = `“${textoLimpo(frase.texto)}”`;
    const acoes = fragmento.querySelector(".acoes-publicacao");
    const areaComentarios = fragmento.querySelector(".area-comentarios");
    const botaoCurtir = fragmento.querySelector(".botao-curtir-publicacao");
    const botaoSalvar = fragmento.querySelector(".botao-salvar-publicacao");
    const botaoComentarios = fragmento.querySelector(".botao-comentarios");
    const botaoCompartilhar = fragmento.querySelector(".botao-compartilhar-publicacao");
    const listaComentarios = fragmento.querySelector(".lista-comentarios");
    const formularioComentario = fragmento.querySelector(".formulario-comentario");
    const inputComentario = fragmento.querySelector(".texto-comentario");
    const mensagemComentario = fragmento.querySelector(".mensagem-comentario");
    if (abaAtual === "publicadas") {
      botaoCurtir.addEventListener("click", () => curtirFrase(frase, botaoCurtir));
      botaoSalvar.addEventListener("click", () => salvarFrase(frase.id, botaoSalvar));
      botaoComentarios.addEventListener("click", () => alternarComentarios(frase.id, areaComentarios, listaComentarios, botaoComentarios, inputComentario));
      botaoCompartilhar.addEventListener("click", () => compartilharTexto(`“${textoLimpo(frase.texto)}”`, "Frase | Frases de Messias"));
      formularioComentario.addEventListener("submit", (evento) => enviarComentario(evento, frase.id, inputComentario, mensagemComentario));
      sincronizarInteracoesDaFrase(frase.id, botaoCurtir, botaoSalvar);
    } else {
      acoes.hidden = true;
      areaComentarios.hidden = true;
    }
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
  cancelarFrases = null;
  if (!uidPerfil) return;
  if (perfilBloqueado && !souDonoDoPerfil()) {
    renderizarEstadoVazio("Você bloqueou este perfil. Desbloqueie-o para voltar a ver suas frases.");
    return;
  }
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
  if (perfilBloqueado) {
    mostrarMensagem("Desbloqueie este perfil antes de segui-lo.", true);
    return;
  }

  refs.botaoSeguir.disabled = true;
  mostrarMensagem(seguindo ? "Deixando de seguir..." : "Seguindo perfil...");
  const seguidorNoAlvo = doc(db, "comunidadePerfis", uidPerfil, "seguidores", usuarioAtual.uid);
  const alvoNoMeuSeguindo = doc(db, "comunidadePerfis", usuarioAtual.uid, "seguindo", uidPerfil);

  try {
    const novoEstado = await runTransaction(db, async (transacao) => {
      const registroAtual = await transacao.get(seguidorNoAlvo);
      const jaSegue = registroAtual.exists();
      const notificacao = doc(db, "comunidadeUsuarios", uidPerfil, "notificacoes", `seguidor_${usuarioAtual.uid}`);
      if (jaSegue) {
        transacao.delete(seguidorNoAlvo);
        transacao.delete(alvoNoMeuSeguindo);
        transacao.delete(notificacao);
      } else {
        transacao.set(seguidorNoAlvo, { usuarioId: usuarioAtual.uid, criadoEm: serverTimestamp() });
        transacao.set(alvoNoMeuSeguindo, { usuarioId: uidPerfil, criadoEm: serverTimestamp() });
        transacao.set(notificacao, {
          tipo: "seguidor",
          atorId: usuarioAtual.uid,
          atorNome: nomePadrao(usuarioAtual),
          publicacaoId: "",
          texto: "começou a seguir você.",
          lida: false,
          criadoEm: serverTimestamp()
        });
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

async function alternarBloqueioPerfil() {
  if (!usuarioAtual) { pedirLogin(); return; }
  if (souDonoDoPerfil() || !uidPerfil) return;

  const bloquear = !perfilBloqueado;
  const pergunta = bloquear
    ? "Bloquear este perfil? Suas frases deixarão de aparecer para você."
    : "Desbloquear este perfil e voltar a ver suas frases?";
  if (!confirm(pergunta)) return;

  refs.botaoBloquear.disabled = true;
  mostrarMensagem(bloquear ? "Bloqueando perfil..." : "Desbloqueando perfil...");
  try {
    await alternarBloqueio(usuarioAtual.uid, uidPerfil, bloquear);
    perfilBloqueado = bloquear;
    atualizarBotaoBloquear();
    atualizarBotaoSeguir();
    escutarFrases();
    mostrarMensagem(bloquear ? "Perfil bloqueado. Você não verá mais suas frases no feed." : "Perfil desbloqueado com sucesso.");
  } catch (erro) {
    console.error("Erro ao alterar bloqueio.", erro);
    mostrarMensagem(mensagemDeErroSeguranca(erro, "Não foi possível alterar o bloqueio agora."), true);
  } finally {
    refs.botaoBloquear.disabled = false;
  }
}

function preencherMotivosDeDenuncia() {
  refs.motivoDenuncia.innerHTML = '<option value="">Selecione um motivo</option>';
  MOTIVOS_DENUNCIA.forEach((motivo) => {
    const opcao = document.createElement("option");
    opcao.value = motivo;
    opcao.textContent = motivo;
    refs.motivoDenuncia.appendChild(opcao);
  });
}

function fecharDenunciaPerfil() {
  refs.modalDenuncia.close();
  refs.formularioDenuncia.reset();
  refs.mensagemDenuncia.textContent = "";
}

function abrirDenunciaPerfil() {
  if (!usuarioAtual) { pedirLogin(); return; }
  if (souDonoDoPerfil()) return;
  refs.formularioDenuncia.reset();
  refs.mensagemDenuncia.textContent = "";
  refs.modalDenuncia.showModal();
}

async function enviarDenunciaPerfil(evento) {
  evento.preventDefault();
  if (!usuarioAtual) { fecharDenunciaPerfil(); pedirLogin(); return; }
  if (souDonoDoPerfil()) return;

  const motivo = refs.motivoDenuncia.value;
  if (!motivo) {
    refs.mensagemDenuncia.textContent = "Selecione o motivo da denúncia.";
    refs.mensagemDenuncia.classList.add("erro");
    return;
  }

  refs.enviarDenuncia.disabled = true;
  refs.mensagemDenuncia.classList.remove("erro");
  refs.mensagemDenuncia.textContent = "Enviando denúncia...";
  try {
    const nome = textoLimpo(dadosPerfil?.nome || NOME_PADRAO);
    await registrarDenuncia({
      denunciante: usuarioAtual,
      alvoId: uidPerfil,
      alvoTipo: "perfil",
      conteudo: `Perfil de ${nome}`,
      motivo,
      detalhes: refs.detalhesDenuncia.value
    });
    fecharDenunciaPerfil();
    mostrarMensagem("Denúncia enviada de forma privada para a moderação.");
  } catch (erro) {
    console.error("Erro ao denunciar perfil.", erro);
    refs.mensagemDenuncia.textContent = mensagemDeErroSeguranca(erro, "Não foi possível enviar a denúncia agora.");
    refs.mensagemDenuncia.classList.add("erro");
  } finally {
    refs.enviarDenuncia.disabled = false;
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
      // Perfis de publicações anteriores são apresentados de forma segura com
      // as frases já moderadas. Ao entrar, o próprio membro ganha o documento
      // público editável sem precisar perder seu histórico.
      dadosPerfil = {
        nome: NOME_PADRAO,
        bio: "Este membro ainda não adicionou uma biografia.",
        fotoUrl: "",
        perfilProvisorio: true
      };
      refs.estado.hidden = true;
      refs.conteudo.hidden = false;
      renderizarPerfil();
      atualizarEstadoDeSeguimento();
      void atualizarEstadoDeBloqueio();
      if (!cancelarFrases) escutarFrases();
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
refs.botaoBloquear.addEventListener("click", alternarBloqueioPerfil);
refs.botaoDenunciar.addEventListener("click", abrirDenunciaPerfil);
refs.fecharDenuncia.addEventListener("click", fecharDenunciaPerfil);
refs.modalDenuncia.addEventListener("click", (evento) => { if (evento.target === refs.modalDenuncia) fecharDenunciaPerfil(); });
refs.formularioDenuncia.addEventListener("submit", enviarDenunciaPerfil);
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
    await atualizarEstadoDeBloqueio();
    if (souDonoDoPerfil()) escutarFrases();
  }
});

window.addEventListener("beforeunload", () => {
  if (cancelarPerfil) cancelarPerfil();
  if (cancelarFrases) cancelarFrases();
  if (cancelarSeguidores) cancelarSeguidores();
  if (cancelarSeguindo) cancelarSeguindo();
  comentariosAbertos.forEach((cancelar) => cancelar());
});

ajustarTema();
preencherMotivosDeDenuncia();
iniciarPerfil();
