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

// Elementos
const lista = document.getElementById("listaFrases");
const listaCategorias = document.getElementById("listaCategorias");
const pesquisa = document.getElementById("pesquisa");
const copiarBtn = document.getElementById("copiarBtn");
const fraseDia = document.getElementById("fraseDia");
const temaBtn = document.getElementById("temaBtn");

function mostrarCarregando(){

    if(lista){

        lista.innerHTML=`
            <div class="loading">
                ⏳ Carregando frases...
            </div>
        `;

    }

}

function mostrarErro(msg){

    if(lista){

        lista.innerHTML=`
            <div class="erro">
                ${msg}
            </div>
        `;

    }

}

async function carregarFrases(){

    mostrarCarregando();

    frases=[];

    categorias={};

    try{

        const consultaCategorias=await getDocs(collection(db,"categorias"));

        consultaCategorias.forEach(docSnap=>{

            const dados=docSnap.data();

            categorias[dados.nome]=dados.imagem;

        });

        const consultaFrases=await getDocs(collection(db,"frases"));

        consultaFrases.forEach(docSnap=>{

            frases.push({

                id:docSnap.id,

                ...docSnap.data()

            });

        });

    }catch(e){

        console.error(e);

        mostrarErro("Erro ao carregar as frases.");

        return;

    }

    if(frases.length===0){

        mostrarErro("Nenhuma frase encontrada.");

        return;

    }

    fraseDoDia();

    mostrarCategorias();

    mostrarFrases();

}
