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

// Elementos da Interface
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
            <button onclick='copiar(${JSON.stringify(f.texto)})'>
                📋 Copiar
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

async function curtir(id){
    try{
        await updateDoc(doc(db,"frases",id),{
            curtidas: increment(1)
        });

        const frase = frases.find(f => f.id === id);
        if(frase){
            frase.curtidas = Number(frase.curtidas || 0) + 1;
        }

        mostrarFrases(pesquisa?.value || "");
    }catch(e){
        console.error(e);
        alert("Erro ao curtir.");
    }
}

function favoritar(texto){
    if(favoritos.includes(texto)){
        alert("⭐ Essa frase já está nos favoritos.");
        return;
    }

    favoritos.push(texto);
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
    alert("❤️ Adicionado aos favoritos!");
}

async function compartilhar(id,texto){
    try{
        await updateDoc(doc(db,"frases",id),{
            compartilhamentos: increment(1)
        });

        const frase = frases.find(f=>f.id===id);
        if(frase){
            frase.compartilhamentos = Number(frase.compartilhamentos||0)+1;
        }

        if(navigator.share){
            await navigator.share({
                title:"Frases de Messias",
                text:texto,
                url:location.href
            });
        }else{
            navigator.clipboard.writeText(texto);
            alert("📋 Frase copiada para compartilhar.");
        }

        mostrarFrases(pesquisa?.value || "");
    }catch(e){
        console.error(e);
    }
}

async function visualizar(id){
    const chave="view_"+id;
    if(localStorage.getItem(chave)) return;

    try{
        await updateDoc(doc(db,"frases",id),{
            visualizacoes:increment(1)
        });

        localStorage.setItem(chave,"1");
        const frase = frases.find(f=>f.id===id);
        if(frase){
            frase.visualizacoes = Number(frase.visualizacoes||0)+1;
        }
    }catch(e){
        console.error(e);
    }
}

async function copiar(texto){
    try{
        await navigator.clipboard.writeText(texto);
        alert("📋 Frase copiada com sucesso!");
    }catch(e){
        console.error(e);
        alert("Não foi possível copiar a frase.");
    }
}

// FUNÇÃO DE DOWNLOAD OTIMIZADA
async function baixarImagem(botao) {

    const card = botao.closest(".cardFrase");
    if (!card) return;

    botao.disabled = true;
    botao.innerHTML = "⏳ Preparando...";

    try {

        const imgOriginal = card.querySelector(".imagemFrase img");

        document.getElementById("imgExportacao").src = imgOriginal.src;
        document.getElementById("textoExportacao").textContent =
            card.querySelector(".textoFrase").textContent.trim();

        document.getElementById("autorExportacao").textContent =
            card.querySelector(".autorFrase").textContent.trim();

        const template = document.getElementById("cardExportacao");

        template.style.display = "block";

        const canvas = await html2canvas(template, {
            useCORS: true,
            allowTaint: false,
            scale: 2,
            backgroundColor: null
        });

        template.style.display = "";

        canvas.toBlob(async (blob) => {

            if (!blob) return;

            const arquivo = new File(
                [blob],
                `frase-${Date.now()}.png`,
                {
                    type: "image/png"
                }
            );

            if (
                navigator.canShare &&
                navigator.canShare({ files: [arquivo] })
            ) {

                await navigator.share({
                    title: "Frases de Messias",
                    text: "Confira esta frase inspiradora.",
                    files: [arquivo]
                });

            } else {

                const url = URL.createObjectURL(blob);

                const a = document.createElement("a");
                a.href = url;
                a.download = arquivo.name;
                a.click();

                URL.revokeObjectURL(url);
            }

        });

    } catch (erro) {

        console.error(erro);
        alert("Erro ao gerar a imagem.");

    }

    botao.disabled = false;
    botao.innerHTML = "📥 Baixar";
}

function fraseDoDia(){
    if(!fraseDia) return;
    const indice=Math.floor(Math.random()*frases.length);
    fraseDia.textContent=`"${frases[indice].texto}"`;
}

if(temaBtn){
    if(localStorage.getItem("tema")=="dark"){
        document.body.classList.add("dark");
    }

    temaBtn.onclick=()=>{
        document.body.classList.toggle("dark");
        localStorage.setItem(
            "tema",
            document.body.classList.contains("dark") ? "dark" : "light"
        );
    };
}

if(pesquisa){
    pesquisa.oninput=()=>{
        mostrarFrases(pesquisa.value);
    };
}

if(copiarBtn){
    copiarBtn.onclick=()=>{
        copiar(fraseDia.textContent.replace(/"/g,""));
    };
}

window.curtir=curtir;
window.favoritar=favoritar;
window.compartilhar=compartilhar;
window.baixarImagem=baixarImagem;
window.visualizar=visualizar;
window.copiar=copiar;

document.addEventListener("DOMContentLoaded",()=>{
    carregarFrases();
});

// Registro do Service Worker para o PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado com sucesso!', reg))
      .catch(err => console.log('Erro ao registrar Service Worker:', err));
  });
}

// Integração do Gerador de Frases com IA (Gemini API via x-goog-api-key)
const GEMINI_API_KEY = "AQ.Ab8RN6KY1FqK9IfO0mB0UrudEaLgPlUzeonmI-Gt4AmUTZ3J2g"; 
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const promptInput = document.getElementById('promptIA');
const gerarBtn = document.getElementById('gerarIaBtn');
const resultadoIaDiv = document.getElementById('resultadoIA');

if (gerarBtn && promptInput && resultadoIaDiv) {
  gerarBtn.addEventListener('click', async () => {
    const textoUsuario = promptInput.value.trim();

    if (!textoUsuario) {
      resultadoIaDiv.innerText = "Por favor, digite um tema ou sentimento!";
      return;
    }

    resultadoIaDiv.innerText = "🤖 Criando sua frase inspiradora...";

    try {
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Escreva uma frase curta, inspiradora e emocionante em português sobre o tema ou sentimento: "${textoUsuario}". Retorne apenas a frase entre aspas e nada mais.`
            }]
          }]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.error?.message || "Erro na requisição.";
        resultadoIaDiv.innerText = `⚠️ Erro da IA: ${msg}`;
        return;
      }

      const fraseGerada = data.candidates[0].content.parts[0].text;

      resultadoIaDiv.innerHTML = `
        <blockquote style="background: white; padding: 15px; border-left: 4px solid #4A90E2; border-radius: 6px; display: inline-block; text-align: left; margin-top: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); color: #333;">
          ${fraseGerada}
        </blockquote>
      `;
    } catch (error) {
      console.error(error);
      resultadoIaDiv.innerText = "Ops! Ocorreu um erro de conexão. Tente novamente.";
    }
  });
}
