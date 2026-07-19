import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
let frases = [];

const lista = document.getElementById("listaFrases");
const pesquisa = document.getElementById("pesquisa");
const copiarBtn = document.getElementById("copiarBtn");
const fraseDia = document.getElementById("fraseDia");

const arquivos = [
  "frases_01.json",
  "frases_02.json",
  "frases_03.json",
  "frases_04.json",
  "frases_05.json",
  "frases_06.json",
  "frases_07.json",
  "frases_08.json",
  "frases_09.json",
  "frases_10.json"
];

async function carregarFrases() {
  frases = [];

  for (const arquivo of arquivos) {
    try {
      const resposta = await fetch(arquivo);

      if (resposta.ok) {
        const dados = await resposta.json();
        frases.push(...dados);
      }
    } catch (erro) {
      console.log("Erro ao carregar " + arquivo);
    }
  }

  if (frases.length === 0) {
    lista.innerHTML = "<p>Nenhuma frase encontrada.</p>";
    return;
  }

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

      const card = document.createElement("div");
      card.className = "frase";

      card.innerHTML = `
        <h3>${f.categoria}</h3>
        <p>${f.texto}</p>

        <button onclick="copiar('${f.texto.replace(/'/g,"\\'")}')">
        📋 Copiar
        </button>

        <button onclick="compartilhar('${f.texto.replace(/'/g,"\\'")}')">
        📤 Compartilhar
        </button>

        <button onclick="favoritar('${f.texto.replace(/'/g,"\\'")}')">
        ❤️ Favoritar
        </button>
      `;

      lista.appendChild(card);

    });
}

function copiar(texto){
    navigator.clipboard.writeText(texto);
    alert("Frase copiada!");
}

function compartilhar(texto){

    if(navigator.share){

        navigator.share({
            title:"Frases de Messias",
            text:texto,
            url:window.location.href
        });

    }else{

        window.open(
        "https://wa.me/?text="+encodeURIComponent(texto),
        "_blank");

    }

}

let favoritos =
JSON.parse(localStorage.getItem("favoritos")) || [];

function favoritar(texto){

    if(!favoritos.includes(texto)){

        favoritos.push(texto);

        localStorage.setItem(
        "favoritos",
        JSON.stringify(favoritos));

        alert("❤️ Frase adicionada aos favoritos!");

    }else{

        alert("Essa frase já está nos favoritos.");

    }

}

pesquisa.addEventListener("input",()=>{

    mostrarFrases(pesquisa.value);

});

copiarBtn.addEventListener("click",()=>{

    copiar(fraseDia.textContent.replace(/"/g,""));

});

carregarFrases();
