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
function mostrarFrases(filtro = "") {

    lista.innerHTML = "";

    const frasesFiltradas = frases.filter(f =>
        (f.texto || "").toLowerCase().includes(filtro.toLowerCase()) ||
        (f.categoria || "").toLowerCase().includes(filtro.toLowerCase()) ||
        (f.autor || "").toLowerCase().includes(filtro.toLowerCase())
    );

    if (frasesFiltradas.length === 0) {

        lista.innerHTML = "<p>Nenhuma frase encontrada.</p>";

        return;

    }

    frasesFiltradas.forEach(f => {

        const card = document.createElement("div");

        card.className = "cardFrase";

        card.innerHTML = `

            <div class="imagemFrase">

                <img src="${f.imagem || 'https://picsum.photos/800/1200'}" alt="Imagem da frase">

                <div class="overlay">

                    <p class="textoFrase">
                        "${f.texto}"
                    </p>

                    <span class="autorFrase">
                        — ${f.autor || "Messias"}
                    </span>

                    <div class="marca">
                        📖 Frases de Messias
                    </div>

                </div>

            </div>

            <div class="botoes">

                <button onclick='copiar(${JSON.stringify(f.texto)})'>
                    📋 Copiar
                </button>

                <button onclick='favoritar(${JSON.stringify(f.texto)})'>
                    ❤️ Favoritar
                </button>

                <button onclick='compartilhar(${JSON.stringify(f.texto)})'>
                    📤 Compartilhar
                </button>

                <button onclick="baixarImagem(this)">
                    📥 Baixar
                </button>

            </div>

            <div class="estatisticas">

                <span>❤️ ${Number(f.curtidas ?? 0).toLocaleString("pt-BR")} curtidas</span>

                <span>👁️ ${Number(f.visualizacoes ?? 0).toLocaleString("pt-BR")} visualizações</span>

                <span>📤 ${Number(f.compartilhamentos ?? 0).toLocaleString("pt-BR")} compartilhamentos</span>

            </div>

        `;

        lista.appendChild(card);

    });

                            }
