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
  categorias = {};

  // 1. Carrega o mapa de categorias
  try {
    const consultaCategorias = await getDocs(collection(db, "categorias"));
    consultaCategorias.forEach((doc) => {
      const dados = doc.data();
      const nomeCat = dados.nome || doc.id;
      // Busca imagem no Firestore ou gera o caminho padrão local
      const imgCat = dados.imagem || dados.foto || dados.url || `imagens/categorias/${nomeCat.toLowerCase().replace(/\s+/g, '-')}.png`;
      categorias[nomeCat] = imgCat;
    });
  } catch (e) {
    console.error("Erro ao carregar categorias do Firestore:", e);
  }

  // 2. Carrega as frases
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

  // Define frase do dia
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

async function mostrarCategorias() {
  if (!listaCategorias) return;
  listaCategorias.innerHTML = "";

  try {
    const consulta = await getDocs(collection(db, "categorias"));

    consulta.forEach((doc) => {
      const categoria = doc.data();
      const nome = categoria.nome || doc.id || "Categoria";
      
      // Monta o caminho relativo da imagem (.png)
      const caminhoLocal = `imagens/categorias/${nome.toLowerCase().replace(/\s+/g, '-')}.png`;
      const imagem = categoria.imagem || categoria.foto || categoria.url || caminhoLocal;

      const card = document.createElement("div");
      card.className = "categoriaCard";

      card.innerHTML = `
        <img src="${imagem}" alt="${nome}" onerror="this.src='${caminhoLocal}'">
        <span>${nome}</span>
      `;

      card.onclick = () => {
        mostrarFrases(nome);
        if (lista) {
          window.scrollTo({
            top: lista.offsetTop - 20,
            behavior: "smooth"
          });
        }
      };

      listaCategorias.appendChild(card);
    });
  } catch (erro) {
    console.error("Erro ao mostrar categorias:", erro);
  }
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

function baixarImagem(botao) {
  const imagemFrase = botao.closest(".cardFrase").querySelector(".imagemFrase");

  html2canvas(imagemFrase, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    scale: 2
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = `frase-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
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
