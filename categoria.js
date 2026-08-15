import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const categoria = String(document.body.dataset.categoria || "").trim();
const categoriaNormalizada = normalizar(categoria);
const lista = document.getElementById("listaFrasesCategoria");
const contador = document.getElementById("contadorFrases");
const busca = document.getElementById("buscaCategoria");
const ORIGEM_PROXY_IMAGEM = "https://frasesdemessiascombr.vercel.app";
let frasesDaCategoria = [];
let imagensCategorias = {};

function normalizar(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\p{Extended_Pictographic}]/gu, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escaparHtml(valor = "") {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarImagem(url = "") {
  const valor = String(url || "").trim();
  if (!valor) return "";
  try {
    const endereco = new URL(valor, window.location.href);
    if (endereco.hostname === "messiasmoraes.github.io" && endereco.pathname.startsWith("/Frases-de-Messias/")) {
      endereco.pathname = endereco.pathname.replace(/^\/Frases-de-Messias\//, "/");
      endereco.protocol = window.location.protocol;
      endereco.host = window.location.host;
    }
    return endereco.href;
  } catch (_) {
    return valor;
  }
}

function imagemDaFrase(frase) {
  const imagem = normalizarImagem(frase.imagem || imagensCategorias[categoria] || "");
  if (imagem) return imagem;
  return `https://picsum.photos/seed/${encodeURIComponent(frase.id || frase.texto || categoria)}/800/600`;
}

function urlParaProxyImagem(url = "") {
  const valor = String(url || "").trim();
  if (!valor) return "";
  try {
    const origem = new URL(valor, window.location.href);
    if (origem.origin === window.location.origin) return origem.href;
    if (origem.protocol !== "https:") return "";
    const proxyBase = window.location.hostname.endsWith(".vercel.app")
      ? window.location.origin
      : ORIGEM_PROXY_IMAGEM;
    return `${proxyBase}/api/image?url=${encodeURIComponent(origem.href)}`;
  } catch (_) {
    return "";
  }
}

async function carregarImagemParaCanvas(url) {
  const resposta = await fetch(url, { cache: "no-store", mode: "cors" });
  const tipo = resposta.headers.get("content-type") || "";
  if (!resposta.ok || !tipo.toLowerCase().startsWith("image/")) {
    throw new Error("A foto original não pôde ser carregada para o download.");
  }

  const blob = await resposta.blob();
  if (!blob.size) throw new Error("A foto original retornou vazia.");

  const objectUrl = URL.createObjectURL(blob);
  const imagem = new Image();
  imagem.decoding = "async";

  try {
    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Tempo esgotado ao carregar a foto original.")), 10000);
      imagem.onload = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      imagem.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("A foto original não pôde ser decodificada."));
      };
      imagem.src = objectUrl;
    });

    if (!imagem.naturalWidth || !imagem.naturalHeight) {
      throw new Error("A foto original não possui dimensões válidas.");
    }
    return { imagem, liberar: () => URL.revokeObjectURL(objectUrl) };
  } catch (erro) {
    URL.revokeObjectURL(objectUrl);
    throw erro;
  }
}

function mostrarCarregando() {
  lista.innerHTML = '<div class="loading" role="status">Carregando frases...</div>';
}

function renderizar(frases) {
  const termo = normalizar(busca?.value || "");
  const resultado = frases.filter((frase) => {
    if (!termo) return true;
    return normalizar(`${frase.texto || ""} ${frase.autor || "Messias"}`).includes(termo);
  });

  contador.textContent = `${resultado.length} ${resultado.length === 1 ? "frase encontrada" : "frases encontradas"}`;

  if (!resultado.length) {
    lista.innerHTML = '<p class="semResultado">Nenhuma frase encontrada nesta categoria. Tente outra busca ou volte mais tarde.</p>';
    return;
  }

  lista.innerHTML = resultado.map((frase) => {
    const texto = escaparHtml(frase.texto || "");
    const autor = escaparHtml(frase.autor || "Messias");
    const imagem = escaparHtml(imagemDaFrase(frase));
    const id = escaparHtml(frase.id);
    const curtidas = Number(frase.curtidas || 0).toLocaleString("pt-BR");
    const compartilhamentos = Number(frase.compartilhamentos || 0).toLocaleString("pt-BR");

    return `
      <article class="cardFrase">
        <div class="imagemFrase">
          <img src="${imagem}" alt="${texto}" loading="lazy" decoding="async">
          <div class="overlay">
            <p class="textoFrase">“${texto}”</p>
            <p class="autorFrase">— ${autor}</p>
            <div class="marca">Frases de Messias</div>
          </div>
        </div>
        <div class="botoes" aria-label="Ações da frase">
          <button type="button" data-acao="curtir" data-id="${id}">Curtir</button>
          <button type="button" data-acao="copiar" data-id="${id}">Copiar</button>
          <button type="button" data-acao="compartilhar" data-id="${id}">Compartilhar</button>
          <button type="button" class="btn-baixar" data-acao="baixar" data-id="${id}" aria-expanded="false">📥 Baixar</button>
        </div>
        <div class="opcoesDownload" hidden aria-label="Escolha o formato da imagem">
          <p>Escolha o formato:</p>
          <button type="button" data-acao="baixar-imagem" data-formato="story" data-id="${id}">📱 Story (9:16)</button>
          <button type="button" data-acao="baixar-imagem" data-formato="feed" data-id="${id}">📸 Feed (1:1)</button>
        </div>
        <div class="estatisticas">
          <span>❤️ ${curtidas}</span>
          <span>📤 ${compartilhamentos}</span>
        </div>
      </article>`;
  }).join("");
}

async function copiarTexto(texto) {
  const valor = String(texto || "").trim();
  if (!valor) throw new Error("Não há texto para copiar.");

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(valor);
      return;
    } catch (erroClipboard) {
      console.warn("Clipboard moderno indisponível; usando fallback:", erroClipboard);
    }
  }

  const area = document.createElement("textarea");
  area.value = valor;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;";
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, area.value.length);
  try {
    if (!document.execCommand("copy")) throw new Error("O navegador não confirmou a cópia.");
  } finally {
    area.remove();
  }
}

async function curtir(frase) {
  const chave = `like_${frase.id}`;
  if (localStorage.getItem(chave)) {
    alert("Você já curtiu esta frase neste dispositivo.");
    return;
  }

  try {
    await updateDoc(doc(db, "frases", frase.id), { curtidas: increment(1) });
    localStorage.setItem(chave, "1");
    frase.curtidas = Number(frase.curtidas || 0) + 1;
    renderizar(frasesDaCategoria);
  } catch (erro) {
    console.error("Erro ao curtir frase:", erro);
    alert("Não foi possível registrar a curtida agora.");
  }
}

async function compartilhar(frase) {
  const texto = `“${frase.texto || ""}” — ${frase.autor || "Messias"}\n\n${window.location.href}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: `Frases de ${categoria}`, text: texto, url: window.location.href });
    } else {
      await copiarTexto(texto);
      alert("Link e frase copiados para compartilhar.");
    }
    await updateDoc(doc(db, "frases", frase.id), { compartilhamentos: increment(1) });
    frase.compartilhamentos = Number(frase.compartilhamentos || 0) + 1;
    renderizar(frasesDaCategoria);
  } catch (erro) {
    if (erro?.name !== "AbortError") console.error("Erro ao compartilhar:", erro);
  }
}

function alternarOpcoesDownload(botao) {
  const card = botao.closest(".cardFrase");
  const opcoes = card?.querySelector(".opcoesDownload");
  if (!opcoes) return;

  const abrir = opcoes.hidden;
  opcoes.hidden = !abrir;
  opcoes.classList.toggle("aberta", abrir);
  botao.setAttribute("aria-expanded", String(abrir));

  if (abrir) {
    requestAnimationFrame(() => opcoes.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }
}

function quebrarLinhas(ctx, texto, larguraMaxima) {
  const palavras = String(texto || "").replace(/[“”]/g, "").trim().split(/\s+/).filter(Boolean);
  if (!palavras.length) return [""];

  const linhas = [];
  let atual = palavras[0];
  for (let indice = 1; indice < palavras.length; indice += 1) {
    const tentativa = `${atual} ${palavras[indice]}`;
    if (ctx.measureText(tentativa).width <= larguraMaxima) {
      atual = tentativa;
    } else {
      linhas.push(atual);
      atual = palavras[indice];
    }
  }
  linhas.push(atual);
  return linhas;
}

function mostrarPreviewDownload(url, formato) {
  document.querySelectorAll('[data-modal-download="imagem"]').forEach((modalAntigo) => {
    const urlAntiga = modalAntigo.dataset.objectUrl;
    if (urlAntiga) URL.revokeObjectURL(urlAntiga);
    modalAntigo.remove();
  });

  const modal = document.createElement("div");
  modal.dataset.modalDownload = "imagem";
  modal.dataset.objectUrl = url;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Prévia da imagem gerada");
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;color:#fff;text-align:center;";
  modal.innerHTML = `
    <p style="margin:0 0 15px;font-weight:bold;">Imagem gerada!</p>
    <img src="${url}" alt="Imagem da frase gerada" style="max-width:100%;max-height:65vh;border-radius:10px;box-shadow:0 0 20px rgba(0,0,0,.5);margin-bottom:14px;">
    <a href="${url}" download="frase-${formato}-${Date.now()}.png" style="display:inline-block;padding:12px 22px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin-bottom:14px;">⬇️ Baixar imagem</a>
    <p style="font-size:14px;line-height:1.45;margin:0 0 16px;">No celular, se a imagem abrir em vez de baixar, pressione-a e escolha <b>Salvar imagem</b>.</p>
    <button type="button" data-fechar-preview style="padding:12px 30px;min-height:46px;background:#ef4444;color:#fff;border:0;border-radius:7px;font-weight:bold;cursor:pointer;">Fechar</button>
  `;

  const fechar = () => {
    URL.revokeObjectURL(url);
    modal.remove();
  };
  modal.querySelector("[data-fechar-preview]")?.addEventListener("click", fechar);
  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) fechar();
  });
  document.body.appendChild(modal);
}

async function baixarImagem(botao, formato) {
  const card = botao.closest(".cardFrase");
  if (!card) return;

  const rotuloOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = "Gerando...";

  try {
    const imagemElemento = card.querySelector(".imagemFrase img");
    const urlOriginal = imagemElemento?.currentSrc || imagemElemento?.src || "";
    const urlExportacao = urlParaProxyImagem(urlOriginal);
    if (!urlExportacao) throw new Error("A imagem da frase não foi encontrada.");

    const texto = card.querySelector(".textoFrase")?.innerText || "";
    const autor = card.querySelector(".autorFrase")?.innerText || "";
    const largura = 1080;
    const altura = formato === "feed" ? 1080 : 1920;
    const tamanhoTexto = formato === "feed" ? 52 : 70;
    const tamanhoAutor = formato === "feed" ? 34 : 42;
    const tamanhoMarca = formato === "feed" ? 26 : 34;

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("Não foi possível preparar a imagem.");

    const recurso = await carregarImagemParaCanvas(urlExportacao);
    try {
      const imagem = recurso.imagem;
      const proporcaoImagem = imagem.naturalWidth / imagem.naturalHeight;
      const proporcaoCanvas = largura / altura;
      let larguraDesenho = largura;
      let alturaDesenho = altura;
      let x = 0;
      let y = 0;
      if (proporcaoImagem > proporcaoCanvas) {
        larguraDesenho = altura * proporcaoImagem;
        x = (largura - larguraDesenho) / 2;
      } else {
        alturaDesenho = largura / proporcaoImagem;
        y = (altura - alturaDesenho) / 2;
      }
      contexto.drawImage(imagem, x, y, larguraDesenho, alturaDesenho);
    } finally {
      recurso.liberar();
    }

    contexto.fillStyle = "rgba(0,0,0,.60)";
    contexto.fillRect(0, 0, largura, altura);
    contexto.textAlign = "center";
    contexto.textBaseline = "middle";
    contexto.fillStyle = "#ffffff";
    contexto.shadowColor = "rgba(0,0,0,.8)";
    contexto.shadowBlur = 12;
    contexto.shadowOffsetX = 0;
    contexto.shadowOffsetY = 3;

    contexto.font = `bold ${tamanhoTexto}px Arial, sans-serif`;
    const linhas = quebrarLinhas(contexto, texto, largura - 140);
    const alturaLinha = tamanhoTexto * 1.4;
    const alturaTexto = linhas.length * alturaLinha;
    const blocoAltura = alturaTexto + 60 + tamanhoAutor;
    const inicioY = (altura - blocoAltura) / 2 + alturaTexto / 2;

    linhas.forEach((linha, indice) => {
      const y = inicioY - ((linhas.length - indice) * alturaLinha) + (alturaLinha / 2);
      contexto.fillText(`“${linha}”`, largura / 2, y);
    });

    if (autor) {
      contexto.font = `600 ${tamanhoAutor}px Arial, sans-serif`;
      contexto.fillText(autor, largura / 2, inicioY + 30 + (tamanhoAutor / 2));
    }

    contexto.shadowColor = "transparent";
    contexto.font = `bold ${tamanhoMarca}px Arial, sans-serif`;
    contexto.fillStyle = "rgba(255,255,255,.92)";
    contexto.fillText("Frases de Messias", largura / 2, altura - 80);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Não foi possível gerar a imagem.");
    mostrarPreviewDownload(URL.createObjectURL(blob), formato);
  } catch (erro) {
    console.error("Erro ao gerar imagem da categoria:", erro);
    alert(`Não foi possível gerar a imagem agora. ${erro.message || "Tente novamente em instantes."}`);
  } finally {
    botao.disabled = false;
    botao.textContent = rotuloOriginal;
  }
}

function configurarAcoes() {
  lista.addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) return;
    const frase = frasesDaCategoria.find((item) => item.id === botao.dataset.id);
    if (!frase) return;

    if (botao.dataset.acao === "curtir") {
      await curtir(frase);
      return;
    }

    if (botao.dataset.acao === "copiar") {
      try {
        await copiarTexto(`“${frase.texto || ""}” — ${frase.autor || "Messias"}`);
        const textoOriginal = botao.textContent;
        botao.textContent = "Copiada!";
        window.setTimeout(() => { botao.textContent = textoOriginal; }, 1800);
      } catch (erro) {
        console.error("Erro ao copiar frase:", erro);
        alert("Não foi possível copiar a frase.");
      }
      return;
    }

    if (botao.dataset.acao === "baixar") {
      alternarOpcoesDownload(botao);
      return;
    }

    if (botao.dataset.acao === "baixar-imagem") {
      await baixarImagem(botao, botao.dataset.formato || "story");
      return;
    }

    await compartilhar(frase);
  });
}

function configurarTema() {
  const botaoTema = document.getElementById("temaBtn");
  const aplicarTema = (escuro) => {
    document.body.classList.toggle("dark", escuro);
    if (botaoTema) {
      botaoTema.textContent = escuro ? "☀️ Modo Claro" : "🌙 Modo Escuro";
      botaoTema.setAttribute("aria-pressed", String(escuro));
    }
  };

  aplicarTema(localStorage.getItem("tema") === "dark");
  botaoTema?.addEventListener("click", () => {
    const escuro = !document.body.classList.contains("dark");
    localStorage.setItem("tema", escuro ? "dark" : "light");
    aplicarTema(escuro);
  });
}

async function carregarCategoria() {
  if (!categoria || !lista) return;
  mostrarCarregando();

  try {
    const [resultadoCategorias, resultadoFrases] = await Promise.all([
      getDocs(collection(db, "categorias")),
      getDocs(collection(db, "frases"))
    ]);

    resultadoCategorias.forEach((documento) => {
      const dados = documento.data();
      const nome = String(dados.nome || "").trim();
      if (nome) imagensCategorias[nome] = dados.imagem || "";
    });

    frasesDaCategoria = resultadoFrases.docs
      .map((documento) => ({ id: documento.id, ...documento.data() }))
      .filter((frase) => normalizar(frase.categoria || "") === categoriaNormalizada);

    renderizar(frasesDaCategoria);
  } catch (erro) {
    console.error("Erro ao carregar categoria:", erro);
    lista.innerHTML = '<p class="semResultado">Não foi possível carregar as frases agora. Verifique a conexão e tente novamente.</p>';
    contador.textContent = "";
  }
}

busca?.addEventListener("input", () => renderizar(frasesDaCategoria));
configurarAcoes();
configurarTema();
carregarCategoria();
