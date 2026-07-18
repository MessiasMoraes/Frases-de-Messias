const frases = [
  "Nunca desista dos seus sonhos.",
  "A persistência abre caminhos.",
  "Cada novo dia é uma oportunidade para recomeçar.",
  "A fé fortalece o coração.",
  "Grandes conquistas começam com pequenos passos.",
  "O sucesso é resultado da dedicação diária.",
  "A esperança ilumina os dias difíceis.",
  "Quem acredita, alcança."
];

const lista = document.getElementById("listaFrases");
const pesquisa = document.getElementById("pesquisa");
const copiarBtn = document.getElementById("copiarBtn");
const fraseDia = document.getElementById("fraseDia");

function mostrarFrases(filtro = "") {
  lista.innerHTML = "";

  frases
    .filter(f => f.toLowerCase().includes(filtro.toLowerCase()))
    .forEach(f => {
      const div = document.createElement("div");
      div.className = "frase";
      div.innerHTML = `
        <p>${f}</p>
        <button onclick="copiar('${f.replace(/'/g, "\\'")}')">Copiar</button>
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

const indice = Math.floor(Math.random() * frases.length);
fraseDia.textContent = `"${frases[indice]}"`;

mostrarFrases();
