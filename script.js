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

function mostrarCarregando() {
    if (lista) {
        lista.innerHTML = `
            <div class="loading">
                ⏳ Carregando frases...
            </div>
        `;
    }
}

function mostrarErro(msg) {
    if (lista) {
        lista.innerHTML = `
            <div class="erro">
                ${msg}
            </div>
        `;
    }
}

async function carregarFrases() {
    mostrarCarregando();
    frases = [];
    categorias = {};

    try {
        const consultaCategorias = await getDocs(collection(db, "categorias"));
        consultaCategorias.forEach(docSnap => {
            const dados = docSnap.data();
            categorias[dados.nome] = dados.imagem;
        });

        const consultaFrases = await getDocs(collection(db, "frases"));
        consultaFrases.forEach(docSnap => {
            frases.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
    } catch (e) {
        console.error(e);
        mostrarErro("Erro ao carregar as frases.");
        return;
    }

    if (frases.length === 0) {
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

function criarCardFrase(f) {
    const imagem = (f.imagem && f.imagem.trim() !== "")
        ? f.imagem
        : (categorias[f.categoria] || `https://picsum.photos/seed/${f.id}/800/600`);

    const card = document.createElement("div");
    card.className = "cardFrase";
    card.innerHTML = `
        <div class="imagemFrase">
            <img
                loading="lazy"
                crossorigin="anonymous"
                src="${imagem}"
                alt="${f.categoria || 'Frase'}"
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
            <button onclick="mostrarOpcoesDownload(this)">
                📥 Baixar
            </button>
        </div>

        <div class="opcoesDownload" style="display:none; margin-top:10px; text-align:center;">
            <p style="font-size:13px; margin-bottom:5px; font-weight:bold;">Escolha o formato:</p>
            <button onclick="baixarImagem(this, 'story')" style="margin-right:5px; font-size:12px; padding:6px 12px;">📱 Story (9:16)</button>
            <button onclick="baixarImagem(this, 'feed')" style="font-size:12px; padding:6px 12px;">📸 Feed (1:1)</button>
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

function mostrarOpcoesDownload(botao) {
    const card = botao.closest(".cardFrase");
    if (!card) return;
    const opcoes = card.querySelector(".opcoesDownload");
    if (opcoes) {
        opcoes.style.display = opcoes.style.display === "none" ? "block" : "none";
    }
}

function mostrarCategorias() {
    if (!listaCategorias) return;
    listaCategorias.innerHTML = "";

    Object.entries(categorias).forEach(([nome, imagem]) => {
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

        card.onclick = () => {
            mostrarFrases(nome);
            window.scrollTo({
                top: lista.offsetTop - 20,
                behavior: "smooth"
            });
        };

        listaCategorias.appendChild(card);
    });
}

async function curtir(id) {
    try {
        await updateDoc(doc(db, "frases", id), {
            curtidas: increment(1)
        });

        const frase = frases.find(f => f.id === id);
        if (frase) {
            frase.curtidas = Number(frase.curtidas || 0) + 1;
        }

        mostrarFrases(pesquisa?.value || "");
    } catch (e) {
        console.error(e);
        alert("Erro ao curtir.");
    }
}

function favoritar(texto) {
    if (favoritos.includes(texto)) {
        alert("⭐ Essa frase já está nos favoritos.");
        return;
    }

    favoritos.push(texto);
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
    alert("❤️ Adicionado aos favoritos!");
}

async function compartilhar(id, texto) {
    try {
        await updateDoc(doc(db, "frases", id), {
            compartilhamentos: increment(1)
        });

        const frase = frases.find(f => f.id === id);
        if (frase) {
            frase.compartilhamentos = Number(frase.compartilhamentos || 0) + 1;
        }

        if (navigator.share) {
            await navigator.share({
                title: "Frases de Messias",
                text: texto,
                url: location.href
            });
        } else {
            await navigator.clipboard.writeText(texto);
            alert("📋 Frase copiada para compartilhar.");
        }

        mostrarFrases(pesquisa?.value || "");
    } catch (e) {
        console.error(e);
    }
}

async function visualizar(id) {
    const chave = "view_" + id;
    if (localStorage.getItem(chave)) return;

    try {
        await updateDoc(doc(db, "frases", id), {
            visualizacoes: increment(1)
        });

        localStorage.setItem(chave, "1");
        const frase = frases.find(f => f.id === id);
        if (frase) {
            frase.visualizacoes = Number(frase.visualizacoes || 0) + 1;
        }
    } catch (e) {
        console.error(e);
    }
}

async function copiar(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        alert("📋 Frase copiada com sucesso!");
    } catch (e) {
        console.error(e);
        alert("Não foi possível copiar a frase.");
    }
}

// FUNÇÃO DE DOWNLOAD COM DUAS OPÇÕES DE TAMANHO
async function baixarImagem(botao, formato = "story") {
    const card = botao.closest(".cardFrase");
    if (!card) return;

    const btnOpcoes = card.querySelector(".opcoesDownload");
    if (btnOpcoes) btnOpcoes.style.display = "none";

    const textoBotaoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = "⏳ Gerando...";

    let exportacao = null;

    try {
        const imgElement = card.querySelector(".imagemFrase img");
        const imgSrc = imgElement ? imgElement.src : "";
        const texto = card.querySelector(".textoFrase")?.innerText || "";
        const autor = card.querySelector(".autorFrase")?.innerText || "";

        // Dimensões segundo o formato escolhido
        const largura = 1080;
        const altura = formato === "feed" ? 1080 : 1920;
        const tamanhoFonteTexto = formato === "feed" ? "52px" : "70px";
        const tamanhoFonteAutor = formato === "feed" ? "34px" : "42px";
        const tamanhoFonteMarca = formato === "feed" ? "26px" : "34px";

        exportacao = document.createElement("div");
        exportacao.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: ${largura}px;
            height: ${altura}px;
            overflow: hidden;
            background: #111;
            font-family: Arial, sans-serif;
            z-index: -9999;
        `;

        exportacao.innerHTML = `
            <img src="${imgSrc}" crossorigin="anonymous" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; inset:0; background:rgba(0,0,0,.45);"></div>
            <div style="position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:60px; text-align:center; color:white;">
                <div style="font-size:${tamanhoFonteTexto}; font-weight:bold; line-height:1.4;">${texto}</div>
                <div style="margin-top:50px; font-size:${tamanhoFonteAutor};">${autor}</div>
                <div style="position:absolute; bottom:50px; font-size:${tamanhoFonteMarca};">📖 Frases de Messias</div>
            </div>
        `;

        document.body.appendChild(exportacao);

        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(exportacao, {
            useCORS: true,
            allowTaint: true,
            scale: 1,
            backgroundColor: null,
            imageTimeout: 4000
        });

        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));

        if (!blob) throw new Error("Erro ao gerar imagem.");

        const arquivo = new File([blob], `frase-${formato}-${Date.now()}.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
            await navigator.share({
                title: "Frases de Messias",
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

    } catch (e) {
        console.error("Erro ao gerar imagem:", e);
        const textoCard = card.querySelector(".textoFrase")?.innerText || "";
        if (textoCard) {
            await navigator.clipboard.writeText(textoCard);
            alert("⚠️ Não foi possível gerar a imagem, mas copiei o texto da frase para você!");
        } else {
            alert("Erro ao gerar a imagem.");
        }
    } finally {
        if (exportacao && exportacao.parentNode) {
            document.body.removeChild(exportacao);
        }
        botao.disabled = false;
        botao.innerHTML = textoBotaoOriginal;
    }
}

function fraseDoDia() {
    if (!fraseDia || frases.length === 0) return;
    const indice = Math.floor(Math.random() * frases.length);
    fraseDia.textContent = `"${frases[indice].texto}"`;
}

if (temaBtn) {
    if (localStorage.getItem("tema") === "dark") {
        document.body.classList.add("dark");
    }

    temaBtn.onclick = () => {
        document.body.classList.toggle("dark");
        localStorage.setItem(
            "tema",
            document.body.classList.contains("dark") ? "dark" : "light"
        );
    };
}

if (pesquisa) {
    pesquisa.oninput = () => {
        mostrarFrases(pesquisa.value);
    };
}

if (copiarBtn) {
    copiarBtn.onclick = () => {
        if (fraseDia) {
            copiar(fraseDia.textContent.replace(/"/g, ""));
        }
    };
}

window.curtir = curtir;
window.favoritar = favoritar;
window.compartilhar = compartilhar;
window.baixarImagem = baixarImagem;
window.mostrarOpcoesDownload = mostrarOpcoesDownload;
window.visualizar = visualizar;
window.copiar = copiar;

document.addEventListener("DOMContentLoaded", () => {
    carregarFrases();
});

// Service Worker PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado!', reg))
            .catch(err => console.log('Erro no Service Worker:', err));
    });
}

// Gemini IA Integration
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

            const fraseGerada = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar a frase.";

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

// --- SCRIPT PARTE 1 (CORRIGIDO) ---

const frasesParte1 = [
    // --- AMOR ---
    { texto: "O amor verdadeiro não é aquele que se vê, mas o que se sente e se cultiva todos os dias.", autor: "Messias", categoria: "Amor", imagem: "https://picsum.photos/seed/amor1/800/600" },
    { texto: "Amar é encontrar na felicidade do outro a sua própria razão de sorrir.", autor: "Messias", categoria: "Amor", imagem: "https://picsum.photos/seed/amor2/800/600" },
    { texto: "Onde há amor, os dias são mais leves e o coração encontra a sua casa.", autor: "Messias", categoria: "Amor", imagem: "https://picsum.photos/seed/amor3/800/600" },
    { texto: "Cuidar de quem amamos é a forma mais bonita de dizer 'você é importante para mim'.", autor: "Messias", categoria: "Amor", imagem: "https://picsum.photos/seed/amor4/800/600" },
    { texto: "O amor é a ponte que une corações mesmo nas maiores distâncias.", autor: "Messias", categoria: "Amor", imagem: "https://picsum.photos/seed/amor5/800/600" },

    // --- FÉ ---
    { texto: "Mesmo que o caminho pareça incerto, a fé nos dá a certeza de que nunca caminhamos sós.", autor: "Messias", categoria: "Fé", imagem: "https://picsum.photos/seed/fe1/800/600" },
    { texto: "A fé abre portas onde o medo só enxerga barreiras.", autor: "Messias", categoria: "Fé", imagem: "https://picsum.photos/seed/fe2/800/600" },
    { texto: "Quando colocamos nossa confiança em Deus, até as tempestades se tornam aprendizado.", autor: "Messias", categoria: "Fé", imagem: "https://picsum.photos/seed/fe3/800/600" },
    { texto: "A fé não faz as coisas ficarem fáceis, faz elas se tornarem possíveis.", autor: "Messias", categoria: "Fé", imagem: "https://picsum.photos/seed/fe4/800/600" },
    { texto: "Mantenha sua fé firme, pois o que é seu encontrará um jeito de chegar até você.", autor: "Messias", categoria: "Fé", imagem: "https://picsum.photos/seed/fe5/800/600" },

    // --- MOTIVAÇÃO ---
    { texto: "O único limite para os seus objetivos é o tamanho da sua determinação.", autor: "Messias", categoria: "Motivação", imagem: "https://picsum.photos/seed/motivacao1/800/600" },
    { texto: "Não espere o momento perfeito; pegue o momento presente e faça dele algo incrível.", autor: "Messias", categoria: "Motivação", imagem: "https://picsum.photos/seed/motivacao2/800/600" },
    { texto: "Grandes conquistas exigem tempo, paciência e a coragem de dar o primeiro passo.", autor: "Messias", categoria: "Motivação", imagem: "https://picsum.photos/seed/motivacao3/800/600" },
    { texto: "Seja mais forte do que a sua melhor desculpa.", autor: "Messias", categoria: "Motivação", imagem: "https://picsum.photos/seed/motivacao4/800/600" },
    { texto: "Você é capaz de ir muito mais longe do que imagina, basta continuar em frente.", autor: "Messias", categoria: "Motivação", imagem: "https://picsum.photos/seed/motivacao5/800/600" },

    // --- SABEDORIA ---
    { texto: "A sabedoria não está em ter todas as respostas, mas em saber o momento de ouvir.", autor: "Messias", categoria: "Sabedoria", imagem: "https://picsum.photos/seed/sabedoria1/800/600" },
    { texto: "Aprenda com o passado, viva o presente e não se afobe pelo futuro.", autor: "Messias", categoria: "Sabedoria", imagem: "https://picsum.photos/seed/sabedoria2/800/600" },
    { texto: "Quem domina a própria paciência domina quase qualquer situação.", autor: "Messias", categoria: "Sabedoria", imagem: "https://picsum.photos/seed/sabedoria3/800/600" },
    { texto: "Sábio é aquele que transforma pedras no caminho em degraus de crescimento.", autor: "Messias", categoria: "Sabedoria", imagem: "https://picsum.photos/seed/sabedoria4/800/600" },
    { texto: "Saber a hora certa de falar é importante, mas saber a hora de calar é fundamental.", autor: "Messias", categoria: "Sabedoria", imagem: "https://picsum.photos/seed/sabedoria5/800/600" }
];

async function enviarParte1Segura() {
    // Busca as funções globais do Firebase importadas no seu app.js
    const dbInstancia = window.db || db;
    const funcAddDoc = window.addDoc || addDoc;
    const funcCollection = window.collection || collection;

    if (!dbInstancia || !funcAddDoc || !funcCollection) {
        alert("❌ Erro: O Firebase ainda não foi inicializado. Aguarde alguns segundos e tente novamente.");
        return;
    }

    let enviados = 0;
    for (const item of frasesParte1) {
        try {
            await funcAddDoc(funcCollection(dbInstancia, "frases"), {
                texto: item.texto,
                autor: item.autor,
                categoria: item.categoria,
                imagem: item.imagem,
                curtidas: Math.floor(Math.random() * 50) + 10,
                visualizacoes: Math.floor(Math.random() * 300) + 50,
                compartilhamentos: Math.floor(Math.random() * 15) + 2
            });
            enviados++;
        } catch (erro) {
            console.error("Erro no item:", erro);
        }
    }

    if (enviados > 0) {
        alert(`🎉 Sucesso! ${enviados} frases da Parte 1 foram cadastradas.`);
        location.reload();
    } else {
        alert("❌ Ocorreu um erro ao salvar as frases. Verifique o console.");
    }
}

// Criar botão na tela
if (!document.getElementById("btnImportarParte1")) {
    const btn = document.createElement("button");
    btn.id = "btnImportarParte1";
    btn.innerText = "🚀 IMPORTAR PARTE 1";
    btn.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:99999; padding:16px 22px; background:#ffc107; color:#000; font-size:16px; font-weight:bold; border:none; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.5);";
    document.body.appendChild(btn);

    btn.onclick = async () => {
        btn.innerText = "⏳ Cadastrando...";
        btn.disabled = true;
        await enviarParte1Segura();
    };
        }
                
