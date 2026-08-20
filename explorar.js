import { app, db } from "./firebase.js";
import "./convites-canais.js?v=20260820-menu-canais-v1";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { collection, getDocs, limit, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const auth = getAuth(app);
const refs = {
  lista: document.getElementById("listaPerfisExplorar"),
  busca: document.getElementById("buscaPerfis"),
  mensagem: document.getElementById("mensagemExplorar"),
  tema: document.getElementById("alternarTemaExplorar"),
  meuPerfil: document.getElementById("linkMeuPerfilExplorar"),
  notificacoes: document.getElementById("linkNotificacoesExplorar"),
  contadorNotificacoes: document.getElementById("contadorNotificacoesExplorar")
};

let perfis = [];
let cancelarNotificacoes = null;

function textoLimpo(valor = "") {
  return String(valor).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function iniciais(nome = "") {
  const partes = textoLimpo(nome).split(" ").filter(Boolean).slice(0, 2);
  return partes.map((parte) => parte[0]).join("").toUpperCase() || "FM";
}

function ajustarTema() {
  const escuro = localStorage.getItem("tema") === "escuro";
  document.body.classList.toggle("tema-escuro", escuro);
  refs.tema.textContent = escuro ? "☀️" : "🌙";
  refs.tema.setAttribute("aria-label", escuro ? "Usar tema claro" : "Usar tema escuro");
}

function atualizarContadorNotificacoes(quantidade = 0) {
  const total = Math.max(0, Number(quantidade) || 0);
  refs.contadorNotificacoes.hidden = total === 0;
  refs.contadorNotificacoes.textContent = total > 9 ? "9+" : String(total);
  refs.notificacoes.setAttribute("aria-label", total
    ? `Notificações, ${total} não ${total === 1 ? "lida" : "lidas"}`
    : "Notificações");
}

function escutarContadorNotificacoes(uid = "") {
  if (cancelarNotificacoes) cancelarNotificacoes();
  cancelarNotificacoes = null;
  atualizarContadorNotificacoes(0);
  if (!uid) return;
  cancelarNotificacoes = onSnapshot(query(
    collection(db, "comunidadeUsuarios", uid, "notificacoes"),
    where("lida", "==", false)
  ), (resultado) => atualizarContadorNotificacoes(resultado.size), () => atualizarContadorNotificacoes(0));
}

function criarCartaoPerfil(perfil) {
  const artigo = document.createElement("article");
  artigo.className = "cartao-perfil-explorar";

  const link = document.createElement("a");
  link.className = "perfil-explorar-link";
  link.href = `perfil.html?uid=${encodeURIComponent(perfil.id)}`;
  link.setAttribute("aria-label", `Ver perfil de ${perfil.nome}`);

  const avatar = document.createElement("span");
  avatar.className = "avatar-explorar";
  avatar.textContent = iniciais(perfil.nome);
  if (perfil.fotoUrl) {
    const imagem = document.createElement("img");
    imagem.src = perfil.fotoUrl;
    imagem.alt = "";
    imagem.loading = "lazy";
    imagem.referrerPolicy = "no-referrer";
    imagem.addEventListener("error", () => imagem.remove());
    avatar.appendChild(imagem);
  }

  const conteudo = document.createElement("div");
  conteudo.className = "conteudo-perfil-explorar";
  const nome = document.createElement("h3");
  nome.textContent = perfil.nome;
  const bio = document.createElement("p");
  bio.textContent = perfil.bio || "Compartilha inspiração na Comunidade Frases de Messias.";
  const acao = document.createElement("span");
  acao.className = "acao-perfil-explorar";
  acao.textContent = "Ver perfil e seguir →";
  conteudo.append(nome, bio, acao);
  link.append(avatar, conteudo);
  artigo.appendChild(link);
  return artigo;
}

function renderizarPerfis() {
  const termo = textoLimpo(refs.busca.value).toLocaleLowerCase("pt-BR");
  const filtrados = perfis.filter((perfil) => {
    const base = `${perfil.nome} ${perfil.bio}`.toLocaleLowerCase("pt-BR");
    return !termo || base.includes(termo);
  });

  refs.lista.innerHTML = "";
  if (!filtrados.length) {
    const estado = document.createElement("div");
    estado.className = "estado-feed";
    estado.textContent = termo
      ? "Nenhum perfil público foi encontrado com essa busca."
      : "Ainda não há perfis públicos para explorar. Convide pessoas para participar da Comunidade.";
    refs.lista.appendChild(estado);
    return;
  }
  filtrados.forEach((perfil) => refs.lista.appendChild(criarCartaoPerfil(perfil)));
  refs.mensagem.textContent = `${filtrados.length} ${filtrados.length === 1 ? "perfil encontrado" : "perfis encontrados"}.`;
}

async function carregarPerfis() {
  refs.mensagem.textContent = "";
  try {
    const resultado = await getDocs(query(collection(db, "comunidadePerfis"), limit(80)));
    perfis = resultado.docs
      .map((item) => ({
        id: item.id,
        nome: textoLimpo(item.data().nome) || "Membro da comunidade",
        bio: textoLimpo(item.data().bio),
        fotoUrl: String(item.data().fotoUrl || "").trim(),
        atualizadoEm: item.data().atualizadoEm?.toMillis?.() || item.data().criadoEm?.toMillis?.() || 0
      }))
      .sort((a, b) => b.atualizadoEm - a.atualizadoEm);
    renderizarPerfis();
  } catch (erro) {
    console.error("Não foi possível carregar os perfis públicos.", erro);
    refs.lista.innerHTML = '<div class="estado-feed">Os perfis não puderam ser carregados agora. Tente novamente em instantes.</div>';
  }
}

refs.busca.addEventListener("input", renderizarPerfis);
refs.tema.addEventListener("click", () => {
  localStorage.setItem("tema", document.body.classList.contains("tema-escuro") ? "claro" : "escuro");
  ajustarTema();
});

onAuthStateChanged(auth, (usuario) => {
  refs.meuPerfil.href = usuario ? `perfil.html?uid=${encodeURIComponent(usuario.uid)}` : "meu-perfil.html";
  refs.notificacoes.href = "notificacoes.html";
  escutarContadorNotificacoes(usuario?.uid || "");
});

ajustarTema();
carregarPerfis();
