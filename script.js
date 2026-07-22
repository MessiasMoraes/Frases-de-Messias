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

                <img src="${f.imagem || "https://picsum.photos/800/1200"}">

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

                <button onclick="copiar(\`${f.texto}\`)">📋 Copiar</button>

                <button onclick="favoritar(\`${f.texto}\`)">❤️ Favoritar</button>

                <button onclick="compartilhar(\`${f.texto}\`)">📤 Compartilhar</button>

                <button onclick="baixarImagem(this)">📥 Baixar</button>

            </div>

            <div class="estatisticas">

                ❤️ ${f.curtidas || 0} Curtidas

                👁️ ${f.visualizacoes || 0} Visualizações

                📤 ${f.compartilhamentos || 0} Compartilhamentos

            </div>
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
