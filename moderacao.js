import { app, db } from "./firebase.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection,
  collectionGroup,
  onSnapshot,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const EMAIL_ADMINISTRADOR = "moraesoficialll@gmail.com";
const auth = getAuth(app);
const $ = (id) => document.getElementById(id);
const refs = {
  login: $("loginModeracao"),
  painel: $("painelModeracao"),
  formulario: $("formularioLoginModeracao"),
  email: $("emailModeracao"),
  senha: $("senhaModeracao"),
  mensagem: $("mensagemLoginModeracao"),
  sair: $("sairModeracao"),
  total: $("totalPendencias"),
  lista: $("listaPendencias"),
  template: $("templatePendencia")
};

let cancelarPublicacoes = null;
let cancelarComentarios = null;
let pendenciasPublicacoes = [];
let pendenciasComentarios = [];

function textoLimpo(valor = "") {
  return String(valor).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function iniciais(nome) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((item) => item[0]).join("").toUpperCase() || "FM";
}

function dataFormatada(valor) {
  const data = valor?.toDate?.();
  return data ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(data) : "Enviada agora";
}

function valorData(valor) {
  return valor?.toMillis?.() || 0;
}

function mensagem(texto = "", erro = false) {
  refs.mensagem.textContent = texto;
  refs.mensagem.classList.toggle("erro", erro);
}

function eAdministrador(usuario) {
  return usuario?.email?.toLowerCase() === EMAIL_ADMINISTRADOR;
}

function limparObservadores() {
  if (cancelarPublicacoes) cancelarPublicacoes();
  if (cancelarComentarios) cancelarComentarios();
  cancelarPublicacoes = null;
  cancelarComentarios = null;
  pendenciasPublicacoes = [];
  pendenciasComentarios = [];
}

function renderizarPendencias() {
  const pendencias = [...pendenciasPublicacoes, ...pendenciasComentarios]
    .sort((primeira, segunda) => valorData(primeira.dados.criadoEm) - valorData(segunda.dados.criadoEm));

  refs.total.textContent = String(pendencias.length);
  refs.lista.innerHTML = "";

  if (!pendencias.length) {
    refs.lista.innerHTML = '<div class="estado-feed">Tudo em ordem. Não há conteúdos pendentes agora.</div>';
    return;
  }

  pendencias.forEach((pendencia) => refs.lista.appendChild(criarPendencia(pendencia)));
}

function observarPendencias() {
  limparObservadores();

  const consultaPublicacoes = query(
    collection(db, "comunidadePublicacoes"),
    where("status", "==", "pendente")
  );
  const consultaComentarios = query(
    collectionGroup(db, "comentarios"),
    where("status", "==", "pendente")
  );

  cancelarPublicacoes = onSnapshot(consultaPublicacoes, (resultado) => {
    pendenciasPublicacoes = resultado.docs.map((item) => ({
      tipo: "publicacao",
      referencia: item.ref,
      dados: item.data()
    }));
    renderizarPendencias();
  }, (erro) => {
    console.error("Erro ao carregar publicações pendentes.", erro);
    refs.lista.innerHTML = '<div class="estado-feed">Não foi possível carregar a fila de publicações. Verifique as regras do Firestore e tente novamente.</div>';
  });

  cancelarComentarios = onSnapshot(consultaComentarios, (resultado) => {
    pendenciasComentarios = resultado.docs.map((item) => ({
      tipo: "comentario",
      referencia: item.ref,
      dados: item.data(),
      publicacaoId: item.ref.parent.parent?.id || ""
    }));
    renderizarPendencias();
  }, (erro) => {
    console.error("Erro ao carregar comentários pendentes.", erro);
    refs.lista.innerHTML = '<div class="estado-feed">Não foi possível carregar a fila de comentários. Verifique as regras do Firestore e tente novamente.</div>';
  });
}

function criarPendencia(pendencia) {
  const { dados, tipo, publicacaoId } = pendencia;
  const fragmento = refs.template.content.cloneNode(true);
  const cartao = fragmento.querySelector(".cartao-pendencia");
  const nome = textoLimpo(dados.autorNome || "Membro da comunidade");
  const eComentario = tipo === "comentario";
  const rotulo = eComentario ? "COMENTÁRIO PENDENTE" : "FRASE PENDENTE";

  fragmento.querySelector(".avatar-publicacao").textContent = iniciais(nome);
  fragmento.querySelector(".nome-pendencia").textContent = nome;
  fragmento.querySelector(".meta-pendencia").textContent = dataFormatada(dados.criadoEm);
  fragmento.querySelector(".selo-categoria").textContent = eComentario
    ? `Comentário${publicacaoId ? ` · Publicação ${publicacaoId.slice(0, 6)}` : ""}`
    : textoLimpo(dados.categoria || "Inspiração");
  fragmento.querySelector(".tipo-pendencia").textContent = rotulo;
  fragmento.querySelector(".texto-pendencia").textContent = `“${textoLimpo(dados.texto)}”`;

  const mensagemCartao = fragmento.querySelector(".mensagem-moderacao");
  const botaoAprovar = fragmento.querySelector(".botao-aprovar");
  const botaoRecusar = fragmento.querySelector(".botao-recusar");
  botaoAprovar.textContent = eComentario ? "✓ Aprovar comentário" : "✓ Aprovar publicação";

  botaoAprovar.addEventListener("click", async () => {
    const descricao = eComentario ? "comentário" : "publicação";
    if (!confirm(`Aprovar este ${descricao} e exibi-lo publicamente?`)) return;
    await executarAcao(pendencia, cartao, mensagemCartao, "aprovar");
  });
  botaoRecusar.addEventListener("click", async () => {
    const descricao = eComentario ? "comentário" : "publicação";
    if (!confirm(`Recusar e excluir este ${descricao} pendente? Esta ação não pode ser desfeita.`)) return;
    await executarAcao(pendencia, cartao, mensagemCartao, "recusar");
  });

  return fragmento;
}

async function executarAcao(pendencia, cartao, alvoMensagem, acao) {
  const botoes = cartao.querySelectorAll("button");
  botoes.forEach((botao) => { botao.disabled = true; });
  alvoMensagem.textContent = acao === "aprovar" ? "Publicando..." : "Recusando...";

  try {
    if (acao === "aprovar") {
      await updateDoc(pendencia.referencia, {
        status: "publicado",
        publicadoEm: serverTimestamp(),
        moderadoPor: auth.currentUser.uid
      });
    } else {
      await deleteDoc(pendencia.referencia);
    }
  } catch (erro) {
    console.error("Erro de moderação.", erro);
    alvoMensagem.textContent = "Não foi possível concluir esta ação. Verifique sua conexão e as regras do Firestore.";
    botoes.forEach((botao) => { botao.disabled = false; });
  }
}

refs.formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagem("Entrando...");
  try {
    await signInWithEmailAndPassword(auth, refs.email.value.trim(), refs.senha.value);
  } catch (erro) {
    console.error("Erro no login da moderação.", erro);
    mensagem("Não foi possível entrar com este e-mail e senha.", true);
  }
});

refs.sair.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (usuario) => {
  const autorizado = eAdministrador(usuario);
  refs.login.hidden = Boolean(usuario);
  refs.painel.hidden = !autorizado;
  refs.sair.hidden = !autorizado;

  if (usuario && !autorizado) {
    refs.login.hidden = false;
    refs.painel.hidden = true;
    mensagem("Esta conta não possui permissão de moderação.", true);
    signOut(auth);
    return;
  }

  if (autorizado) observarPendencias();
  else limparObservadores();
});
