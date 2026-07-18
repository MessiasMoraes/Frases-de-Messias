
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
          Copiar
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
