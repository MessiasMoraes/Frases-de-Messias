import { app, db } from "./firebase.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, getDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const auth = getAuth(app);
const NOME_PADRAO = "Membro da comunidade";
const URL_API_AVATAR = "https://frasesdemessiascombr.vercel.app/api/avatar";
const TIPOS_DE_IMAGEM = new Set(["image/jpeg", "image/png", "image/webp"]);
const TAMANHO_MAXIMO_ORIGINAL = 12 * 1024 * 1024;
const TAMANHO_MAXIMO_AVATAR = 700 * 1024;

const refs = {
  estado: document.getElementById("estadoMeuPerfil"),
  conteudo: document.getElementById("conteudoMeuPerfil"),
  formulario: document.getElementById("formularioMeuPerfil"),
  nome: document.getElementById("nomePerfilInput"),
  bio: document.getElementById("bioPerfilInput"),
  fotoInput: document.getElementById("fotoPerfilInput"),
  removerFoto: document.getElementById("removerFotoPerfil"),
  nomeArquivoFoto: document.getElementById("nomeArquivoFoto"),
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
let fotoAtualUrl = "";
let imagemSelecionada = "";
let fotoMarcadaParaRemover = false;

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

function atualizarEstadoFoto() {
  const haFoto = Boolean((imagemSelecionada || fotoAtualUrl) && !fotoMarcadaParaRemover);
  refs.removerFoto.hidden = !haFoto;
}

function atualizarPrevia() {
  const nome = textoLimpo(refs.nome.value) || NOME_PADRAO;
  const fotoParaPrevia = fotoMarcadaParaRemover ? "" : (imagemSelecionada || fotoAtualUrl);
  refs.iniciais.textContent = iniciais(nome);
  refs.foto.removeAttribute("src");
  refs.foto.alt = fotoParaPrevia ? `Foto de perfil de ${nome}` : "";
  refs.avatar.classList.remove("tem-foto");
  if (fotoParaPrevia) {
    refs.foto.src = fotoParaPrevia;
    refs.avatar.classList.add("tem-foto");
  }
  atualizarEstadoFoto();
}

function bytesDaImagem(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  return Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
}

function carregarImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const urlTemporaria = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      URL.revokeObjectURL(urlTemporaria);
      resolve(imagem);
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(urlTemporaria);
      reject(new Error("A imagem não pôde ser aberta."));
    };
    imagem.src = urlTemporaria;
  });
}

async function compactarImagem(arquivo) {
  const imagem = await carregarImagem(arquivo);
  let largura = Math.max(1, imagem.naturalWidth || imagem.width || 1);
  let altura = Math.max(1, imagem.naturalHeight || imagem.height || 1);
  const ladoMaximo = 640;
  const escalaInicial = Math.min(1, ladoMaximo / Math.max(largura, altura));
  largura = Math.max(1, Math.round(largura * escalaInicial));
  altura = Math.max(1, Math.round(altura * escalaInicial));

  const qualidades = [0.84, 0.76, 0.68, 0.6];
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext("2d", { alpha: false });
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, largura, altura);
    contexto.drawImage(imagem, 0, 0, largura, altura);

    for (const qualidade of qualidades) {
      const resultado = canvas.toDataURL("image/jpeg", qualidade);
      if (bytesDaImagem(resultado) <= TAMANHO_MAXIMO_AVATAR) return resultado;
    }
    largura = Math.max(240, Math.round(largura * 0.82));
    altura = Math.max(240, Math.round(altura * 0.82));
  }
  throw new Error("Não foi possível ajustar esta foto. Escolha uma imagem menor.");
}

async function requisitarAvatar(dados) {
  const token = await usuarioAtual.getIdToken();
  const resposta = await fetch(URL_API_AVATAR, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token, ...dados })
  });
  const resultado = await resposta.json().catch(() => ({}));
  if (!resposta.ok || !resultado?.ok) throw new Error(resultado?.error || "Não foi possível salvar a foto agora.");
  return String(resultado.url || "");
}

async function enviarNovoAvatar() {
  const url = await requisitarAvatar({
    acao: "enviar",
    imagem: imagemSelecionada,
    fotoAnterior: fotoAtualUrl
  });
  const segura = urlDeImagemSegura(url);
  if (!segura) throw new Error("A foto foi enviada, mas não foi possível obter seu endereço seguro.");
  return segura;
}

async function removerAvatar(url) {
  if (!url) return;
  await requisitarAvatar({ acao: "remover", fotoAnterior: url });
}

async function carregarPerfil(usuario) {
  const referencia = doc(db, "comunidadePerfis", usuario.uid);
  const resultado = await getDoc(referencia);
  const dados = resultado.exists() ? resultado.data() : {};
  refs.nome.value = textoLimpo(dados.nome || nomePadrao(usuario));
  refs.bio.value = textoLimpo(dados.bio || "");
  fotoAtualUrl = urlDeImagemSegura(dados.fotoUrl || "");
  imagemSelecionada = "";
  fotoMarcadaParaRemover = false;
  refs.fotoInput.value = "";
  refs.nomeArquivoFoto.textContent = fotoAtualUrl ? "Foto atual do seu perfil." : "Nenhuma foto selecionada.";
  refs.visivelEmExplorar.checked = dados.visivelEmExplorar !== false;
  refs.aceitaSeguidores.checked = dados.aceitaSeguidores !== false;
  refs.mostrarMetricasSociais.checked = dados.mostrarMetricasSociais !== false;
  refs.verPerfil.href = `perfil.html?uid=${encodeURIComponent(usuario.uid)}`;
  atualizarContadorBio();
  atualizarPrevia();
}

async function aoEscolherFoto() {
  const arquivo = refs.fotoInput.files?.[0];
  if (!arquivo) return;
  if (!TIPOS_DE_IMAGEM.has(arquivo.type)) {
    mostrarMensagem("Escolha uma imagem JPEG, PNG ou WebP da galeria.", true);
    refs.fotoInput.value = "";
    return;
  }
  if (arquivo.size > TAMANHO_MAXIMO_ORIGINAL) {
    mostrarMensagem("Escolha uma foto de até 12 MB para conseguir ajustá-la no perfil.", true);
    refs.fotoInput.value = "";
    return;
  }

  refs.fotoInput.disabled = true;
  mostrarMensagem("Preparando a foto para o seu perfil...");
  try {
    imagemSelecionada = await compactarImagem(arquivo);
    fotoMarcadaParaRemover = false;
    refs.nomeArquivoFoto.textContent = `Foto selecionada: ${textoLimpo(arquivo.name).slice(0, 80) || "imagem da galeria"}.`;
    atualizarPrevia();
    mostrarMensagem("Foto pronta. Toque em Salvar alterações para atualizar seu perfil.");
  } catch (erro) {
    console.error("Erro ao preparar a foto.", erro);
    refs.fotoInput.value = "";
    imagemSelecionada = "";
    atualizarPrevia();
    mostrarMensagem(erro.message || "Não foi possível preparar esta foto. Escolha outra imagem.", true);
  } finally {
    refs.fotoInput.disabled = false;
  }
}

function marcarRemocaoDaFoto() {
  if (!(fotoAtualUrl || imagemSelecionada)) return;
  imagemSelecionada = "";
  fotoMarcadaParaRemover = true;
  refs.fotoInput.value = "";
  refs.nomeArquivoFoto.textContent = "A foto será removida quando você salvar as alterações.";
  atualizarPrevia();
  mostrarMensagem("A foto será removida quando você salvar as alterações.");
}

async function salvarPerfil(evento) {
  evento.preventDefault();
  if (!usuarioAtual) return;
  const nome = textoLimpo(refs.nome.value).slice(0, 48);
  const bio = textoLimpo(refs.bio.value).slice(0, 180);
  const visivelEmExplorar = refs.visivelEmExplorar.checked;
  const aceitaSeguidores = refs.aceitaSeguidores.checked;
  const mostrarMetricasSociais = refs.mostrarMetricasSociais.checked;

  if (nome.length < 2) {
    mostrarMensagem("Informe um nome público com pelo menos 2 caracteres.", true);
    refs.nome.focus();
    return;
  }

  refs.salvar.disabled = true;
  refs.fotoInput.disabled = true;
  let fotoUrl = fotoAtualUrl;
  let novoAvatarEnviado = "";
  const fotoAnterior = fotoAtualUrl;

  try {
    if (imagemSelecionada) {
      mostrarMensagem("Enviando sua foto de perfil...");
      novoAvatarEnviado = await enviarNovoAvatar();
      fotoUrl = novoAvatarEnviado;
    } else if (fotoMarcadaParaRemover) {
      fotoUrl = "";
    }

    mostrarMensagem("Salvando seu perfil público...");
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

    if ((novoAvatarEnviado || fotoMarcadaParaRemover) && fotoAnterior && fotoAnterior !== fotoUrl) {
      removerAvatar(fotoAnterior).catch((erro) => console.warn("Não foi possível limpar a foto anterior.", erro));
    }

    fotoAtualUrl = fotoUrl;
    imagemSelecionada = "";
    fotoMarcadaParaRemover = false;
    refs.fotoInput.value = "";
    refs.nome.value = nome;
    refs.bio.value = bio;
    refs.nomeArquivoFoto.textContent = fotoAtualUrl ? "Foto atual do seu perfil." : "Nenhuma foto selecionada.";
    atualizarContadorBio();
    atualizarPrevia();
    mostrarMensagem("Perfil, foto e preferências de privacidade atualizados com sucesso.");
  } catch (erro) {
    console.error("Erro ao salvar perfil.", erro);
    if (novoAvatarEnviado) removerAvatar(novoAvatarEnviado).catch(() => undefined);
    mostrarMensagem(erro.message || "Não foi possível salvar suas alterações agora. Tente novamente.", true);
  } finally {
    refs.salvar.disabled = false;
    refs.fotoInput.disabled = false;
  }
}

refs.formulario.addEventListener("submit", salvarPerfil);
refs.nome.addEventListener("input", atualizarPrevia);
refs.bio.addEventListener("input", atualizarContadorBio);
refs.fotoInput.addEventListener("change", aoEscolherFoto);
refs.removerFoto.addEventListener("click", marcarRemocaoDaFoto);
refs.foto.addEventListener("error", () => {
  refs.avatar.classList.remove("tem-foto");
  refs.foto.removeAttribute("src");
  mostrarMensagem("A foto não pôde ser exibida. Escolha outra imagem e salve novamente.", true);
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
