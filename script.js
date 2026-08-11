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
const gerarIaBtn = document.getElementById("gerarIaBtn");
const promptIA = document.getElementById("promptIA");
const resultadoIA = document.getElementById("resultadoIA");

function mostrarCarregando() {
    if (lista) {
        lista.innerHTML = `
            <div class="loading" style="text-align:center; padding: 30px; font-weight: bold;">
                ⏳ Carregando frases...
            </div>
        `;
    }
}

function mostrarErro(msg) {
    if (lista) {
        lista.innerHTML = `
            <div class="erro" style="text-align:center; padding: 30px; color: #ef4444; font-weight: bold;">
                ${msg}
            </div>
        `;
    }
}

function sanitizarTexto(texto = "") {
    return texto
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu, '')
        .trim();
}

async function contarVisitaGlobal() {
    const chaveVisita = "visita_global_registrada";
    const contadorElemento = document.getElementById("contadorGlobal");
    
    try {
        const docRef = doc(db, "estatisticas", "global");
        
        if (!sessionStorage.getItem(chaveVisita)) {
            await updateDoc(docRef, {
                visitas: increment(1)
            });
            sessionStorage.setItem(chaveVisita, "true");
        }
        
        const consulta = await getDocs(collection(db, "estatisticas"));
        consulta.forEach(d => {
            if (d.id === "global" && contadorElemento) {
                contadorElemento.textContent = Number(d.data().visitas || 0).toLocaleString("pt-BR");
            }
        });
    } catch (e) {
        console.error("Erro ao contar visita global:", e);
    }
}

async function carregarFrases() {
    mostrarCarregando();
    frases = [];
    categorias = {};

    try {
        contarVisitaGlobal();

        // Buscar Categorias no Firestore
        const consultaCategorias = await getDocs(collection(db, "categorias"));
        consultaCategorias.forEach(docSnap => {
            const dados = docSnap.data();
            const nomeLimpo = sanitizarTexto(dados.nome || "");
            if (nomeLimpo) {
                categorias[nomeLimpo] = dados.imagem;
            }
        });

        // Buscar Frases no Firestore
        const consultaFrases = await getDocs(collection(db, "frases"));
        consultaFrases.forEach(docSnap => {
            frases.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

    } catch (e) {
        console.error("Erro no Firebase:", e);
        mostrarErro("Erro ao conectar ao banco de dados. Verifique a conexão.");
        return;
    }

    if (frases.length === 0) {
        mostrarErro("Nenhuma frase cadastrada no momento.");
        return;
    }

    fraseDoDia();
    mostrarCategorias();
    mostrarFrases();
    configurarBotoesCategoriasFixos();
}

function normalizarParaBusca(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function mostrarFrases(filtro = "") {
    if (!lista) return;
    lista.innerHTML = "";
    
    const filtroLimpo = normalizarParaBusca(sanitizarTexto(filtro));

    const resultado = frases.filter(f => {
        if (filtroLimpo === "") return true;
        
        const textoFrase = normalizarParaBusca(f.texto || "");
        const autorFrase = normalizarParaBusca(f.autor || "");
        const categoriaFrase = normalizarParaBusca(sanitizarTexto(f.categoria || ""));

        return (
            textoFrase.includes(filtroLimpo) ||
            autorFrase.includes(filtroLimpo) ||
            categoriaFrase.includes(filtroLimpo)
        );
    });

    if (resultado.length === 0) {
        lista.innerHTML = `
            <div class="semResultado" style="text-align:center; padding: 20px;">
                😔 Nenhuma frase encontrada para a busca realizada.
            </div>
        `;
        return;
    }

    resultado.forEach(criarCardFrase);
}

function criarCardFrase(f) {
    const categoriaLimpa = sanitizarTexto(f.categoria || "");
    const larguraImg = window.innerWidth < 600 ? 400 : 800;
    const alturaImg = window.innerWidth < 600 ? 300 : 600;
    
    const imagem = (f.imagem && f.imagem.trim() !== "")
        ? f.imagem
        : (categorias[categoriaLimpa] || `https://picsum.photos/seed/${f.id}/${larguraImg}/${alturaImg}`);

    const card = document.createElement("div");
    card.className = "cardFrase";
    card.innerHTML = `
        <div class="imagemFrase">
            <img
                loading="lazy"
                crossorigin="anonymous"
                src="${imagem}"
                alt="${categoriaLimpa || 'Frase'}"
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
            <button onclick="curtir('${f.id}')">❤️ Curtir</button>
            <button onclick='favoritar(${JSON.stringify(f.texto)})'>⭐ Favoritar</button>
            <button onclick='copiar(${JSON.stringify(f.texto)})'>📋 Copiar</button>
            <button onclick='compartilhar("${f.id}",${JSON.stringify(f.texto)})'>📤 Compartilhar</button>
            <button onclick="mostrarOpcoesDownload(this)">📥 Baixar</button>
        </div>

        <div class="opcoesDownload" style="display:none; margin-top:10px; text-align:center;">
            <p style="font-size:13px; margin-bottom:5px; font-weight:bold;">Escolha o formato:</p>
            <button onclick="baixarImagem(this, 'story')" style="margin-right:5px; font-size:12px; padding:6px 12px;">📱 Story (9:16)</button>
            <button onclick="baixarImagem(this, 'feed')" style="font-size:12px; padding:6px 12px;">📸 Feed (1:1)</button>
            <button onclick="gerarVideo(this, 'story')" style="margin-top:8px; margin-right:5px; font-size:12px; padding:6px 12px; background:#ff6b6b; color:white; border:none; border-radius:4px; cursor:pointer;">🎬 Vídeo Story</button>
            <button onclick="gerarVideo(this, 'feed')" style="margin-top:8px; font-size:12px; padding:6px 12px; background:#ff6b6b; color:white; border:none; border-radius:4px; cursor:pointer;">🎬 Vídeo Feed</button>
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

function configurarBotoesCategoriasFixos() {
    const botoes = document.querySelectorAll(".grid-botoes .btn-categoria");
    botoes.forEach(btn => {
        btn.onclick = () => {
            const cat = btn.getAttribute("data-categoria") || btn.innerText;
            if (pesquisa) pesquisa.value = sanitizarTexto(cat);
            mostrarFrases(cat);
            
            const offset = lista.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({ top: offset, behavior: "smooth" });
        };
    });
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

    Object.keys(categorias).forEach((nome) => {
        const btn = document.createElement("button");
        btn.className = "btn-categoria";
        btn.textContent = nome;

        btn.onclick = () => {
            const categoriaLimpa = sanitizarTexto(nome);
            if (pesquisa) pesquisa.value = categoriaLimpa;
            mostrarFrases(categoriaLimpa);

            const offset = lista.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({
                top: offset,
                behavior: "smooth"
            });
        };

        listaCategorias.appendChild(btn);
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

// DOWNLOAD DE IMAGEM
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

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `frase-${formato}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Erro ao gerar imagem:", e);
        const textoCard = card.querySelector(".textoFrase")?.innerText || "";
        if (textoCard) {
            await navigator.clipboard.writeText(textoCard);
            alert("⚠️ Não foi possível gerar a imagem, mas o texto da frase foi copiado!");
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

// ==========================================
// GERAR VÍDEO DA FRASE
// ==========================================

async function gerarVideo(botao, formato = "story") {

    const card = botao.closest(".cardFrase");

    if (!card) return;

    const btnOpcoes = card.querySelector(".opcoesDownload");

    if (btnOpcoes) {
        btnOpcoes.style.display = "none";
    }

    const textoOriginal = botao.innerHTML;

    botao.disabled = true;
    botao.innerHTML = "⏳ Criando vídeo...";

    let stream = null;

    try {

        // -------------------------------
        // PEGAR DADOS DO CARD
        // -------------------------------

        const imagemElemento =
            card.querySelector(".imagemFrase img");

        const textoElemento =
            card.querySelector(".textoFrase");

        const autorElemento =
            card.querySelector(".autorFrase");

        const texto =
            textoElemento?.innerText
            ?.replace(/^["']|["']$/g, "")
            .trim() || "";

        const autor =
            autorElemento?.innerText || "— Messias";

        const imagemURL =
            imagemElemento?.src || "";

        if (!texto) {
            throw new Error("A frase não foi encontrada.");
        }

        // -------------------------------
        // TAMANHO DO VÍDEO
        // -------------------------------

        const largura = 1080;

        const altura =
            formato === "feed"
                ? 1080
                : 1920;

        const canvas =
            document.createElement("canvas");

        canvas.width = largura;
        canvas.height = altura;

        const ctx =
            canvas.getContext("2d");

        // -------------------------------
        // VERIFICAR SUPORTE
        // -------------------------------

        if (!canvas.captureStream) {

            throw new Error(
                "Seu navegador não suporta geração de vídeo."
            );

        }

        if (typeof MediaRecorder === "undefined") {

            throw new Error(
                "Seu navegador não suporta gravação de vídeo."
            );

        }

        // -------------------------------
        // CARREGAR IMAGEM
        // -------------------------------

        const imagem =
            new Image();

        imagem.crossOrigin = "anonymous";

        await new Promise((resolve, reject) => {

            imagem.onload = resolve;

            imagem.onerror = () => {

                reject(
                    new Error(
                        "Não foi possível carregar a imagem da frase."
                    )
                );

            };

            imagem.src = imagemURL;

        });

        // -------------------------------
        // STREAM
        // -------------------------------

        stream =
            canvas.captureStream(30);

        // -------------------------------
        // ESCOLHER FORMATO
        // -------------------------------

        let mimeType = "";

        const formatos = [

            "video/webm;codecs=vp9",

            "video/webm;codecs=vp8",

            "video/webm"

        ];

        for (const formatoVideo of formatos) {

            if (
                MediaRecorder.isTypeSupported(
                    formatoVideo
                )
            ) {

                mimeType =
                    formatoVideo;

                break;

            }

        }

        if (!mimeType) {

            throw new Error(
                "Seu navegador não suporta um formato de vídeo compatível."
            );

        }

        // -------------------------------
        // GRAVADOR
        // -------------------------------

        const partes = [];

        const recorder =
            new MediaRecorder(
                stream,
                {
                    mimeType: mimeType,
                    videoBitsPerSecond: 5_000_000
                }
            );

        recorder.ondataavailable =
            evento => {

                if (
                    evento.data &&
                    evento.data.size > 0
                ) {

                    partes.push(
                        evento.data
                    );

                }

            };

        // -------------------------------
        // INICIAR GRAVAÇÃO
        // -------------------------------

        recorder.start();

        const duracao = 10000;

        const inicio =
            performance.now();

        // -------------------------------
        // DESENHAR TEXTO
        // -------------------------------

        function quebrarTexto(
            texto,
            larguraMaxima
        ) {

            const palavras =
                texto.split(/\s+/);

            const linhas = [];

            let linha = "";

            for (
                const palavra of palavras
            ) {

                const teste =
                    linha
                        ? linha + " " + palavra
                        : palavra;

                const larguraTexto =
                    ctx.m
