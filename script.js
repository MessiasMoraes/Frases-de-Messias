import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

let frases = [];
let categorias = {};

let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];

const lista = document.getElementById("listaFrases");
const pesquisa = document.getElementById("pesquisa");
const copiarBtn = document.getElementById("copiarBtn");
const fraseDia = document.getElementById("fraseDia");
const listaCategorias = document.getElementById("listaCategorias");

async function carregarFrases() {
  if (lista) lista.innerHTML = "<p>Carregando frases...</p>";

  frases = [];

  try {
    const consulta = await getDocs(collection(db, "frases"));
    consulta.forEach((item) => {
      frases.push({
        id: item.id,
        ...item.data()
      });
    });
  } catch (erro) {
    console.error(erro);
    if (lista) lista.innerHTML = "<p>Erro ao carregar frases.</p>";
    return;
  }

  if (frases.length === 0) {
    if (lista) lista.innerHTML = "<p>Nenhuma frase encontrada.</p>";
    return;
  }

  const indice = Math.floor(Math.random() * frases.length);
  if (fraseDia) {
    fraseDia.textContent = `"${frases[indice].texto}"`;
  }

  mostrarFrases();
  mostrarCategorias();
}


function mostrarFrases(filtro = "") {
  if (!lista) return;
  lista.innerHTML = "";

  const listaFiltrada = frases.filter(f =>
    (f.texto || "").toLowerCase().includes(filtro.toLowerCase()) ||
    (f.autor || "").toLowerCase().includes(filtro.toLowerCase()) ||
    (f.categoria || "").toLowerCase().includes(filtro.toLowerCase())
  );

  if (listaFiltrada.length === 0) {
    lista.innerHTML = "<p>Nenhuma frase encontrada.</p>";
    return;
  }

  listaFiltrada.forEach(f => {
    const card = document.createElement("div");
    card.className = "cardFrase";

    // Pega a imagem da frase, a imagem da categoria no mapa ou o caminho local
    const caminhoFallback = f.categoria ? `imagens/categorias/${f.categoria.toLowerCase().replace(/\s+/g, '-')}.png` : 'imagens/categorias/padrao.jpg';
    const imagemCard = f.imagem || categorias[f.categoria] || caminhoFallback;

    card.innerHTML = `
      <div class="imagemFrase">
        <img src="${imagemCard}" alt="Frase" onerror="this.src='${caminhoFallback}'">
        <div class="overlay">
          <p class="textoFrase">
            "${f.texto}"
          </p>
          <div class="autorFrase">
            — ${f.autor || "Messias"}
          </div>
          <div class="marca">
            📖 Frases de Messias
          </div>
        </div>
      </div>

      <div class="botoes">
        <button onclick="curtir('${f.id}')">
          ❤️ Curtir
        </button>
        <button onclick='favoritar(${JSON.stringify(f.texto)})'>
          ⭐ Favoritar
        </button>
        <button onclick='compartilhar("${f.id}", ${JSON.stringify(f.texto)})'>
          📤 Compartilhar
        </button>
        <button onclick="baixarImagem(this)">
          📥 Baixar
        </button>
      </div>

      <div class="estatisticas">
        <span>
          ❤️ ${Number(f.curtidas || 0).toLocaleString("pt-BR")} curtidas
        </span>
        <span>
          👁️ ${Number(f.visualizacoes || 0).toLocaleString("pt-BR")} visualizações
        </span>
        <span>
          📤 ${Number(f.compartilhamentos || 0).toLocaleString("pt-BR")} compartilhamentos
        </span>
      </div>
    `;

    lista.appendChild(card);
    visualizar(f.id);
  });
}

  function mostrarCategorias() {
  if (!listaCategorias) return;
  listaCategorias.innerHTML = "";

  const categoriasFixas = [
    { nome: "Amizade", chave: "amizade" },
    { nome: "Amor", chave: "amor" },
    { nome: "Boa Noite", chave: "boa-noite" },
    { nome: "Bom Dia", chave: "bom-dia" },
    { nome: "Esperança", chave: "esperanca" },
    { nome: "Família", chave: "familia" },
    { nome: "Fé", chave: "fe" },
    { nome: "Gratidão", chave: "gratidao" },
    { nome: "Motivação", chave: "motivacao" },
    { nome: "Reflexão", chave: "reflexao" },
    { nome: "Sucesso", chave: "sucesso" },
    { nome: "Vida", chave: "vida" }
  ];

  categoriasFixas.forEach((cat) => {
    const caminhoLocal = `imagens/categorias/${cat.chave}.png`;

    const card = document.createElement("div");
    card.className = "categoriaCard";

    card.innerHTML = `
      <img src="${caminhoLocal}" alt="${cat.nome}" onerror="this.src='imagens/categorias/padrao.jpg'">
      <span>${cat.nome}</span>
    `;

    card.onclick = () => {
      mostrarFrases(cat.nome);
      if (lista) {
        window.scrollTo({
          top: lista.offsetTop - 20,
          behavior: "smooth"
        });
      }
    };

    listaCategorias.appendChild(card);
  });
}


async function curtir(id) {
  try {
    await updateDoc(doc(db, "frases", id), {
      curtidas: increment(1)
    });
    carregarFrases();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao curtir a frase.");
  }
}

function favoritar(texto) {
  if (!favoritos.includes(texto)) {
    favoritos.push(texto);
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
    alert("⭐ Frase adicionada aos favoritos!");
  } else {
    alert("Essa frase já está nos favoritos.");
  }
}

async function compartilhar(id, texto) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Frases de Messias",
        text: texto
      });
    } catch (e) {
      console.log(e);
    }
  } else {
    window.open(
      "https://wa.me/?text=" + encodeURIComponent(texto),
      "_blank"
    );
  }
}

async function baixarImagem(botao) {
  if (typeof html2canvas === 'undefined') {
    alert("A biblioteca de download ainda está carregando.");
    return;
  }

  const card = botao.closest(".cardFrase") || botao.parentElement.parentElement;
  if (!card) return;

  const elementoImagem = card.querySelector(".imagemFrase") || card;

  const textoOriginal = botao.innerText;
  botao.innerText = "⏳ Gerando...";
  botao.disabled = true;

  try {
    const canvas = await html2canvas(elementoImagem, {
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: false,
      logging: false,
      scale: 2
    });

    // Converte o canvas para imagem PNG e dispara o download
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `frase-messias-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (erro) {
    console.error("Erro ao gerar imagem:", erro);
    alert("Ops! Por conta de permissões da imagem de fundo externa, o download automático foi bloqueado.\n\nDica: Você pode tirar um print da tela para salvar!");
  } finally {
    botao.innerText = textoOriginal;
    botao.disabled = false;
  }
}


async function visualizar(id) {
  const chave = "view_" + id;

  if (localStorage.getItem(chave)) {
    return;
  }

  try {
    await updateDoc(doc(db, "frases", id), {
      visualizacoes: increment(1)
    });
    localStorage.setItem(chave, "1");
  } catch (erro) {
    console.error(erro);
  }
}

function copiar(texto) {
  navigator.clipboard.writeText(texto)
    .then(() => {
      alert("📋 Frase copiada!");
    })
    .catch(() => {
      alert("Não foi possível copiar a frase.");
    });
}

// Event Listeners
if (pesquisa) {
  pesquisa.addEventListener("input", () => {
    mostrarFrases(pesquisa.value);
  });
}

if (copiarBtn && fraseDia) {
  copiarBtn.addEventListener("click", () => {
    copiar(fraseDia.textContent.replace(/"/g, ""));
  });
}

// Expõe as funções globais para o HTML
window.curtir = curtir;
window.favoritar = favoritar;
window.compartilhar = compartilhar;
window.baixarImagem = baixarImagem;
window.visualizar = visualizar;
window.copiar = copiar;

// Execução Inicial
carregarFrases();
window.baixarImagem = baixarImagem;
