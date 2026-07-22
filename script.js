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


async async function carregarFrases() {

    frases = [];
    lista.innerHTML = "<p>Carregando frases...</p>";

    try {

        const consulta = await getDocs(collection(db, "frases"));

        consulta.forEach((doc) => {

            frases.push({
                id: doc.id,
                ...doc.data()
            });

        });

    } catch (erro) {

        console.error(erro);
        lista.innerHTML = "<p>Erro ao carregar frases.</p>";
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

mostrarFrases()
function copiar(texto){

    navigator.clipboard.writeText(texto)
    .then(() => {
        alert("📋 Frase copiada com sucesso!");
    })
    .catch(() => {
        alert("Não foi possível copiar a frase.");
    });

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
function baixarImagem(botao){

    const card = botao.closest(".cardFrase");

    html2canvas(card).then(canvas => {

        const link = document.createElement("a");

        link.download = "frase-de-messias.png";

        link.href = canvas.toDataURL("image/png");

        link.click();

    });

}

window.baixarImagem = baixarImagem;
