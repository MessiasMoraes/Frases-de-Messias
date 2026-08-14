import { app, db } from "./firebase.js";
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
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const auth = getAuth(app);
const NOME_PADRAO = "Membro da comunidade";
const LIMITE_PUBLICACOES = 50;
const LIMITE_COMENTARIOS = 50;

const elemento = (id) => document.getElementById(id);
const refs = {
  painelVisitante: elemento("painelVisitante"),
  painelMembro: elemento("painelMembro"),
  avatarMembro: elemento("avatarMembro"),
  tituloMembro: elemento("tituloMembro"),
  subtituloMembro: elemento("subtituloMembro"),
  abrirAutenticacao: elemento("abrirAutenticacao"),
  abrirAutenticacaoHero: elemento("abrirAutenticacaoHero"),
  modalAutenticacao: elemento("modalAutenticacao"),
  fecharAutenticacao: elemento("fecharAutenticacao"),
  abaEntrar: elemento("abaEntrar"),
  abaCriar: elemento("abaCriar"),
  campoNome: elemento("campoNome"),
  nomeCadastro: elemento("nomeCadastro"),
  email: elemento("emailAutenticacao"),
  senha: elemento("senhaAutenticacao"),
  formularioAutenticacao: elemento("formularioAutenticacao"),
  confirmarAutenticacao: elemento("confirmarAutenticacao"),
  mensagemAutenticacao: elemento("mensagemAutenticacao"),
  formularioPublicacao: elemento("formularioPublicacao"),
  textoPublicacao: elemento("textoPublicacao"),
  categoriaPublicacao: elemento("categoriaPublicacao"),
  contadorCaracteres: elemento("contadorCaracteres"),
  mensagemPublicacao: elemento("mensagemPublicacao"),
  sair: elemento("sairComunidade"),
  filtroCategoria: elemento("filtroCategoriaFeed"),
  feed: elemento("feedComunidade"),
  template: elemento("templatePublicacao"),
  alternarTema: elemento("alternarTemaComunidade")
};

let usuarioAtual = null;
let modoCadastro = false;
let categorias = [];
let publicacoes = [];
let cancelarFeed = null;
let comentariosAbertos = new Map();

function textoLimpo(valor = "") {
  return String(valor).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function nomeExibicao(usuario) {
  return textoLimpo(usuario?.displayName || usuario?.email?.split("@")[0] || NOME_PADRAO).slice(0, 48) || NOME_PADRAO;
}

function iniciais(nome) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase() || "FM";
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
  refs.confirmarAutenticacao.textContent = ativo ? "Criar minha conta" : "Entrar na comunidade";
  mostrarMensagem(refs.mensagemAutenticacao);
}

function abrirModal() {
  if (usuarioAtual) {
    refs.textoPublicacao.focus();
    return;
  }
  if (!refs.modalAutenticacao.open) refs.modalAutenticacao.showModal();
  setTimeout(() => refs.email.focus(), 80);
}

function fecharModal() {
  if (refs.modalAutenticacao.open) refs.modalAutenticacao.close();
}

async function carregarCategorias() {
  try {
    const resposta = await getDocs(collection(db, "categorias"));
    categorias = resposta.docs
      .map((item) => textoLimpo(item.data().nome || item.data().categoria || ""))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  } catch (erro) {
    console.warn("Não foi possível carregar categorias da comunidade.", erro);
    categorias = ["Amizade", "Amor", "Boa Noite", "Bom Dia", "Esperança", "Família", "Fé", "Gratidão", "Motivação", "Reflexão", "Sucesso", "Vida"];
  }

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

function dataFormatada(valor) {
  const data = valor instanceof Timestamp ? valor.toDate() : valor?.toDate?.() || null;
  if (!data) return "Agora mesmo";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(data);
}

function renderizarFeed() {
  const categoria = refs.filtroCategoria.value;
  const filtradas = categoria ? publicacoes.filter((post) => post.categoria === categoria) : publicacoes;
  refs.feed.innerHTML = "";

  if (!filtradas.length) {
    const estado = document.createElement("div");
    estado.className = "estado-feed";
    estado.textContent = categoria
      ? `Ainda não há publicações aprovadas em ${categoria}.`
      : "A comunidade está começando. Seja a primeira pessoa a enviar uma frase inspiradora!";
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
  avatar.textContent = iniciais(nome);
  fragmento.querySelector(".nome-publicacao").textContent = nome;
  fragmento.querySelector(".meta-publicacao").textContent = `Publicado em ${dataFormatada(post.publicadoEm)}`;
  fragmento.querySelector(".selo-categoria").textContent = post.categoria || "Inspiração";
  fragmento.querySelector(".texto-publicacao").textContent = `“${textoLimpo(post.texto)}”`;

  const botaoCurtir = fragmento.querySelector(".botao-curtir-publicacao");
  const botaoComentarios = fragmento.querySelector(".botao-comentarios");
  const botaoCompartilhar = fragmento.querySelector(".botao-compartilhar-publicacao");
  const areaComentarios = fragmento.querySelector(".area-comentarios");
  const listaComentarios = fragmento.querySelector(".lista-comentarios");
  const formularioComentario = fragmento.querySelector(".formulario-comentario");
  const inputComentario = fragmento.querySelector(".texto-comentario");
  const mensagemComentario = fragmento.querySelector(".mensagem-comentario");

  botaoCurtir.addEventListener("click", () => curtirPublicacao(post.id, botaoCurtir));
  botaoComentarios.addEventListener("click", () => alternarComentarios(post.id, areaComentarios, listaComentarios, botaoComentarios));
  botaoCompartilhar.addEventListener("click", () => compartilharPublicacao(post));
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

async function curtirPublicacao(publicacaoId, botao) {
  if (!usuarioAtual) { abrirModal(); return; }
  const referencia = doc(db, "comunidadePublicacoes", publicacaoId, "curtidas", usuarioAtual.uid);
  try {
    const existente = await getDoc(referencia);
    if (existente.exists()) {
      await deleteDoc(referencia);
      botao.classList.remove("ativo");
      botao.innerHTML = "🤍 <span>Curtir</span>";
    } else {
      await setDoc(referencia, { usuarioId: usuarioAtual.uid, criadoEm: serverTimestamp() });
      botao.classList.add("ativo");
      botao.innerHTML = "❤️ <span>Curtido</span>";
    }
  } catch (erro) {
    console.error("Erro ao curtir publicação.", erro);
    alert("Não foi possível registrar sua curtida agora. Tente novamente.");
  }
}

function alternarComentarios(publicacaoId, area, lista, botao) {
  const abrir = area.hidden;
  area.hidden = !abrir;
  botao.classList.toggle("ativo", abrir);
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
      const dados = item.data();
      const comentario = document.createElement("div");
      comentario.className = "comentario";
      const autor = document.createElement("strong");
      autor.textContent = `${textoLimpo(dados.autorNome || NOME_PADRAO)}: `;
      comentario.append(autor, textoLimpo(dados.texto));
      lista.appendChild(comentario);
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
}

function atualizarInterfaceDoUsuario(usuario) {
  usuarioAtual = usuario || null;
  const autenticado = Boolean(usuarioAtual);
  refs.painelVisitante.hidden = autenticado;
  refs.painelMembro.hidden = !autenticado;
  if (!autenticado) return;
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

refs.abrirAutenticacao.addEventListener("click", abrirModal);
refs.abrirAutenticacaoHero.addEventListener("click", abrirModal);
refs.fecharAutenticacao.addEventListener("click", fecharModal);
refs.modalAutenticacao.addEventListener("click", (evento) => { if (evento.target === refs.modalAutenticacao) fecharModal(); });
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
refs.filtroCategoria.addEventListener("change", renderizarFeed);

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
  } catch (erro) {
    console.error("Erro de autenticação.", erro);
    mostrarMensagem(refs.mensagemAutenticacao, mensagemDeErroAuth(erro), true);
  } finally {
    refs.confirmarAutenticacao.disabled = false;
  }
});

onAuthStateChanged(auth, async (usuario) => {
  atualizarInterfaceDoUsuario(usuario);
  if (usuario) {
    try { await salvarPerfil(usuario); } catch (erro) { console.warn("Perfil social não pôde ser atualizado.", erro); }
  }
});

ajustarTema();
configurarModoCadastro(false);
carregarCategorias();
escutarFeed();
