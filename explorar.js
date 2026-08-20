import { app, db } from "./firebase.js";
import "./convites-canais.js?v=20260820-menu-canais-v1";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { collection, getDocs, limit, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const auth = getAuth(app);
const refs = {
  lista: document.getElementById("listaPerfisExplorar"),
  busca: document.getElementById("buscaPerfis"),
  mensagem: document.getElementById("mensagemExplorar"),
  listaPublicacoes: document.getElementById("listaPublicacoesExplorar"),
  buscaPublicacoes: document.getElementById("buscaPublicacoes"),
  mensagemPublicacoes: document.getElementById("mensagemPublicacoesExplorar"),
  painelSugestoes: document.getElementById("painelSugestoesExplorar"),
  listaSugestoes: document.getElementById("listaSugestoesExplorar"),
  tema: document.getElementById("alternarTemaExplorar"),
  meuPerfil: document.getElementById("linkMeuPerfilExplorar"),
  notificacoes: document.getElementById("linkNotificacoesExplorar"),
  contadorNotificacoes: document.getElementById("contadorNotificacoesExplorar")
};

let perfis = [];
let publicacoes = [];
let usuarioAtual = null;
let perfisSeguidos = new Set();
let cancelarNotificacoes = null;
let cancelarSeguindo = null;

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

function renderizarSugestoes() {
  if (!usuarioAtual) {
    refs.painelSugestoes.hidden = true;
    refs.listaSugestoes.innerHTML = "";
    return;
  }

  refs.painelSugestoes.hidden = false;
  const sugestoes = perfis
    .filter((perfil) => perfil.id !== usuarioAtual.uid && !perfisSeguidos.has(perfil.id))
    .slice(0, 4);
  refs.listaSugestoes.innerHTML = "";
  if (!sugestoes.length) {
    const estado = document.createElement("div");
    estado.className = "estado-feed";
    estado.textContent = "Você já acompanha todos os perfis disponíveis entre as sugestões atuais.";
    refs.listaSugestoes.appendChild(estado);
    return;
  }
  sugestoes.forEach((perfil) => refs.listaSugestoes.appendChild(criarCartaoPerfil(perfil)));
}

function observarPerfisSeguidos(uid = "") {
  if (cancelarSeguindo) cancelarSeguindo();
  cancelarSeguindo = null;
  perfisSeguidos = new Set();
  renderizarSugestoes();
  if (!uid) return;

  cancelarSeguindo = onSnapshot(
    collection(db, "comunidadePerfis", uid, "seguindo"),
    (resultado) => {
      perfisSeguidos = new Set(resultado.docs.map((registro) => registro.id));
      renderizarSugestoes();
    },
    (erro) => {
      console.warn("Não foi possível atualizar as sugestões de perfis.", erro);
      perfisSeguidos = new Set();
      renderizarSugestoes();
    }
  );
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
    renderizarSugestoes();
  } catch (erro) {
    console.error("Não foi possível carregar os perfis públicos.", erro);
    refs.lista.innerHTML = '<div class="estado-feed">Os perfis não puderam ser carregados agora. Tente novamente em instantes.</div>';
  }
}

function dataPublicacao(valor) {
  const data = valor?.toDate?.();
  return data ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(data) : "Agora";
}

function criarCartaoPublicacao(publicacao) {
  const artigo = document.createElement("article");
  artigo.className = "cartao-publicacao-explorar";

  const cabecalho = document.createElement("header");
  cabecalho.className = "cabecalho-publicacao-explorar";
  const autor = document.createElement("a");
  autor.href = `perfil.html?uid=${encodeURIComponent(publicacao.autorId)}`;
  autor.textContent = publicacao.autorNome;
  const meta = document.createElement("span");
  meta.textContent = `${publicacao.categoria} · ${dataPublicacao(publicacao.publicadoEm)}`;
  cabecalho.append(autor, meta);

  const frase = document.createElement("blockquote");
  frase.textContent = `“${publicacao.texto}”`;
  const acesso = document.createElement("a");
  acesso.className = "acao-perfil-explorar";
  acesso.href = `comunidade.html#${encodeURIComponent(publicacao.id)}`;
  acesso.textContent = "Ver publicação no feed →";
  artigo.append(cabecalho, frase, acesso);
  return artigo;
}

function renderizarPublicacoes() {
  const termo = textoLimpo(refs.buscaPublicacoes.value).toLocaleLowerCase("pt-BR");
  const filtradas = publicacoes.filter((publicacao) => {
    const base = `${publicacao.texto} ${publicacao.autorNome} ${publicacao.categoria}`.toLocaleLowerCase("pt-BR");
    return !termo || base.includes(termo);
  });

  refs.listaPublicacoes.innerHTML = "";
  if (!filtradas.length) {
    const estado = document.createElement("div");
    estado.className = "estado-feed";
    estado.textContent = termo
      ? "Nenhuma publicação aprovada foi encontrada com essa busca."
      : "Ainda não há publicações aprovadas para explorar.";
    refs.listaPublicacoes.appendChild(estado);
    refs.mensagemPublicacoes.textContent = "";
    return;
  }
  filtradas.forEach((publicacao) => refs.listaPublicacoes.appendChild(criarCartaoPublicacao(publicacao)));
  refs.mensagemPublicacoes.textContent = `${filtradas.length} ${filtradas.length === 1 ? "publicação encontrada" : "publicações encontradas"}.`;
}

async function carregarPublicacoes() {
  refs.mensagemPublicacoes.textContent = "";
  try {
    const resultado = await getDocs(query(
      collection(db, "comunidadePublicacoes"),
      where("status", "==", "publicado"),
      limit(80)
    ));
    publicacoes = resultado.docs
      .map((item) => ({
        id: item.id,
        texto: textoLimpo(item.data().texto),
        autorId: textoLimpo(item.data().autorId),
        autorNome: textoLimpo(item.data().autorNome) || "Membro da comunidade",
        categoria: textoLimpo(item.data().categoria) || "Comunidade",
        publicadoEm: item.data().publicadoEm,
        ordem: item.data().publicadoEm?.toMillis?.() || 0
      }))
      .sort((a, b) => b.ordem - a.ordem);
    renderizarPublicacoes();
  } catch (erro) {
    console.error("Não foi possível carregar as publicações aprovadas.", erro);
    refs.listaPublicacoes.innerHTML = '<div class="estado-feed">As publicações não puderam ser carregadas agora. Tente novamente em instantes.</div>';
  }
}

refs.busca.addEventListener("input", renderizarPerfis);
refs.buscaPublicacoes.addEventListener("input", renderizarPublicacoes);
refs.tema.addEventListener("click", () => {
  localStorage.setItem("tema", document.body.classList.contains("tema-escuro") ? "claro" : "escuro");
  ajustarTema();
});

onAuthStateChanged(auth, (usuario) => {
  usuarioAtual = usuario || null;
  refs.meuPerfil.href = usuario ? `perfil.html?uid=${encodeURIComponent(usuario.uid)}` : "meu-perfil.html";
  refs.notificacoes.href = "notificacoes.html";
  escutarContadorNotificacoes(usuario?.uid || "");
  observarPerfisSeguidos(usuario?.uid || "");
});

ajustarTema();
carregarPerfis();
carregarPublicacoes();
