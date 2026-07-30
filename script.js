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

function mostrarFrases(filtro = "") {

    if (!lista) return;

    lista.innerHTML = "";

    filtro = filtro.toLowerCase().trim();

    const resultado = frases.filter(f => {

        if (filtro === "") return true;

        return (
            (f.texto || "").toLowerCase().includes(filtro) ||
            (f.autor || "").toLowerCase().includes(filtro) ||
            (f.categoria || "").toLowerCase().includes(filtro)
        );

    });

    if (resultado.length === 0) {

        lista.innerHTML = `
            <div class="semResultado">
                😔 Nenhuma frase encontrada.
            </div>
        `;

        return;

    }

    resultado.forEach(criarCardFrase);

}

function criarCardFrase(f){

    const imagemCategoria =
        categorias[f.categoria] ||
        `imagens/categorias/${(f.categoria || "padrao")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g,"")
            .toLowerCase()
            .replace(/\s+/g,"-")}.png`;

    const card = document.createElement("div");

    card.className = "cardFrase";

    card.innerHTML = `

        <div class="imagemFrase">

            <img
                loading="lazy"
                crossorigin="anonymous"
                src="${f.imagem || imagemCategoria}"
                alt="${f.categoria}"
                onerror="this.src='imagens/categorias/padrao.png'"
            >

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

            <button onclick='compartilhar("${f.id}",${JSON.stringify(f.texto)})'>
                📤 Compartilhar
            </button>

            <button onclick="baixarImagem(this)">
                📥 Baixar
            </button>

        </div>

        <div class="estatisticas">

            <span>❤️ ${Number(f.curtidas || 0).toLocaleString("pt-BR")}</span>

            <span>👁️ ${Number(f.visualizacoes || 0).toLocaleString("pt-BR")}</span>

            <span>📤 ${Number(f.compartilhamentos || 0).toLocaleString("pt-BR")}</span>

        </div>

    `;

    lista.appendChild(card);

    visualizar(f.id);

}

function mostrarCategorias(){

    if(!listaCategorias) return;

    listaCategorias.innerHTML = "";

    Object.entries(categorias).forEach(([nome, imagem]) =>{

        const card = document.createElement("div");

        card.className = "categoriaCard";

        card.innerHTML = `

            <img
                loading="lazy"
                src="${imagem}"
                alt="${nome}"
                onerror="this.src='imagens/categorias/padrao.png'"
            >

            <span>${nome}</span>

        `;

        card.onclick = ()=>{

            mostrarFrases(nome);

            window.scrollTo({

                top: lista.offsetTop - 20,

                behavior:"smooth"

            });

        };

        listaCategorias.appendChild(card);

    });

}
