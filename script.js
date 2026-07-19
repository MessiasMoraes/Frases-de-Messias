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


async function carregarFrases() {

  frases = [];

  try {

    const consulta = await getDocs(collection(db, "frases"));

    consulta.forEach((doc) => {
      frases.push(doc.data());
    });

  } catch (e) {

    lista.innerHTML = "<p>Erro ao carregar frases.</p>";
    console.error(e);
    return;

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

  const frasesFiltradas = frases.filter(f =>
    (f.texto || "").toLowerCase().includes(filtro.toLowerCase()) ||
    (f.categoria || "").toLowerCase().includes(filtro.toLowerCase())
  );

  if (frasesFiltradas.length === 0) {
    lista.innerHTML = "<p>Nenhuma frase encontrada.</p>";
    return;
  }

  frasesFiltradas.forEach(f => {

    const card = document.createElement("div");
    card.className = "frase";

    const titulo = document.createElement("h3");
    titulo.textContent = f.categoria;

    const texto = document.createElement("p");
    texto.className = "textoFrase";
    texto.textContent = f.texto;

    const btnCopiar = document.createElement("button");
    btnCopiar.textContent = "📋 Copiar";
    btnCopiar.addEventListener("click", () => copiar(f.texto));

    const btnCompartilhar = document.createElement("button");
    btnCompartilhar.textContent = "📤 Compartilhar";
    btnCompartilhar.addEventListener("click", () => compartilhar(f.texto));

    const btnFavoritar = document.createElement("button");
    btnFavoritar.textContent = "❤️ Favoritar";
    btnFavoritar.addEventListener("click", () => favoritar(f.texto));

    card.appendChild(titulo);
    card.appendChild(texto);
    card.appendChild(btnCopiar);
    card.appendChild(btnCompartilhar);
    card.appendChild(btnFavoritar);

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

window.copiar = copiar;
window.compartilhar = compartilhar;
window.favoritar = favoritar;
carregarFrases();
