
let frases = [];

const lista = document.getElementById("listaFrases");
const pesquisa = document.getElementById("pesquisa");
const copiarBtn = document.getElementById("copiarBtn");
const fraseDia = document.getElementById("fraseDia");

async function carregarFrases() {
  const resposta = await fetch("frases.json");
  frases = await resposta.json();

  const indice = Math.floor(Math.random() * frases.length);
  fraseDia.textContent = `"${frases[indice].texto}"`;

  mostrarFrases();
}

function mostrarFrases(filtro = "") {
  lista.innerHTML = "";

  frases
    .filter(f =>
      f.texto.toLowerCase().includes(filtro.toLowerCase()) ||
      f.categoria.toLowerCase().includes(filtro.toLowerCase())
    )
    .forEach(f => {
      const div = document.createElement("div");
      div.className = "frase";
      div.innerHTML = `
        <h3>${f.categoria}</h3>
        <p>${f.texto}</p>
        <button onclick="copiar('${f.texto.replace(/'/g, "\\'")}')">
  📋 Copiar
</button>
<button onclick="favoritar('${f.texto.replace(/'/g, "\\'")}')">
  ❤️ Favoritar
</button>

<button onclick="compartilhar('${f.texto.replace(/'/g, "\\'")}')">
  📤 Compartilhar
</button>
      `;
      lista.appendChild(div);
    });
}

function copiar(texto) {
  navigator.clipboard.writeText(texto);
  alert("Frase copiada!");
}

pesquisa.addEventListener("input", () => {
  mostrarFrases(pesquisa.value);
});

copiarBtn.addEventListener("click", () => {
  copiar(fraseDia.textContent.replace(/"/g, ""));
});

carregarFrases();
function compartilhar(texto) {
  if (navigator.share) {
    navigator.share({
      title: "Frases de Messias",
      text: texto,
      url: window.location.href
    });
  } else {
    window.open(
      "https://wa.me/?text=" + encodeURIComponent(texto),
      "_blank"
    );
  }
}
const temaBtn = document.getElementById("temaBtn");

temaBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("tema", "dark");
  } else {
    localStorage.setItem("tema", "light");
  }
});

if (localStorage.getItem("tema") === "dark") {
  document.body.classList.add("dark");
}
let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];

function favoritar(texto) {
  if (!favoritos.includes(texto)) {
    favoritos.push(texto);
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
    alert("❤️ Frase adicionada aos favoritos!");
  } else {
    alert("⭐ Essa frase já está nos favoritos.");
  }
}
