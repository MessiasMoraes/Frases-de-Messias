import { app, db } from "./firebase.js";
import "./convites-canais.js?v=20260820-menu-canais-v1";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const auth = getAuth(app);
const refs = {
  lista: document.getElementById("listaNotificacoes"),
  mensagem: document.getElementById("mensagemNotificacoes"),
  marcarTudo: document.getElementById("marcarTudoLido"),
  tema: document.getElementById("alternarTemaNotificacoes"),
  meuPerfil: document.getElementById("linkMeuPerfil"),
  contador: document.getElementById("contadorNotificacoes")
};

let usuarioAtual = null;
let cancelarNotificacoes = null;
let notificacoes = [];

function textoLimpo(valor = "") {
  return String(valor).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function ajustarTema() {
  const escuro = localStorage.getItem("tema") === "escuro";
  document.body.classList.toggle("tema-escuro", escuro);
  refs.tema.textContent = escuro ? "☀️" : "🌙";
  refs.tema.setAttribute("aria-label", escuro ? "Usar tema claro" : "Usar tema escuro");
}

function atualizarContador() {
  const naoLidas = notificacoes.filter((item) => !item.lida).length;
  refs.contador.hidden = naoLidas === 0;
  refs.contador.textContent = naoLidas > 9 ? "9+" : String(naoLidas);
  refs.marcarTudo.hidden = naoLidas === 0;
  refs.marcarTudo.disabled = naoLidas === 0;
}

function dataRelativa(data) {
  const tempo = data?.toDate?.()?.getTime?.() || 0;
  if (!tempo) return "Agora";
  const diferenca = Math.max(0, Date.now() - tempo);
  const minutos = Math.floor(diferenca / 60000);
  if (minutos < 1) return "Agora";
  if (minutos < 60) return `Há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `Há ${dias} d`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(tempo));
}

function detalhesNotificacao(item) {
  const nome = textoLimpo(item.atorNome) || "Uma pessoa da Comunidade";
  if (item.tipo === "seguidor") {
    return {
      icone: "👤",
      titulo: `${nome} começou a seguir você`,
      descricao: "Visite o perfil para conhecer essa pessoa.",
      href: `perfil.html?uid=${encodeURIComponent(item.atorId)}`
    };
  }
  if (item.tipo === "comentario_aprovado") {
    return {
      icone: "💬",
      titulo: "Seu comentário foi aprovado",
      descricao: "Ele já está visível na publicação da Comunidade.",
      href: "comunidade.html#feedComunidade"
    };
  }
  return {
    icone: "❤️",
    titulo: `${nome} curtiu sua publicação`,
    descricao: "Abra a Comunidade para ver a interação.",
    href: "comunidade.html#feedComunidade"
  };
}

function renderizarNotificacoes() {
  refs.lista.innerHTML = "";
  if (!usuarioAtual) {
    refs.lista.innerHTML = '<div class="estado-feed">Entre na Comunidade para acompanhar suas notificações.</div>';
    refs.mensagem.textContent = "";
    refs.marcarTudo.hidden = true;
    return;
  }
  if (!notificacoes.length) {
    refs.lista.innerHTML = '<div class="estado-feed">Ainda não há notificações. Quando alguém seguir você, curtir uma publicação sua ou a moderação aprovar um comentário seu, o aviso aparecerá aqui.</div>';
    refs.mensagem.textContent = "";
    atualizarContador();
    return;
  }

  notificacoes.forEach((item) => {
    const dados = detalhesNotificacao(item);
    const aviso = document.createElement("a");
    aviso.className = `item-notificacao${item.lida ? "" : " nao-lida"}`;
    aviso.href = dados.href;
    aviso.setAttribute("aria-label", `${dados.titulo}. ${dados.descricao}`);

    const icone = document.createElement("span");
    icone.className = "icone-notificacao";
    icone.textContent = dados.icone;

    const conteudo = document.createElement("span");
    conteudo.className = "conteudo-notificacao";
    const titulo = document.createElement("strong");
    titulo.textContent = dados.titulo;
    const descricao = document.createElement("span");
    descricao.textContent = dados.descricao;
    const tempo = document.createElement("time");
    tempo.textContent = dataRelativa(item.criadoEm);
    conteudo.append(titulo, descricao, tempo);

    aviso.append(icone, conteudo);
    aviso.addEventListener("click", () => marcarComoLida(item));
    refs.lista.appendChild(aviso);
  });
  refs.mensagem.textContent = `${notificacoes.length} ${notificacoes.length === 1 ? "notificação" : "notificações"} recebida${notificacoes.length === 1 ? "" : "s"}.`;
  atualizarContador();
}

async function marcarComoLida(item) {
  if (!usuarioAtual || item.lida) return;
  try {
    await updateDoc(doc(db, "comunidadeUsuarios", usuarioAtual.uid, "notificacoes", item.id), { lida: true });
  } catch (erro) {
    console.warn("Não foi possível marcar a notificação como lida.", erro);
  }
}

async function marcarTudoComoLido() {
  if (!usuarioAtual) return;
  const pendentes = notificacoes.filter((item) => !item.lida);
  if (!pendentes.length) return;
  refs.marcarTudo.disabled = true;
  try {
    const lote = writeBatch(db);
    pendentes.forEach((item) => {
      lote.update(doc(db, "comunidadeUsuarios", usuarioAtual.uid, "notificacoes", item.id), { lida: true });
    });
    await lote.commit();
  } catch (erro) {
    console.error("Não foi possível atualizar as notificações.", erro);
    refs.mensagem.textContent = "Não foi possível marcar os avisos como lidos. Tente novamente.";
  } finally {
    refs.marcarTudo.disabled = false;
  }
}

function escutarNotificacoes(uid) {
  if (cancelarNotificacoes) cancelarNotificacoes();
  cancelarNotificacoes = null;
  notificacoes = [];
  renderizarNotificacoes();
  if (!uid) return;

  const avisos = query(
    collection(db, "comunidadeUsuarios", uid, "notificacoes"),
    orderBy("criadoEm", "desc"),
    limit(50)
  );
  cancelarNotificacoes = onSnapshot(avisos, (resultado) => {
    notificacoes = resultado.docs.map((registro) => ({ id: registro.id, ...registro.data() }));
    renderizarNotificacoes();
  }, (erro) => {
    console.error("Não foi possível carregar as notificações.", erro);
    refs.lista.innerHTML = '<div class="estado-feed">As notificações não puderam ser carregadas agora. Tente novamente em instantes.</div>';
    refs.mensagem.textContent = "";
  });
}

refs.tema.addEventListener("click", () => {
  localStorage.setItem("tema", document.body.classList.contains("tema-escuro") ? "claro" : "escuro");
  ajustarTema();
});
refs.marcarTudo.addEventListener("click", marcarTudoComoLido);

onAuthStateChanged(auth, (usuario) => {
  if (!usuario) {
    const retorno = `${window.location.pathname}${window.location.search}`;
    window.location.replace(`comunidade.html?entrar=1&retorno=${encodeURIComponent(retorno)}`);
    return;
  }
  usuarioAtual = usuario;
  refs.meuPerfil.href = `perfil.html?uid=${encodeURIComponent(usuario.uid)}`;
  escutarNotificacoes(usuario.uid);
});

ajustarTema();
