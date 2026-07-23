import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

let frases = [];

let favoritos =
JSON.parse(localStorage.getItem("favoritos")) || [];

const lista = document.getElementById("listaFrases");
const pesquisa = document.getElementById("pesquisa");
const copiarBtn = document.getElementById("copiarBtn");
const fraseDia = document.getElementById("fraseDia");

async function carregarFrases(){

    lista.innerHTML = "<p>Carregando frases...</p>";

    frases = [];

    try{

        const consulta = await getDocs(collection(db,"frases"));

        consulta.forEach((item)=>{

            frases.push({
                id:item.id,
                ...item.data()
            });

        });

    }catch(erro){

        console.error(erro);

        lista.innerHTML="<p>Erro ao carregar frases.</p>";

        return;

    }

    if(frases.length===0){

        lista.innerHTML="<p>Nenhuma frase encontrada.</p>";

        return;

    }

    const indice=Math.floor(Math.random()*frases.length);

    fraseDia.textContent = `"${frases[indice].texto}"`;

mostrarFrases();

}

function mostrarFrases(filtro = ""){

    lista.innerHTML = "";

    const listaFiltrada = frases.filter(f =>

        (f.texto || "").toLowerCase().includes(filtro.toLowerCase()) ||
        (f.autor || "").toLowerCase().includes(filtro.toLowerCase()) ||
        (f.categoria || "").toLowerCase().includes(filtro.toLowerCase())

    );

    if(listaFiltrada.length === 0){

        lista.innerHTML = "<p>Nenhuma frase encontrada.</p>";

        return;

    }

    listaFiltrada.forEach(f => {

        const card = document.createElement("div");

        card.className = "cardFrase";

        card.innerHTML = `

        <div class="imagemFrase">

            <img src="${f.imagem || "https://picsum.photos/800/1200"}" alt="Frase">

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

            <button onclick='compartilhar("${f.id}", ${JSON.stringify(f.texto)})'>
                📤 Compartilhar
            </button>

            <button onclick="baixarImagem(this)">
                📥 Baixar
            </button>

        </div>

        <div class="estatisticas">

            <span>
                ❤️ ${Number(f.curtidas || 0).toLocaleString("pt-BR")} curtidas
            </span>

            <span>
                👁️ ${Number(f.visualizacoes || 0).toLocaleString("pt-BR")} visualizações
            </span>

            <span>
                📤 ${Number(f.compartilhamentos || 0).toLocaleString("pt-BR")} compartilhamentos
            </span>

        </div>

        `;

        lista.appendChild(card);

visualizar(f.id);

    });

}
}
async function curtir(id){

    try{

        await updateDoc(
            doc(db,"frases",id),
            {
                curtidas: increment(1)
            }
        );

        carregarFrases();

    }catch(erro){

        console.error(erro);

        alert("Erro ao curtir a frase.");

    }

}

function favoritar(texto){

    if(!favoritos.includes(texto)){

        favoritos.push(texto);

        localStorage.setItem(
            "favoritos",
            JSON.stringify(favoritos)
        );

        alert("⭐ Frase adicionada aos favoritos!");

    }else{

        alert("Essa frase já está nos favoritos.");

    }

}

async function compartilhar(id,texto){

    try{

        await updateDoc(
            doc(db,"frases",id),
            {
                compartilhamentos: increment(1)
            }
        );

    }catch(erro){

        console.error(erro);

    }

    if(navigator.share){

        try{

            await navigator.share({
                title:"Frases de Messias",
                text:texto,
                url:window.location.href
            });

        }catch(e){
            return;
        }

    }else{

        window.open(
            "https://wa.me/?text="+encodeURIComponent(texto),
            "_blank"
        );

    }

    carregarFrases();

}

function baixarImagem(botao){

    const card = botao.closest(".cardFrase");

    html2canvas(card).then(canvas=>{

        const link=document.createElement("a");

        link.download="frase-de-messias.png";

        link.href=canvas.toDataURL("image/png");

        link.click();

    });

}

window.curtir = curtir;
window.favoritar = favoritar;
window.compartilhar = compartilhar;
window.baixarImagem = baixarImagem;
function copiar(texto){

    navigator.clipboard.writeText(texto)
    .then(() => {
        alert("📋 Frase copiada!");
    })
    .catch(() => {
        alert("Não foi possível copiar a frase.");
    });

}

pesquisa.addEventListener("input", () => {

    mostrarFrases(pesquisa.value);

});

copiarBtn.addEventListener("click", () => {

    copiar(fraseDia.textContent.replace(/"/g,""));

});

window.copiar = copiar;

carregarFrases();
