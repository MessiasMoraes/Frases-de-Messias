import { app, db } from "./firebase.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, getDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const auth = getAuth(app);
const NOME_PADRAO = "Membro da comunidade";

const refs = {
  estado: document.getElementById("estadoMeuPerfil"),
  conteudo: document.getElementById("conteudoMeuPerfil"),
  formulario: document.getElementById("formularioMeuPerfil"),
  nome: document.getElementById("nomePerfilInput"),
  bio: document.getElementById("bioPerfilInput"),
  fotoUrl: document.getElementById("fotoUrlInput"),
  visivelEmExplorar: document.getElementById("visivelEmExplorarInput"),
  aceitaSeguidores: document.getElementById("aceitaSeguidoresInput"),
  mostrarMetricasSociais: document.getElementById("mostrarMetricasSociaisInput"),
  contadorBio: document.getElementById("contadorBio"),
  avatar: document.getElementById("avatarEdicao"),
  iniciais: document.getElementById("iniciaisEdicao"),
  foto: document.getElementById("fotoEdicao"),
  salvar: document.getElementById("salvarMeuPerfil"),
  verPerfil: document.getElementById("verMeuPerfil"),
  mensagem: document.getElementById("mensagemMeuPerfil"),
  alternarTema: document.getElementById("alternarTemaMeuPerfil")
};

let usuarioAtual = null;

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

function ajustarTema() {
  const escuro = localStorage.getItem("tema") === "escuro";
  document.body.classList.toggle("tema-escuro", escuro);
  refs.alternarTema.textContent = escuro ? "☀️" : "🌙";
  refs.alternarTema.setAttribute("aria-label", escuro ? "Ativar tema claro" : "Ativar tema escuro");
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

function atualizarContadorBio() {
  refs.contadorBio.textContent = String(refs.bio.value.length);
}

function atualizarPrevia() {
  const nome = textoLimpo(refs.nome.value) || NOME_PADRAO;
  const fotoUrl = urlDeImagemSegura(refs.fotoUrl.value);
  refs.iniciais.textContent = iniciais(nome);
  refs.foto.removeAttribute("src");
  refs.foto.alt = fotoUrl ? `Foto de perfil de ${nome}` : "";
  refs.avatar.classList.remove("tem-foto");
  if (fotoUrl) {
    refs.foto.src = fotoUrl;
    refs.avatar.classList.add("tem-foto");
  }
}

async function carregarPerfil(usuario) {
  const referencia = doc(db, "comunidadePerfis", usuario.uid);
  const resultado = await getDoc(referencia);
  const dados = resultado.exists() ? resultado.data() : {};
  refs.nome.value = textoLimpo(dados.nome || nomePadrao(usuario));
  refs.bio.value = textoLimpo(dados.bio || "");
  refs.fotoUrl.value = urlDeImagemSegura(dados.fotoUrl || "");
  refs.visivelEmExplorar.checked = dados.visivelEmExplorar !== false;
  refs.aceitaSeguidores.checked = dados.aceitaSeguidores !== false;
  refs.mostrarMetricasSociais.checked = dados.mostrarMetricasSociais !== false;
  refs.verPerfil.href = `perfil.html?uid=${encodeURIComponent(usuario.uid)}`;
  atualizarContadorBio();
  atualizarPrevia();
}

async function salvarPerfil(evento) {
  evento.preventDefault();
  if (!usuarioAtual) return;
  const nome = textoLimpo(refs.nome.value).slice(0, 48);
  const bio = textoLimpo(refs.bio.value).slice(0, 180);
  const fotoUrlInformada = textoLimpo(refs.fotoUrl.value);
  const fotoUrl = urlDeImagemSegura(fotoUrlInformada);
  const visivelEmExplorar = refs.visivelEmExplorar.checked;
  const aceitaSeguidores = refs.aceitaSeguidores.checked;
  const mostrarMetricasSociais = refs.mostrarMetricasSociais.checked;

  if (nome.length < 2) {
    mostrarMensagem("Informe um nome público com pelo menos 2 caracteres.", true);
    refs.nome.focus();
    return;
  }
  if (fotoUrlInformada && !fotoUrl) {
    mostrarMensagem("Use um link de foto válido iniciado por http:// ou https://.", true);
    refs.fotoUrl.focus();
    return;
  }

  refs.salvar.disabled = true;
  mostrarMensagem("Salvando seu perfil público...");
  try {
    const perfilPublico = doc(db, "comunidadePerfis", usuarioAtual.uid);
    const perfilPrivado = doc(db, "comunidadeUsuarios", usuarioAtual.uid);
    await Promise.all([
      updateProfile(usuarioAtual, { displayName: nome }),
      setDoc(perfilPublico, {
        nome,
        bio,
        fotoUrl,
        visivelEmExplorar,
        aceitaSeguidores,
        mostrarMetricasSociais,
        atualizadoEm: serverTimestamp()
      }, { merge: true }),
      setDoc(perfilPrivado, {
        nome,
        atualizadoEm: serverTimestamp()
      }, { merge: true })
    ]);
    refs.nome.value = nome;
    refs.bio.value = bio;
    refs.fotoUrl.value = fotoUrl;
    atualizarContadorBio();
    atualizarPrevia();
    mostrarMensagem("Perfil e preferências de privacidade atualizados com sucesso.");
  } catch (erro) {
    console.error("Erro ao salvar perfil.", erro);
    mostrarMensagem("Não foi possível salvar suas alterações agora. Tente novamente.", true);
  } finally {
    refs.salvar.disabled = false;
  }
}

refs.formulario.addEventListener("submit", salvarPerfil);
refs.nome.addEventListener("input", atualizarPrevia);
refs.fotoUrl.addEventListener("input", atualizarPrevia);
refs.bio.addEventListener("input", atualizarContadorBio);
refs.foto.addEventListener("error", () => {
  refs.avatar.classList.remove("tem-foto");
  refs.foto.removeAttribute("src");
  mostrarMensagem("A foto não pôde ser carregada. Verifique o link antes de salvar.", true);
});
refs.alternarTema.addEventListener("click", () => {
  localStorage.setItem("tema", document.body.classList.contains("tema-escuro") ? "claro" : "escuro");
  ajustarTema();
});

onAuthStateChanged(auth, async (usuario) => {
  usuarioAtual = usuario || null;
  if (!usuarioAtual) {
    mostrarEstado("Entre na Comunidade para editar seu perfil público.");
    return;
  }
  try {
    await carregarPerfil(usuarioAtual);
    refs.estado.hidden = true;
    refs.conteudo.hidden = false;
  } catch (erro) {
    console.error("Erro ao carregar dados do perfil.", erro);
    mostrarEstado("Não foi possível carregar seu perfil agora. Atualize a página e tente novamente.", true);
  }
});

ajustarTema();
