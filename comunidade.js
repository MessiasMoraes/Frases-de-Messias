import { app, db } from "./firebase.js";
import "./convites-canais.js?v=20260820-menu-canais-v1";
import { MOTIVOS_DENUNCIA, carregarBloqueios, mensagemDeErroSeguranca, registrarDenuncia } from "./seguranca-comunidade.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const auth = getAuth(app);
const NOME_PADRAO = "Membro da comunidade";
const LIMITE_PUBLICACOES = 50;
const LIMITE_COMENTARIOS = 50;
const CATEGORIAS_PADRAO = [
  "Amizade", "Amor", "Boa Noite", "Bom Dia", "Esperança", "Família",
  "Fé", "Gratidão", "Motivação", "Reflexão", "Sucesso", "Vida"
];

const elemento = (id) => document.getElementById(id);
const refs = {
  painelVisitante: elemento("painelVisitante"),
  avisoModoVisitante: elemento("avisoModoVisitante"),
  painelMembro: elemento("painelMembro"),
  avatarMembro: elemento("avatarMembro"),
  tituloMembro: elemento("tituloMembro"),
  subtituloMembro: elemento("subtituloMembro"),
  abrirAutenticacao: elemento("abrirAutenticacao"),
  abrirAutenticacaoHero: elemento("abrirAutenticacaoHero"),
  abrirAutenticacaoFeed: elemento("abrirAutenticacaoFeed"),
  modalAutenticacao: elemento("modalAutenticacao"),
  fecharAutenticacao: elemento("fecharAutenticacao"),
  modalDenuncia: elemento("modalDenuncia"),
  fecharDenuncia: elemento("fecharDenuncia"),
  formularioDenuncia: elemento("formularioDenuncia"),
  motivoDenuncia: elemento("motivoDenuncia"),
  detalhesDenuncia: elemento("detalhesDenuncia"),
  enviarDenuncia: elemento("enviarDenuncia"),
  mensagemDenuncia: elemento("mensagemDenuncia"),
  abaEntrar: elemento("abaEntrar"),
  abaCriar: elemento("abaCriar"),
  campoNome: elemento("campoNome"),
  nomeCadastro: elemento("nomeCadastro"),
  email: elemento("emailAutenticacao"),
  senha: elemento("senhaAutenticacao"),
  formularioAutenticacao: elemento("formularioAutenticacao"),
  confirmarAutenticacao: elemento("confirmarAutenticacao"),
  mensagemAutenticacao: elemento("mensagemAutenticacao"),
  tituloAutenticacao: elemento("tituloAutenticacao"),
  textoAutenticacao: elemento("textoAutenticacao"),
  formularioPublicacao: elemento("formularioPublicacao"),
  textoPublicacao: elemento("textoPublicacao"),
  categoriaPublicacao: elemento("categoriaPublicacao"),
  contadorCaracteres: elemento("contadorCaracteres"),
  mensagemPublicacao: elemento("mensagemPublicacao"),
  sair: elemento("sairComunidade"),
  filtroCategoria: elemento("filtroCategoriaFeed"),
  feed: elemento("feedComunidade"),
  template: elemento("templatePublicacao"),
  alternarTema: elemento("alternarTemaComunidade"),
  linkMeuPerfil: elemento("linkMeuPerfil"),
  linkNotificacoes: elemento("linkNotificacoes"),
  contadorNotificacoes: elemento("contadorNotificacoes"),
  abasFeed: Array.from(document.querySelectorAll("[data-modo-feed]"))
};

let usuarioAtual = null;
let modoCadastro = false;
let categorias = [];
let publicacoes = [];
let perfisBloqueados = new Set();
let cancelarFeed = null;
let comentariosAbertos = new Map();
let denunciaAtual = null;
let modoFeedAtual = "para-voce";
let perfisSeguidos = new Set();
let cancelarSeguindo = null;
let cancelarNotificacoes = null;
const fotosDePerfil = new Map();
const consultasFotosPerfil = new Map();

function textoLimpo(valor = "") {
  return String(valor).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function nomeExibicao(usuario) {
  return textoLimpo(usuario?.displayName || usuario?.email?.split("@")[0] || NOME_PADRAO).slice(0, 48) || NOME_PADRAO;
}

function iniciais(nome) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase() || "FM";
}

function fotoPerfilSegura(valor) {
  const endereco = String(valor || "").trim();
  if (!endereco || endereco.length > 700) return "";
  try {
    const url = new URL(endereco);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function aplicarAvatarDaPublicacao(avatar, nome, fotoUrl = "") {
  const iniciaisDoAutor = iniciais(nome);
  const fotoSegura = fotoPerfilSegura(fotoUrl);
  avatar.classList.toggle("tem-foto", Boolean(fotoSegura));
  avatar.replaceChildren();

  if (!fotoSegura) {
    avatar.textContent = iniciaisDoAutor;
    return;
  }

  const imagem = document.createElement("img");
  imagem.src = fotoSegura;
  imagem.alt = "";
  imagem.loading = "lazy";
  imagem.decoding = "async";
  imagem.addEventListener("error", () => {
    avatar.classList.remove("tem-foto");
    avatar.replaceChildren();
    avatar.textContent = iniciaisDoAutor;
  }, { once: true });
  avatar.appendChild(imagem);
}

async function carregarFotoDoPerfil(autorId) {
  const id = String(autorId || "").trim();
  if (!id) return "";
  if (fotosDePerfil.has(id)) return fotosDePerfil.get(id);
  if (consultasFotosPerfil.has(id)) return consultasFotosPerfil.get(id);

  const consulta = getDoc(doc(db, "comunidadePerfis", id))
    .then((perfil) => fotoPerfilSegura(perfil.exists() ? perfil.data().fotoUrl : ""))
    .catch((erro) => {
      console.warn("Não foi possível carregar a foto de um perfil.", erro);
      return "";
    })
    .then((fotoUrl) => {
      fotosDePerfil.set(id, fotoUrl);
      consultasFotosPerfil.delete(id);
      return fotoUrl;
    });

  consultasFotosPerfil.set(id, consulta);
  return consulta;
}

function mostrarMensagem(alvo, mensagem = "", erro = false) {
  alvo.textContent = mensagem;
  alvo.classList.toggle("erro", Boolean(erro));
}

function ajustarTema() {
  const escuro = localStorage.getItem("tema") === "escuro";
  document.body.classList.toggle("tema-escuro", escuro);
  refs.alternarTema.textContent = escuro ? "☀️" : "🌙";
  refs.alternarTema.setAttribute("aria-label", escuro ? "Ativar tema claro" : "Ativar tema escuro");
}

function configurarModoCadastro(ativo) {
  modoCadastro = ativo;
  refs.abaEntrar.classList.toggle("ativa", !ativo);
  refs.abaEntrar.setAttribute("aria-selected", String(!ativo));
  refs.abaCriar.classList.toggle("ativa", ativo);
  refs.abaCriar.setAttribute("aria-selected", String(ativo));
  refs.campoNome.hidden = !ativo;
  refs.nomeCadastro.required = ativo;
  refs.senha.autocomplete = ativo ? "new-password" : "current-password";
  refs.tituloAutenticacao.textContent = ativo ? "Crie sua conta gratuita" : "Entre na sua conta";
  refs.textoAutenticacao.textContent = ativo
    ? "Junte-se à rede social de frases para interagir com a comunidade e publicar suas inspirações com segurança."
    : "Acesse seu perfil para continuar interagindo na rede social de frases.";
  refs.confirmarAutenticacao.textContent = ativo ? "Criar minha conta" : "Entrar na comunidade";
  mostrarMensagem(refs.mensagemAutenticacao);
}

function abrirModal(preferirCadastro = true) {
  if (usuarioAtual) {
    refs.textoPublicacao.focus();
    return;
  }
  configurarModoCadastro(preferirCadastro);
  if (!refs.modalAutenticacao.open) refs.modalAutenticacao.showModal();
  setTimeout(() => refs.email.focus(), 80);
}

function orientarAcaoDeVisitante(botao, mensagem) {
  if (usuarioAtual || !botao) return;
  botao.classList.add("requer-login");
  botao.title = mensagem;
  botao.setAttribute("aria-label", mensagem);
}

function redirecionarAposAutenticacao() {
  const retorno = new URLSearchParams(window.location.search).get("retorno");
  if (!retorno) return;
  try {
    const destino = new URL(retorno, window.location.href);
    const paginasPermitidas = new Set([
      "/comunidade.html", "/explorar.html", "/notificacoes.html", "/perfil.html", "/meu-perfil.html"
    ]);
    if (destino.origin === window.location.origin && paginasPermitidas.has(destino.pathname)) {
      window.location.assign(destino.href);
    }
  } catch (erro) {
    console.warn("Endereço de retorno inválido após a autenticação.", erro);
  }
}

function fecharModal() {
  if (refs.modalAutenticacao.open) refs.modalAutenticacao.close();
}

function preencherMotivosDenuncia() {
  refs.motivoDenuncia.innerHTML = '<option value="">Selecione um motivo</option>';
  MOTIVOS_DENUNCIA.forEach((motivo) => {
    const opcao = document.createElement("option");
    opcao.value = motivo;
    opcao.textContent = motivo;
    refs.motivoDenuncia.appendChild(opcao);
  });
}

function fecharDenuncia() {
  denunciaAtual = null;
  if (refs.modalDenuncia.open) refs.modalDenuncia.close();
}

function abrirDenuncia(dados) {
  if (!usuarioAtual) { abrirModal(); return; }
  if (!dados?.autorAlvoId || dados.autorAlvoId === usuarioAtual.uid) {
    alert("Você não pode denunciar seu próprio conteúdo.");
    return;
  }
  denunciaAtual = dados;
  refs.formularioDenuncia.reset();
  mostrarMensagem(refs.mensagemDenuncia);
  if (!refs.modalDenuncia.open) refs.modalDenuncia.showModal();
  setTimeout(() => refs.motivoDenuncia.focus(), 80);
}

async function enviarDenuncia(evento) {
  evento.preventDefault();
  if (!usuarioAtual) { fecharDenuncia(); abrirModal(); return; }
  if (!denunciaAtual) { fecharDenuncia(); return; }
  const motivo = textoLimpo(refs.motivoDenuncia.value);
  const detalhes = textoLimpo(refs.detalhesDenuncia.value);
  if (!MOTIVOS_DENUNCIA.includes(motivo)) {
    mostrarMensagem(refs.mensagemDenuncia, "Selecione o motivo da denúncia.", true);
    return;
  }
  refs.enviarDenuncia.disabled = true;
  mostrarMensagem(refs.mensagemDenuncia, "Enviando para análise...");
  try {
    await registrarDenuncia({
      denuncianteId: usuarioAtual.uid,
      ...denunciaAtual,
      motivo,
      detalhes
    });
    mostrarMensagem(refs.mensagemDenuncia, "Denúncia enviada. Obrigado por ajudar a cuidar da comunidade.");
    setTimeout(fecharDenuncia, 900);
  } catch (erro) {
    console.error("Erro ao enviar denúncia.", erro);
    mostrarMensagem(refs.mensagemDenuncia, mensagemDeErroSeguranca(erro, "Não foi possível enviar a denúncia agora. Tente novamente."), true);
  } finally {
    refs.enviarDenuncia.disabled = false;
  }
}

function preencherSeletoresDeCategoria() {
  [refs.categoriaPublicacao, refs.filtroCategoria].forEach((seletor, indice) => {
    const valorAnterior = seletor.value;
    seletor.innerHTML = indice === 0
      ? '<option value="">Selecione uma categoria</option>'
      : '<option value="">Todas as categorias</option>';
    categorias.forEach((categoria) => {
      const opcao = document.createElement("option");
      opcao.value = categoria;
      opcao.textContent = categoria;
      seletor.appendChild(opcao);
    });
    seletor.value = categorias.includes(valorAnterior) ? valorAnterior : "";
  });
}

async function carregarCategorias() {
  // As categorias do portal aparecem imediatamente, inclusive quando a rede ou o
  // Firestore demorarem a responder. Isso evita bloquear a criação de uma frase.
  categorias = [...CATEGORIAS_PADRAO].sort((a, b) => a.localeCompare(b, "pt-BR"));
  preencherSeletoresDeCategoria();

  try {
    const resposta = await getDocs(collection(db, "categorias"));
    const categoriasRemotas = resposta.docs
      .map((item) => textoLimpo(item.data().nome || item.data().categoria || ""))
      .filter(Boolean);

    if (categoriasRemotas.length) {
      categorias = [...new Set([...CATEGORIAS_PADRAO, ...categoriasRemotas])]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      preencherSeletoresDeCategoria();
    }
  } catch (erro) {
    console.warn("Não foi possível atualizar categorias da comunidade.", erro);
  }
}

function dataFormatada(valor) {
  const data = valor instanceof Timestamp ? valor.toDate() : valor?.toDate?.() || null;
  if (!data) return "Agora mesmo";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(data);
}

function atualizarAbasDoFeed() {
  refs.abasFeed.forEach((aba) => {
    const ativa = aba.dataset.modoFeed === modoFeedAtual;
    aba.classList.toggle("ativa", ativa);
    aba.setAttribute("aria-selected", String(ativa));
  });
}

function mudarModoDeFeed(modo) {
  if (!refs.abasFeed.some((aba) => aba.dataset.modoFeed === modo)) return;
  if (modo === "seguindo" && !usuarioAtual) {
    abrirModal();
    return;
  }
  modoFeedAtual = modo;
  atualizarAbasDoFeed();
  renderizarFeed();
}

function carregarPerfisSeguidos(usuario) {
  if (cancelarSeguindo) cancelarSeguindo();
  cancelarSeguindo = null;
  perfisSeguidos = new Set();
  if (!usuario) return;

  cancelarSeguindo = onSnapshot(
    collection(db, "comunidadePerfis", usuario.uid, "seguindo"),
    (resultado) => {
      perfisSeguidos = new Set(resultado.docs.map((item) => item.id));
      renderizarFeed();
    },
    (erro) => {
      console.warn("Não foi possível atualizar os perfis seguidos.", erro);
      perfisSeguidos = new Set();
      renderizarFeed();
    }
  );
}

function renderizarFeed() {
  const categoria = refs.filtroCategoria.value;
  const publicacoesVisiveis = publicacoes.filter((post) => !perfisBloqueados.has(post.autorId));
  let filtradas = categoria ? publicacoesVisiveis.filter((post) => post.categoria === categoria) : publicacoesVisiveis;

  if (modoFeedAtual === "seguindo") {
    filtradas = filtradas.filter((post) => perfisSeguidos.has(post.autorId));
  }

  refs.feed.innerHTML = "";
  if (!filtradas.length) {
    const estado = document.createElement("div");
    estado.className = "estado-feed";
    if (modoFeedAtual === "seguindo" && usuarioAtual && !perfisSeguidos.size) {
      estado.innerHTML = 'Você ainda não segue nenhum perfil. <a href="explorar.html">Explore pessoas inspiradoras</a> para montar o seu feed.';
    } else if (modoFeedAtual === "seguindo") {
      estado.textContent = "Ainda não há publicações aprovadas dos perfis que você segue nesta categoria.";
    } else {
      estado.textContent = categoria
        ? `Ainda não há publicações aprovadas em ${categoria}.`
        : "A comunidade está começando. Seja a primeira pessoa a enviar uma frase inspiradora!";
    }
    refs.feed.appendChild(estado);
    return;
  }

  filtradas.forEach((post) => refs.feed.appendChild(criarCartaoPublicacao(post)));
}

function criarCartaoPublicacao(post) {
  const fragmento = refs.template.content.cloneNode(true);
  const cartao = fragmento.querySelector(".cartao-publicacao");
  const nome = textoLimpo(post.autorNome || NOME_PADRAO);
  const avatar = fragmento.querySelector(".avatar-publicacao");
  const linkPerfil = `perfil.html?uid=${encodeURIComponent(post.autorId || "")}`;
  aplicarAvatarDaPublicacao(avatar, nome, post.autorFotoUrl);
  carregarFotoDoPerfil(post.autorId).then((fotoUrl) => {
    if (avatar.isConnected && fotoUrl) aplicarAvatarDaPublicacao(avatar, nome, fotoUrl);
  });
  fragmento.querySelector(".link-avatar-publicacao").href = linkPerfil;
  const nomeAutor = fragmento.querySelector(".nome-publicacao");
  nomeAutor.href = linkPerfil;
  nomeAutor.textContent = nome;
  fragmento.querySelector(".meta-publicacao").textContent = `Publicado em ${dataFormatada(post.publicadoEm)}`;
  fragmento.querySelector(".selo-categoria").textContent = post.categoria || "Inspiração";
  fragmento.querySelector(".texto-publicacao").textContent = `“${textoLimpo(post.texto)}”`;

  const botaoCurtir = fragmento.querySelector(".botao-curtir-publicacao");
  const botaoSalvar = fragmento.querySelector(".botao-salvar-publicacao");
  const botaoComentarios = fragmento.querySelector(".botao-comentarios");
  const botaoCompartilhar = fragmento.querySelector(".botao-compartilhar-publicacao");
  const botaoDenunciar = fragmento.querySelector(".acao-denunciar-publicacao");
  const areaComentarios = fragmento.querySelector(".area-comentarios");
  const listaComentarios = fragmento.querySelector(".lista-comentarios");
  const formularioComentario = fragmento.querySelector(".formulario-comentario");
  const inputComentario = fragmento.querySelector(".texto-comentario");
  const mensagemComentario = fragmento.querySelector(".mensagem-comentario");

  botaoCurtir.addEventListener("click", () => curtirPublicacao(post, botaoCurtir));
  botaoSalvar.addEventListener("click", () => salvarPublicacao(post.id, botaoSalvar));
  botaoComentarios.addEventListener("click", () => alternarComentarios(post.id, areaComentarios, listaComentarios, botaoComentarios, inputComentario));
  if (!usuarioAtual) {
    orientarAcaoDeVisitante(botaoCurtir, "Crie uma conta gratuita para curtir esta publicação");
    orientarAcaoDeVisitante(botaoSalvar, "Crie uma conta gratuita para salvar esta publicação");
    orientarAcaoDeVisitante(botaoComentarios, "Entre para comentar; a leitura dos comentários continua livre");
    orientarAcaoDeVisitante(botaoDenunciar, "Entre para denunciar este conteúdo à moderação");
    inputComentario.placeholder = "Entre para comentar com respeito...";
    inputComentario.readOnly = true;
    inputComentario.addEventListener("focus", () => abrirModal());
  }
  sincronizarEstadoDeInteracoes(post.id, botaoCurtir, botaoSalvar);
  botaoCompartilhar.addEventListener("click", () => compartilharPublicacao(post));
  botaoDenunciar.addEventListener("click", () => abrirDenuncia({
    alvoTipo: "publicacao",
    publicacaoId: post.id,
    autorAlvoId: post.autorId || "",
    autorAlvoNome: nome,
    conteudo: post.texto || ""
  }));
  formularioComentario.addEventListener("submit", (evento) => enviarComentario(evento, post.id, inputComentario, mensagemComentario));
  cartao.dataset.publicacaoId = post.id;
  return fragmento;
}

function escutarFeed() {
  if (cancelarFeed) cancelarFeed();
  // A condição de status é indispensável às regras: ela impede que rascunhos pendentes sejam lidos publicamente.
  // A ordenação ocorre no cliente para manter o feed disponível inclusive durante a criação de índices compostos.
  const consulta = query(collection(db, "comunidadePublicacoes"), where("status", "==", "publicado"), limit(LIMITE_PUBLICACOES));
  cancelarFeed = onSnapshot(consulta, (resultado) => {
    publicacoes = resultado.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((primeiro, segundo) => {
        const dataPrimeiro = primeiro.publicadoEm?.toMillis?.() || 0;
        const dataSegundo = segundo.publicadoEm?.toMillis?.() || 0;
        return dataSegundo - dataPrimeiro;
      });
    renderizarFeed();
  }, (erro) => {
    console.error("Erro ao carregar o feed.", erro);
    refs.feed.innerHTML = '<div class="estado-feed">Não foi possível carregar a comunidade agora. Tente atualizar a página.</div>';
  });
}

function atualizarBotaoCurtir(botao, ativo) {
  botao.classList.toggle("ativo", ativo);
  botao.setAttribute("aria-pressed", String(ativo));
  botao.setAttribute("aria-label", ativo ? "Remover curtida" : "Curtir publicação");
  botao.innerHTML = ativo
    ? '<span class="icone-acao" aria-hidden="true">♥</span><span>Curtido</span>'
    : '<span class="icone-acao" aria-hidden="true">♡</span><span>Curtir</span>';
}

function atualizarBotaoSalvar(botao, ativo) {
  botao.classList.toggle("ativo", ativo);
  botao.setAttribute("aria-pressed", String(ativo));
  botao.setAttribute("aria-label", ativo ? "Remover dos salvos" : "Salvar publicação");
  botao.innerHTML = ativo
    ? '<span class="icone-acao" aria-hidden="true">🔖</span><span>Salvo</span>'
    : '<span class="icone-acao" aria-hidden="true">🔖</span><span>Salvar</span>';
}

async function sincronizarEstadoDeInteracoes(publicacaoId, botaoCurtir, botaoSalvar) {
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
    console.warn("Não foi possível sincronizar as interações da publicação.", erro);
  }
}

async function curtirPublicacao(post, botao) {
  if (!usuarioAtual) { abrirModal(); return; }
  const publicacaoId = post?.id || "";
  if (!publicacaoId) return;

  const referencia = doc(db, "comunidadePublicacoes", publicacaoId, "curtidas", usuarioAtual.uid);
  const autorId = String(post.autorId || "");
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
          atorNome: nomeExibicao(usuarioAtual),
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
    console.error("Erro ao curtir publicação.", erro);
    alert("Não foi possível registrar sua curtida agora. Tente novamente.");
  }
}

async function salvarPublicacao(publicacaoId, botao) {
  if (!usuarioAtual) { abrirModal(); return; }
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
    console.error("Erro ao salvar publicação.", erro);
    alert("Não foi possível salvar esta publicação agora. Tente novamente.");
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
  if (!usuarioAtual) { abrirModal(); return; }
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
    alert("Não foi possível curtir este comentário agora. Tente novamente.");
  }
}

async function compartilharComentario(dados) {
  const texto = `“${textoLimpo(dados.texto)}” — ${textoLimpo(dados.autorNome || NOME_PADRAO)}\n\nCompartilhado pela Comunidade Frases de Messias`;
  const compartilhamento = { title: "Comentário | Frases de Messias", text: texto, url: window.location.href };
  try {
    if (navigator.share) await navigator.share(compartilhamento);
    else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${texto}\n${compartilhamento.url}`);
      alert("Comentário copiado para compartilhar!");
    } else {
      alert("Compartilhamento não disponível neste dispositivo.");
    }
  } catch (erro) {
    if (erro?.name !== "AbortError") console.warn("Compartilhamento do comentário indisponível.", erro);
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
    if (!usuarioAtual) { abrirModal(); return; }
    const mencao = `@${textoLimpo(dados.autorNome || NOME_PADRAO)} `;
    if (!input.value.startsWith(mencao)) input.value = `${mencao}${input.value}`.slice(0, 240);
    input.focus();
  });
  const compartilhar = document.createElement("button");
  compartilhar.type = "button";
  compartilhar.className = "acao-comentario";
  compartilhar.textContent = "↗ Compartilhar";
  compartilhar.addEventListener("click", () => compartilharComentario(dados));
  const denunciar = document.createElement("button");
  denunciar.type = "button";
  denunciar.className = "acao-comentario acao-denunciar-comentario";
  denunciar.textContent = "🚩 Denunciar";
  denunciar.addEventListener("click", () => abrirDenuncia({
    alvoTipo: "comentario",
    publicacaoId,
    comentarioId,
    autorAlvoId: dados.autorId || "",
    autorAlvoNome: dados.autorNome || NOME_PADRAO,
    conteudo: dados.texto || ""
  }));
  cabecalho.appendChild(autor);
  acoes.append(curtir, responder, compartilhar, denunciar);
  comentario.append(cabecalho, texto, acoes);
  return comentario;
}

function alternarComentarios(publicacaoId, area, lista, botao, input) {
  const abrir = area.hidden;
  area.hidden = !abrir;
  botao.classList.toggle("ativo", abrir);
  botao.setAttribute("aria-expanded", String(abrir));
  botao.setAttribute("aria-label", abrir ? "Fechar comentários" : "Abrir comentários");
  if (!abrir) return;
  if (comentariosAbertos.has(publicacaoId)) return;

  const consulta = query(
    collection(db, "comunidadePublicacoes", publicacaoId, "comentarios"),
    where("status", "==", "publicado"),
    limit(LIMITE_COMENTARIOS)
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
    const comentariosOrdenados = resultado.docs.slice().sort((primeiro, segundo) => {
      const dataPrimeiro = primeiro.data().publicadoEm?.toMillis?.() || 0;
      const dataSegundo = segundo.data().publicadoEm?.toMillis?.() || 0;
      return dataPrimeiro - dataSegundo;
    });
    comentariosOrdenados.forEach((item) => {
      lista.appendChild(criarComentario(publicacaoId, item.id, item.data(), input));
    });
  }, () => {
    lista.innerHTML = '<p class="comentario">Os comentários não puderam ser carregados agora.</p>';
  });
  comentariosAbertos.set(publicacaoId, cancelar);
}

async function enviarComentario(evento, publicacaoId, input, mensagem) {
  evento.preventDefault();
  if (!usuarioAtual) { abrirModal(); return; }
  const texto = textoLimpo(input.value);
  if (texto.length < 2) {
    mensagem.textContent = "Escreva um comentário com pelo menos 2 caracteres.";
    return;
  }
  try {
    await addDoc(collection(db, "comunidadePublicacoes", publicacaoId, "comentarios"), {
      texto,
      autorId: usuarioAtual.uid,
      autorNome: nomeExibicao(usuarioAtual),
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

async function compartilharPublicacao(post) {
  const texto = `“${textoLimpo(post.texto)}” — ${textoLimpo(post.autorNome || NOME_PADRAO)}\n\nCompartilhado pela Comunidade Frases de Messias`;
  const dados = { title: "Frases de Messias", text: texto, url: `${window.location.origin}${window.location.pathname}#${post.id}` };
  try {
    if (navigator.share) await navigator.share(dados);
    else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${texto}\n${dados.url}`);
      alert("Link da publicação copiado!");
    } else {
      alert("Compartilhamento não disponível neste dispositivo.");
    }
  } catch (erro) {
    if (erro?.name !== "AbortError") console.warn("Compartilhamento cancelado ou indisponível.", erro);
  }
}

async function enviarPublicacao(evento) {
  evento.preventDefault();
  if (!usuarioAtual) { abrirModal(); return; }
  const texto = textoLimpo(refs.textoPublicacao.value);
  const categoria = textoLimpo(refs.categoriaPublicacao.value);
  if (texto.length < 8 || !categoria) {
    mostrarMensagem(refs.mensagemPublicacao, "Escreva uma frase com pelo menos 8 caracteres e selecione uma categoria.", true);
    return;
  }
  refs.formularioPublicacao.querySelector("button[type='submit']").disabled = true;
  mostrarMensagem(refs.mensagemPublicacao, "Enviando sua frase para aprovação...");
  try {
    await addDoc(collection(db, "comunidadePublicacoes"), {
      texto,
      categoria,
      autorId: usuarioAtual.uid,
      autorNome: nomeExibicao(usuarioAtual),
      status: "pendente",
      criadoEm: serverTimestamp(),
      publicadoEm: null
    });
    refs.formularioPublicacao.reset();
    refs.contadorCaracteres.textContent = "0 / 360";
    mostrarMensagem(refs.mensagemPublicacao, "Frase enviada com sucesso. Ela ficará pública após a aprovação.");
  } catch (erro) {
    console.error("Erro ao enviar publicação.", erro);
    mostrarMensagem(refs.mensagemPublicacao, "Não foi possível enviar a frase. Verifique sua conexão e tente novamente.", true);
  } finally {
    refs.formularioPublicacao.querySelector("button[type='submit']").disabled = false;
  }
}

async function salvarPerfil(usuario) {
  const referencia = doc(db, "comunidadeUsuarios", usuario.uid);
  const existente = await getDoc(referencia);
  const perfil = {
    nome: nomeExibicao(usuario),
    email: usuario.email || "",
    atualizadoEm: serverTimestamp()
  };
  if (!existente.exists()) perfil.criadoEm = serverTimestamp();
  await setDoc(referencia, perfil, { merge: true });

  // O perfil público não contém e-mail: informações de acesso continuam na
  // coleção privada comunidadeUsuarios e nunca são expostas à Comunidade.
  // Só criamos a versão pública quando ela ainda não existe, para preservar
  // mudanças de nome feitas pelo próprio membro no editor de perfil.
  const perfilPublico = doc(db, "comunidadePerfis", usuario.uid);
  const perfilPublicoExistente = await getDoc(perfilPublico);
  if (!perfilPublicoExistente.exists()) {
    await setDoc(perfilPublico, {
      nome: nomeExibicao(usuario),
      bio: "",
      fotoUrl: "",
      visivelEmExplorar: true,
      aceitaSeguidores: true,
      mostrarMetricasSociais: true,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });
  }
}

function atualizarContadorNotificacoes(quantidade = 0) {
  if (!refs.contadorNotificacoes) return;
  const total = Math.max(0, Number(quantidade) || 0);
  refs.contadorNotificacoes.hidden = total === 0;
  refs.contadorNotificacoes.textContent = total > 9 ? "9+" : String(total);
  refs.linkNotificacoes?.setAttribute("aria-label", total
    ? `Notificações, ${total} não ${total === 1 ? "lida" : "lidas"}`
    : "Notificações");
}

function escutarContadorNotificacoes(uid = "") {
  if (cancelarNotificacoes) cancelarNotificacoes();
  cancelarNotificacoes = null;
  atualizarContadorNotificacoes(0);
  if (!uid) return;

  const avisos = query(
    collection(db, "comunidadeUsuarios", uid, "notificacoes"),
    where("lida", "==", false)
  );
  cancelarNotificacoes = onSnapshot(avisos, (resultado) => {
    atualizarContadorNotificacoes(resultado.size);
  }, (erro) => {
    console.warn("Não foi possível atualizar o contador de notificações.", erro);
    atualizarContadorNotificacoes(0);
  });
}

function atualizarInterfaceDoUsuario(usuario) {
  usuarioAtual = usuario || null;
  const autenticado = Boolean(usuarioAtual);
  refs.painelVisitante.hidden = autenticado;
  refs.avisoModoVisitante.hidden = autenticado;
  refs.painelMembro.hidden = !autenticado;
  if (!autenticado) {
    refs.linkMeuPerfil.href = "meu-perfil.html";
    refs.linkNotificacoes.href = "notificacoes.html";
    escutarContadorNotificacoes();
    return;
  }
  refs.linkMeuPerfil.href = `perfil.html?uid=${encodeURIComponent(usuarioAtual.uid)}`;
  refs.linkNotificacoes.href = "notificacoes.html";
  escutarContadorNotificacoes(usuarioAtual.uid);
  const nome = nomeExibicao(usuarioAtual);
  refs.avatarMembro.textContent = iniciais(nome);
  refs.tituloMembro.textContent = `Olá, ${nome.split(" ")[0]}!`;
  refs.subtituloMembro.textContent = "Compartilhe uma frase que faça bem a alguém hoje.";
}

function mensagemDeErroAuth(erro) {
  const codigo = String(erro?.code || "");
  if (codigo.includes("email-already-in-use")) return "Este e-mail já possui uma conta. Tente entrar.";
  if (codigo.includes("invalid-credential") || codigo.includes("wrong-password") || codigo.includes("user-not-found")) return "E-mail ou senha incorretos.";
  if (codigo.includes("weak-password")) return "Use uma senha com pelo menos 6 caracteres.";
  if (codigo.includes("invalid-email")) return "Informe um e-mail válido.";
  if (codigo.includes("operation-not-allowed")) return "O cadastro por e-mail ainda precisa ser ativado na configuração do projeto.";
  return "Não foi possível concluir o acesso agora. Tente novamente.";
}

refs.abrirAutenticacao.addEventListener("click", () => abrirModal(true));
refs.abrirAutenticacaoHero.addEventListener("click", () => abrirModal(true));
refs.abrirAutenticacaoFeed.addEventListener("click", () => abrirModal(true));
refs.fecharAutenticacao.addEventListener("click", fecharModal);
refs.modalAutenticacao.addEventListener("click", (evento) => { if (evento.target === refs.modalAutenticacao) fecharModal(); });
refs.fecharDenuncia.addEventListener("click", fecharDenuncia);
refs.modalDenuncia.addEventListener("click", (evento) => { if (evento.target === refs.modalDenuncia) fecharDenuncia(); });
refs.formularioDenuncia.addEventListener("submit", enviarDenuncia);
refs.abaEntrar.addEventListener("click", () => configurarModoCadastro(false));
refs.abaCriar.addEventListener("click", () => configurarModoCadastro(true));
refs.sair.addEventListener("click", () => signOut(auth));
refs.alternarTema.addEventListener("click", () => {
  const proximo = !document.body.classList.contains("tema-escuro");
  localStorage.setItem("tema", proximo ? "escuro" : "claro");
  ajustarTema();
});
refs.textoPublicacao.addEventListener("input", () => {
  refs.contadorCaracteres.textContent = `${refs.textoPublicacao.value.length} / 360`;
});
// O envio deve passar pelo manipulador que grava a frase como pendente no Firestore.
refs.formularioPublicacao.addEventListener("submit", enviarPublicacao);
refs.filtroCategoria.addEventListener("change", renderizarFeed);
refs.abasFeed.forEach((aba) => aba.addEventListener("click", () => mudarModoDeFeed(aba.dataset.modoFeed)));

refs.formularioAutenticacao.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const email = refs.email.value.trim();
  const senha = refs.senha.value;
  const nome = textoLimpo(refs.nomeCadastro.value);
  if (!email || !senha || (modoCadastro && nome.length < 2)) {
    mostrarMensagem(refs.mensagemAutenticacao, modoCadastro ? "Informe nome, e-mail e uma senha de pelo menos 6 caracteres." : "Informe e-mail e senha.", true);
    return;
  }
  refs.confirmarAutenticacao.disabled = true;
  mostrarMensagem(refs.mensagemAutenticacao, modoCadastro ? "Criando sua conta..." : "Entrando...");
  try {
    if (modoCadastro) {
      const credencial = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(credencial.user, { displayName: nome });
      await salvarPerfil(credencial.user);
    } else {
      await signInWithEmailAndPassword(auth, email, senha);
    }
    fecharModal();
    refs.formularioAutenticacao.reset();
    redirecionarAposAutenticacao();
  } catch (erro) {
    console.error("Erro de autenticação.", erro);
    mostrarMensagem(refs.mensagemAutenticacao, mensagemDeErroAuth(erro), true);
  } finally {
    refs.confirmarAutenticacao.disabled = false;
  }
});

onAuthStateChanged(auth, async (usuario) => {
  atualizarInterfaceDoUsuario(usuario);
  carregarPerfisSeguidos(usuario);
  if (!usuario && new URLSearchParams(window.location.search).get("entrar") === "1") abrirModal(false);
  if (usuario) {
    try {
      await salvarPerfil(usuario);
      perfisBloqueados = await carregarBloqueios(usuario.uid);
    } catch (erro) {
      console.warn("Preferências sociais não puderam ser atualizadas.", erro);
      perfisBloqueados = new Set();
    }
  } else {
    perfisBloqueados = new Set();
  }
  renderizarFeed();
});

ajustarTema();
configurarModoCadastro(false);
preencherMotivosDenuncia();
atualizarAbasDoFeed();
carregarCategorias();
escutarFeed();
