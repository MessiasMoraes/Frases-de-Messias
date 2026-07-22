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

let favoritos =
JSON.parse(localStorage.getItem("favoritos")) || [];

async function carregarFrases() {

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

        lista.innerHTML =
        "<p>Erro ao carregar frases.</p>";

        return;

    }

    if (frases.length === 0) {

        lista.innerHTML =
        "<p>Nenhuma frase encontrada.</p>";

        return;

    }

    const indice =
    Math.floor(Math.random() * frases.length);

    fraseDia.textContent =
    `"${frases[indice].texto}"`;

    mostrarFrases();

}
