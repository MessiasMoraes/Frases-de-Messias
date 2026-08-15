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
        </div>
        <div class="estatisticas">
          <span>❤️ ${curtidas}</span>
          <span>📤 ${compartilhamentos}</span>
        </div>
      </article>`;
  }).join("");
}

async function copiarTexto(texto) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }
  const area = document.createElement("textarea");
  area.value = texto;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
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
    if (erro?.name !== "AbortError") {
      console.error("Erro ao compartilhar:", erro);
    }
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
