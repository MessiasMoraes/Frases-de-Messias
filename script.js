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

// --- SCRIPT PARTE 2 CORRIGIDO E PRONTO ---

const frasesParte2 = [
    // --- BOM DIA (25 Frases) ---
    { texto: "Que o seu dia comece com um sorriso e continue com paz no coração.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia1/800/600" },
    { texto: "Cada amanhecer é um convite da vida para recomeçar com alegria.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia2/800/600" },
    { texto: "Bom dia! Que as alegrias de hoje superem qualquer preocupação de ontem.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia3/800/600" },
    { texto: "Que a luz deste novo dia ilumine os seus passos e suas escolhas.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia4/800/600" },
    { texto: "Acorde com a determinação de transformar este dia em algo extraordinário.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia5/800/600" },
    { texto: "Que a sua manhã seja leve, produtiva e cheia de boas energias.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia6/800/600" },
    { texto: "Tenha um bom dia! Confie que coisas incríveis estão a caminho.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia7/800/600" },
    { texto: "O segredo de um bom dia é agradecer antes mesmo das bênçãos chegarem.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia8/800/600" },
    { texto: "Sorria! Hoje é mais uma oportunidade perfeita para ser feliz.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia9/800/600" },
    { texto: "Que o seu café seja forte e o seu dia abençoado.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia10/800/600" },
    { texto: "Um novo dia se renova. Deixe para trás tudo o que não te faz bem.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia11/800/600" },
    { texto: "Bom dia! Espalhe gentileza e colha sorrisos pelo caminho.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia12/800/600" },
    { texto: "Que a paz seja a sua melhor companhia durante todo este dia.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia13/800/600" },
    { texto: "Cada manhã traz consigo o presente de um recomeço.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia14/800/600" },
    { texto: "Bom dia! Mantenha o foco nos seus objetivos e nada te parará.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia15/800/600" },
    { texto: "Que o sol ilumine sua alma e renove suas esperanças nesta manhã.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia16/800/600" },
    { texto: "Nenhum dia é igual ao outro quando colocamos amor no que fazemos.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia17/800/600" },
    { texto: "Bom dia! Vá com fé, sabedoria e muita vontade de vencer.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia18/800/600" },
    { texto: "Aproveite as pequenas coisas deste dia com profunda gratidão.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia19/800/600" },
    { texto: "Que seu dia seja tão lindo quanto o carinho que você espalha.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia20/800/600" },
    { texto: "Bom dia! O sucesso pertence àqueles que não têm medo de tentar.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia21/800/600" },
    { texto: "Acredite nas suas capacidades e faça deste dia o seu melhor momento.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia22/800/600" },
    { texto: "Bom dia! Que a serenidade te acompanhe do amanhecer ao anoitecer.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia23/800/600" },
    { texto: "Abra a janela, respire fundo e agradeça por mais um dia de vida.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia24/800/600" },
    { texto: "Que a felicidade seja a prioridade absoluta da sua jornada hoje.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia25/800/600" },

    // --- BOA NOITE (25 Frases) ---
    { texto: "Acalme a sua mente, descanse o seu corpo e confie no amanhã.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite1/800/600" },
    { texto: "Boa noite! Que as estrelas tragam tranquilidade para os seus sonhos.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite2/800/600" },
    { texto: "Entregue os seus cansaços a Deus e renove suas energias durante a noite.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite3/800/600" },
    { texto: "Que a paz seja o travesseiro onde você irá repousar nesta noite.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite4/800/600" },
    { texto: "Feche os olhos com gratidão por tudo o que foi vivido hoje.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite5/800/600" },
    { texto: "Boa noite! O silêncio da noite traz as respostas que a alma precisa.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite6/800/600" },
    { texto: "Desconecte-se do mundo e conecte-se com a sua paz interior.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite7/800/600" },
    { texto: "Que o seu sono seja leve, reparador e abençoado.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite8/800/600" },
    { texto: "Boa noite! Amanhã é uma nova oportunidade para continuar tentando.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite9/800/600" },
    { texto: "Guarde as boas lembranças do dia e deixe o resto ir embora com a noite.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite10/800/600" },
    { texto: "Que os anjos zelem pelo seu descanso e tragam lindos sonhos.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite11/800/600" },
    { texto: "Boa noite! Confie que o amanhã guarda coisas preparadas sob medida para você.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite12/800/600" },
    { texto: "Nada como o descanso da noite para restaurar nossa coragem.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite13/800/600" },
    { texto: "Apague as luzes, desacelere os pensamentos e apenas descanse.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite14/800/600" },
    { texto: "Boa noite! Que a serenidade embale o seu sono e acalme o coração.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite15/800/600" },
    { texto: "A gratidão torna o nosso descanso infinitamente mais suave.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite16/800/600" },
    { texto: "Que você acorde revigorado para abraçar as vitórias do amanhã.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite17/800/600" },
    { texto: "Boa noite! A esperança é o último farol que ilumina a escuridão.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite18/800/600" },
    { texto: "Sinta o abraço acolhedor desta noite e relaxe completamente.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite19/800/600" },
    { texto: "Que a doçura dos sonhos traga alívio para qualquer ansiedade.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite20/800/600" },
    { texto: "Boa noite! Lembre-se: você deu o seu melhor hoje.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite21/800/600" },
    { texto: "O descanso é parte essencial para podermos continuar nossa caminhada.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite22/800/600" },
    { texto: "Que a sua noite seja cercada de luz, paz e pensamentos positivos.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite23/800/600" },
    { texto: "Durma bem e saiba que amanhã tudo estará em seu devido lugar.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite24/800/600" },
    { texto: "Boa noite! Que a quietude das horas revele a beleza do descanso.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite25/800/600" },

    // --- ESPERANÇA (25 Frases) ---
    { texto: "A esperança é a luz que nos guia mesmo no túnel mais escuro.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca1/800/600" },
    { texto: "Enquanto houver um novo amanhecer, haverá motivos para ter esperança.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca2/800/600" },
    { texto: "Acredite: coisas boas acontecem quando a gente mantém a fé acesa.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca3/800/600" },
    { texto: "A esperança renova as forças para encarar os dias mais desafiadores.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca4/800/600" },
    { texto: "Nunca perca a esperança; o sol sempre volta a brilhar após a chuva.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca5/800/600" },
    { texto: "A esperança não é ilusão; é o combustível de quem recusa desistir.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca6/800/600" },
    { texto: "Semeie esperança por onde passar e colherá caminhos florescidos.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca7/800/600" },
    { texto: "Dias melhores não são apenas um desejo, são uma promessa do tempo.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca8/800/600" },
    { texto: "Guarde a esperança como quem guarda um tesouro valioso na alma.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca9/800/600" },
    { texto: "O impossível de hoje é apenas a conquista de amanhã.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca10/800/600" },

    // --- GRATIDÃO (25 Frases) ---
    { texto: "A gratidão transforma o que temos em mais do que suficiente.", autor: "Messias", categoria: "Gratidão", imagem: "https://picsum.photos/seed/gratidao1/800/600" },
    { texto: "Agradecer abre portas para que novas bênçãos encontrem você.", autor: "Messias", categoria: "Gratidão", imagem: "https://picsum.photos/seed/gratidao2/800/600" },
    { texto: "Corações gratos são ímãs para momentos de pura paz e felicidade.", autor: "Messias", categoria: "Gratidão", imagem: "https://picsum.photos/seed/gratidao3/800/600" },
    { texto: "A gratidão é a memória de um coração nobre e acolhedor.", autor: "Messias", categoria: "Gratidão", imagem: "https://picsum.photos/seed/gratidao4/800/600" },
    { texto: "Agradeço pelo hoje, aprendo com o ontem e confio no amanhã.", autor: "Messias", categoria: "Gratidão", imagem: "https://picsum.photos/seed/gratidao5/800/600" }
];

 // --- SCRIPT PARTE 2 DIRECT FETCH (SEM TRAVAR) ---

const projectId = "SEU_PROJECT_ID_AQUI"; // ⚠️ Substitua pelo ID do seu projeto do Firebase (ex: "frases-de-messias")

const frasesParte2 = [
    // --- BOM DIA ---
    { texto: "Que o seu dia comece com um sorriso e continue com paz no coração.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia1/800/600" },
    { texto: "Cada amanhecer é um convite da vida para recomeçar com alegria.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia2/800/600" },
    { texto: "Bom dia! Que as alegrias de hoje superem qualquer preocupação de ontem.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia3/800/600" },
    { texto: "Que a luz deste novo dia ilumine os seus passos e suas escolhas.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia4/800/600" },
    { texto: "Acorde com a determinação de transformar este dia em algo extraordinário.", autor: "Messias", categoria: "Bom Dia", imagem: "https://picsum.photos/seed/bomdia5/800/600" },

    // --- BOA NOITE ---
    { texto: "Acalme a sua mente, descanse o seu corpo e confie no amanhã.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite1/800/600" },
    { texto: "Boa noite! Que as estrelas tragam tranquilidade para os seus sonhos.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite2/800/600" },
    { texto: "Entregue os seus cansaços a Deus e renove suas energias durante a noite.", autor: "Messias", categoria: "Boa Noite", imagem: "https://picsum.photos/seed/noite3/800/600" },

    // --- ESPERANÇA ---
    { texto: "A esperança é a luz que nos guia mesmo no túnel mais escuro.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca1/800/600" },
    { texto: "Enquanto houver um novo amanhecer, haverá motivos para ter esperança.", autor: "Messias", categoria: "Esperança", imagem: "https://picsum.photos/seed/esperanca2/800/600" },

    // --- GRATIDÃO ---
    { texto: "A gratidão transforma o que temos em mais do que suficiente.", autor: "Messias", categoria: "Gratidão", imagem: "https://picsum.photos/seed/gratidao1/800/600" },
    { texto: "Agradecer abre portas para que novas bênçãos encontrem você.", autor: "Messias", categoria: "Gratidão", imagem: "https://picsum.photos/seed/gratidao2/800/600" }
];

async function enviarViaModulo() {
    try {
        // Usa a coleção e o addDoc que já existem no seu app.js
        for (const item of frasesParte2) {
            await addDoc(collection(db, "frases"), {
                texto: item.texto,
                autor: item.autor,
                categoria: item.categoria,
                imagem: item.imagem,
                curtidas: Math.floor(Math.random() * 50) + 10,
                visualizacoes: Math.floor(Math.random() * 300) + 50,
                compartilhamentos: Math.floor(Math.random() * 15) + 2
            });
        }
        alert("🎉 Parte 2 cadastrada com sucesso no Firebase!");
        location.reload(); // Recarrega para ver as frases novas!
    } catch (erro) {
        alert("❌ Erro ao enviar: " + erro.message);
        console.error(erro);
    }
}

// Botão Flutuante
if (!document.getElementById("btnImportarParte2")) {
    const btn = document.createElement("button");
    btn.id = "btnImportarParte2";
    btn.innerText = "🚀 CLIQUE PARA IMPORTAR";
    btn.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:99999; padding:16px 22px; background:#28a745; color:white; font-size:16px; font-weight:bold; border:none; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.5);";
    document.body.appendChild(btn);

    btn.onclick = async () => {
        btn.innerText = "⏳ Cadastrando...";
        btn.disabled = true;
        await enviarViaModulo();
    };
     }
    
