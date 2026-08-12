import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

let frases = [];
let categorias = {};
let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];

// ======================
// FUNÇÕES AUXILIARES
// ======================
function mostrarCarregando(lista) {
    if (lista) {
        lista.innerHTML = `
            <div class="loading" style="text-align:center; padding: 30px; font-weight: bold;">
                ⏳ Carregando frases...
            </div>
        `;
    }
}

function mostrarErro(lista, msg) {
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

function normalizarParaBusca(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Converte imagens antigas do GitHub Pages para o mesmo domínio atual.
// Assim o html2canvas consegue ler a imagem sem bloqueio de CORS.
function normalizarUrlImagem(url = "") {
    const valor = String(url || "").trim();
    if (!valor) return "";
    try {
        const origem = new URL(valor, window.location.href);
        if (origem.hostname === "messiasmoraes.github.io" && origem.pathname.startsWith("/Frases-de-Messias/")) {
            origem.pathname = origem.pathname.replace(/^\/Frases-de-Messias\//, "/");
            origem.protocol = window.location.protocol;
            origem.host = window.location.host;
        }
        return origem.href;
    } catch (_) {
        return valor;
    }
}

// ======================
// FRASE DO DIA
// ======================
function fraseDoDia(fraseDiaElemento) {
    if (!fraseDiaElemento || frases.length === 0) return;
    const indice = Math.floor(Math.random() * frases.length);
    const f = frases[indice];
    fraseDiaElemento.innerHTML = `"${f.texto}" — ${f.autor || "Messias"}`;
}

// ======================
// CONTADOR DE VISITAS
// ======================
async function contarVisitaGlobal() {
    const chaveVisita = "visita_global_registrada";
    const contadorElemento = document.getElementById("contadorGlobal");
    
    try {
        const docRef = doc(db, "estatisticas", "global");
        
        if (!sessionStorage.getItem(chaveVisita)) {
            await updateDoc(docRef, { visitas: increment(1) });
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

// ======================
// CARREGAR DADOS
// ======================
async function carregarFrases(lista, fraseDiaElemento, listaCategorias, pesquisa) {
    mostrarCarregando(lista);
    frases = [];
    categorias = {};

    try {
        contarVisitaGlobal();

        // Buscar Categorias
        const consultaCategorias = await getDocs(collection(db, "categorias"));
        consultaCategorias.forEach(docSnap => {
            const dados = docSnap.data();
            const nomeLimpo = sanitizarTexto(dados.nome || "");
            if (nomeLimpo) {
                categorias[nomeLimpo] = dados.imagem;
            }
        });

        // Buscar Frases
        const consultaFrases = await getDocs(collection(db, "frases"));
        consultaFrases.forEach(docSnap => {
            frases.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

    } catch (e) {
        console.error("Erro no Firebase:", e);
        mostrarErro(lista, "Erro ao conectar ao banco de dados. Verifique a conexão.");
        return;
    }

    if (frases.length === 0) {
        mostrarErro(lista, "Nenhuma frase cadastrada no momento.");
        return;
    }

    fraseDoDia(fraseDiaElemento);
    mostrarCategorias(listaCategorias, pesquisa, lista);
    mostrarFrases(lista, "");
}

// ======================
// MOSTRAR FRASES
// ======================
function mostrarFrases(lista, filtro = "") {
    if (!lista) return;
    lista.innerHTML = "";
    
    const filtroLimpo = normalizarParaBusca(sanitizarTexto(filtro));

    const resultado = frases.filter(f => {
        if (filtroLimpo === "") return true;
        
        const textoFrase = normalizarParaBusca(f.texto || "");
        const autorFrase = normalizarParaBusca(f.autor || "");
        const categoriaFrase = normalizarParaBusca(sanitizarTexto(f.categoria || ""));

        return textoFrase.includes(filtroLimpo) || autorFrase.includes(filtroLimpo) || categoriaFrase.includes(filtroLimpo);
    });

    if (resultado.length === 0) {
        lista.innerHTML = `
            <div class="semResultado" style="text-align:center; padding: 20px;">
                😔 Nenhuma frase encontrada para a busca realizada.
            </div>
        `;
        return;
    }

    resultado.forEach(f => criarCardFrase(f, lista));
}

// ======================
// CRIAR CARD
// ======================
function criarCardFrase(f, lista) {
    const categoriaLimpa = sanitizarTexto(f.categoria || "");
    const larguraImg = window.innerWidth < 600 ? 400 : 800;
    const alturaImg = window.innerWidth < 600 ? 300 : 600;
    const semente = f.id || "frase-padrao";
    
    const imagem = normalizarUrlImagem((f.imagem && f.imagem.trim() !== "")
        ? f.imagem
        : (categorias[categoriaLimpa] || `https://picsum.photos/seed/${encodeURIComponent(semente)}/${larguraImg}/${alturaImg}`));

    const card = document.createElement("div");
    card.className = "cardFrase";
    card.innerHTML = `
        <div class="imagemFrase">
            <img src="${imagem}" alt="Frase de Messias" loading="lazy">
            <div class="overlay">
                <p class="textoFrase">"${f.texto}"</p>
                <p class="autorFrase">— ${f.autor || "Messias"}</p>
                <div class="marca">📖 Frases de Messias</div>
            </div>
        </div>
        <div class="botoes">
            <button onclick="curtir('${f.id}')">❤️ Curtir</button>
            <button onclick="copiar('${f.texto.replace(/'/g, "\\'")}')">📋 Copiar</button>
            <button onclick="compartilhar('${f.id}', '${f.texto.replace(/'/g, "\\'")}')">📤 Compartilhar</button>
            <button type="button" class="btn-baixar" onclick="mostrarOpcoesDownload(this)" aria-expanded="false">📥 Baixar</button>
        </div>
        <div class="opcoesDownload" hidden style="margin-top:10px; text-align:center;">
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

// ======================
// CATEGORIAS
// ======================
function mostrarCategorias(listaCategorias, pesquisa, lista) {
    if (!listaCategorias) return;
    listaCategorias.innerHTML = "";

    Object.keys(categorias).forEach((nome) => {
        const btn = document.createElement("button");
        btn.className = "btn-categoria";
        btn.textContent = nome;
        btn.onclick = () => {
            const categoriaLimpa = sanitizarTexto(nome);
            if (pesquisa) pesquisa.value = categoriaLimpa;
            mostrarFrases(lista, categoriaLimpa);
            const offset = lista.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({ top: offset, behavior: "smooth" });
        };
        listaCategorias.appendChild(btn);
    });
}

function configurarBotoesCategoriasFixos(pesquisa, lista) {
    const botoes = document.querySelectorAll(".grid-botoes .btn-categoria");
    botoes.forEach(btn => {
        btn.onclick = () => {
            const cat = btn.getAttribute("data-categoria") || btn.innerText;
            if (pesquisa) pesquisa.value = sanitizarTexto(cat);
            mostrarFrases(lista, cat);
            const offset = lista.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({ top: offset, behavior: "smooth" });
        };
    });
}

// ======================
// FUNÇÕES GLOBAIS
// ======================
window.curtir = async function(id) {
    const chaveLike = "like_" + id;
    if (localStorage.getItem(chaveLike)) {
        alert("Você já curtiu esta frase!");
        return;
    }
    try {
        await updateDoc(doc(db, "frases", id), { curtidas: increment(1) });
        localStorage.setItem(chaveLike, "1");
        const frase = frases.find(f => f.id === id);
        if (frase) {
            frase.curtidas = Number(frase.curtidas || 0) + 1;
        }
        mostrarFrases(document.getElementById("listaFrases"), document.getElementById("pesquisa")?.value || "");
        alert("❤️ Curtida registrada com sucesso!");
    } catch (e) {
        console.error("Erro ao curtir:", e);
        alert("Não foi possível registrar a curtida.");
    }
};

window.compartilhar = async function(id, texto) {
    try {
        await updateDoc(doc(db, "frases", id), { compartilhamentos: increment(1) });
        const frase = frases.find(f => f.id === id);
        if (frase) frase.compartilhamentos = Number(frase.compartilhamentos || 0) + 1;

        if (navigator.share) {
            await navigator.share({ title: "Frases de Messias", text: texto, url: location.href });
        } else {
            await navigator.clipboard.writeText(texto);
            alert("📋 Frase copiada para compartilhar.");
        }
        mostrarFrases(document.getElementById("listaFrases"), document.getElementById("pesquisa")?.value || "");
    } catch (e) {
        console.error(e);
    }
};

window.copiar = async function(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        alert("📋 Frase copiada com sucesso!");
    } catch (e) {
        console.error(e);
        alert("Não foi possível copiar a frase.");
    }
};

window.mostrarOpcoesDownload = function(botao) {
    const card = botao.closest(".cardFrase");
    if (!card) return;
    const opcoes = card.querySelector(".opcoesDownload");
    if (!opcoes) return;

    const abrir = opcoes.hidden;
    opcoes.hidden = !abrir;
    opcoes.classList.toggle("aberta", abrir);
    botao.setAttribute("aria-expanded", String(abrir));

    if (abrir) {
        requestAnimationFrame(() => opcoes.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }
};

async function visualizar(id) {
    const chave = "view_" + id;
    if (localStorage.getItem(chave)) return;
    try {
        await updateDoc(doc(db, "frases", id), { visualizacoes: increment(1) });
        localStorage.setItem(chave, "1");
        const frase = frases.find(f => f.id === id);
        if (frase) frase.visualizacoes = Number(frase.visualizacoes || 0) + 1;
    } catch (e) {
        console.error(e);
    }
}

// ======================
// DOWNLOAD DE IMAGEM
// ======================
window.baixarImagem = async function(botao, formato = "story") {
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
        let imgSrc = normalizarUrlImagem(imgElement ? (imgElement.currentSrc || imgElement.src) : "");
        if (!imgSrc) throw new Error("A imagem da frase não foi encontrada.");
        const texto = card.querySelector(".textoFrase")?.innerText || "";
        const autor = card.querySelector(".autorFrase")?.innerText || "";
        const largura = 1080;
        const altura = formato === "feed" ? 1080 : 1920;
        const tamanhoFonteTexto = formato === "feed" ? "52px" : "70px";
        const tamanhoFonteAutor = formato === "feed" ? "34px" : "42px";
        const tamanhoFonteMarca = formato === "feed" ? "26px" : "34px";

        exportacao = document.createElement("div");
        exportacao.style.cssText = `position:fixed;left:-9999px;top:0;width:${largura}px;height:${altura}px;overflow:hidden;background:#111;font-family:Arial,sans-serif;z-index:-9999;`;
        exportacao.innerHTML = `
            <img src="${imgSrc}" crossorigin="anonymous" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
            <div style="position:absolute;inset:0;background:rgba(0,0,0,.45);"></div>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px;text-align:center;color:white;">
                <div style="font-size:${tamanhoFonteTexto};font-weight:bold;line-height:1.4;">${texto}</div>
                <div style="margin-top:50px;font-size:${tamanhoFonteAutor};">${autor}</div>
                <div style="position:absolute;bottom:50px;font-size:${tamanhoFonteMarca};">📖 Frases de Messias</div>
            </div>
        `;
        document.body.appendChild(exportacao);
        const imagemExportacao = exportacao.querySelector("img");
        if (imagemExportacao) {
            imagemExportacao.crossOrigin = "anonymous";
            await new Promise((resolve, reject) => {
                const concluir = () => resolve();
                imagemExportacao.addEventListener("load", concluir, { once: true });
                imagemExportacao.addEventListener("error", () => reject(new Error("Não foi possível carregar a imagem original.")), { once: true });
                if (imagemExportacao.complete) {
                    if (imagemExportacao.naturalWidth > 0) concluir();
                    else reject(new Error("A imagem original está indisponível."));
                }
            });
        }

        if (typeof html2canvas === "undefined") {
            throw new Error("Biblioteca html2canvas não carregada.");
        }

        const canvas = await html2canvas(exportacao, {
            useCORS: true, allowTaint: false, scale: 1, backgroundColor: "#111111", imageTimeout: 8000
        });

        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("Erro ao gerar imagem.");

        const url = URL.createObjectURL(blob);
        
        // Em vez de forçar download, mostra a imagem para o usuário salvar manualmente
        // Isso resolve bloqueios de download em celulares
        const modalDownload = document.createElement("div");
        modalDownload.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;color:white;text-align:center;";
        modalDownload.innerHTML = `
            <p style="margin-bottom:15px; font-weight:bold;">✨ Imagem Gerada!</p>
            <img src="${url}" style="max-width:100%; max-height:65vh; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.5); margin-bottom:14px;">
            <a href="${url}" download="frase-${formato}-${Date.now()}.png" style="display:inline-block; padding:12px 22px; background:#2563eb; color:white; text-decoration:none; border-radius:8px; font-weight:bold; margin-bottom:14px;">⬇️ Baixar imagem</a>
            <p style="font-size:14px; margin:0 0 16px;">No celular, se a imagem abrir em vez de baixar, pressione-a e escolha <b>Salvar imagem</b>.</p>
            <button onclick="URL.revokeObjectURL('${url}'); this.parentElement.remove()" style="padding:10px 25px; background:#ef4444; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">Fechar</button>
        `;
        document.body.appendChild(modalDownload);

    } catch (e) {
        console.error("Erro ao gerar imagem:", e);
        const textoCard = card.querySelector(".textoFrase")?.innerText || "";
        if (textoCard) {
            await navigator.clipboard.writeText(textoCard);
            alert("⚠️ Não foi possível gerar a imagem, mas o texto foi copiado!");
        } else {
            alert("Erro ao gerar a imagem. Verifique se incluiu a biblioteca html2canvas.");
        }
    } finally {
        if (exportacao && exportacao.parentNode) document.body.removeChild(exportacao);
        botao.disabled = false;
        botao.innerHTML = textoBotaoOriginal;
    }
};

// ======================
// MODO CINEMA E DOWNLOAD MP4
// ======================
function mostrarErroVideo(mensagem) {
    const texto = mensagem || "Não foi possível gerar o vídeo agora.";
    alert(`⚠️ ${texto}`);
}

function mostrarMp4Gerado(url, filename, formato) {
    const modal = document.createElement("div");
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;color:#fff;text-align:center;overflow:auto;";

    const titulo = document.createElement("p");
    titulo.textContent = `✅ Vídeo MP4 ${formato === "feed" ? "Feed" : "Story"} pronto!`;
    titulo.style.cssText = "font-weight:bold;font-size:18px;margin:0 0 14px;";

    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.style.cssText = `max-width:100%;max-height:62vh;object-fit:contain;border-radius:10px;${formato === "feed" ? "aspect-ratio:1/1;" : "aspect-ratio:9/16;"}`;

    const baixar = document.createElement("a");
    baixar.href = url;
    baixar.download = filename;
    baixar.target = "_blank";
    baixar.rel = "noopener";
    baixar.textContent = "⬇️ Baixar MP4";
    baixar.style.cssText = "display:inline-block;margin-top:18px;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;";

    const ajuda = document.createElement("p");
    ajuda.textContent = "Se o iPhone abrir o vídeo em vez de salvar, toque em Compartilhar e escolha Salvar em Arquivos ou Salvar Vídeo.";
    ajuda.style.cssText = "font-size:13px;line-height:1.4;max-width:360px;margin:14px 0;";

    const fechar = document.createElement("button");
    fechar.type = "button";
    fechar.textContent = "Fechar";
    fechar.style.cssText = "padding:10px 24px;background:#ef4444;color:#fff;border:0;border-radius:6px;font-weight:bold;";
    fechar.onclick = () => modal.remove();

    modal.append(titulo, video, baixar, ajuda, fechar);
    document.body.appendChild(modal);
}

window.gerarVideo = async function(botao, formato = "story") {
    const card = botao.closest(".cardFrase");
    if (!card) return;

    const imgElement = card.querySelector(".imagemFrase img");
    const imageUrl = imgElement?.currentSrc || imgElement?.src || "";
    const texto = card.querySelector(".textoFrase")?.innerText?.trim() || "";
    const autor = card.querySelector(".autorFrase")?.innerText?.trim() || "— Messias";
    const textoOriginal = botao.innerHTML;

    if (!imageUrl || !texto) {
        mostrarErroVideo("A frase ou a imagem não foi encontrada neste card.");
        return;
    }

    botao.disabled = true;
    botao.innerHTML = "⏳ Gerando MP4...";
    try {
        const response = await fetch("/api/video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl, texto, autor, formato })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok || !data.url) {
            throw new Error(data.error || `Falha HTTP ${response.status}.`);
        }
        mostrarMp4Gerado(data.url, data.filename || `frases-de-messias-${formato}.mp4`, formato);
    } catch (error) {
        console.error("Erro ao gerar MP4:", error);
        mostrarErroVideo(error.message);
    } finally {
        botao.disabled = false;
        botao.innerHTML = textoOriginal;
    }
};

// Pré-visualização local continua disponível para teste e fallback visual.
window.abrirModoCinema = function(card, formato = "story") {
    const imgSrc = card?.querySelector(".imagemFrase img")?.src || "";
    const texto = card?.querySelector(".textoFrase")?.innerText || "";
    const autor = card?.querySelector(".autorFrase")?.innerText || "";
    const overlay = document.getElementById("modoCinema");
    const bg = document.getElementById("cinemaBackground");
    const txt = document.getElementById("cinemaTexto");
    const aut = document.getElementById("cinemaAutor");
    if (!overlay || !bg || !txt || !aut) return;
    bg.style.backgroundImage = `url('${imgSrc}')`;
    txt.innerText = texto;
    aut.innerText = autor;
    const content = overlay.querySelector(".cinema-content");
    if (formato === "feed") {
        const tamanhoFeed = "min(100%, 80vh)";
        content.style.aspectRatio = "1 / 1";
        content.style.width = tamanhoFeed;
        content.style.height = tamanhoFeed;
        content.style.flex = "0 0 auto";
        content.style.maxHeight = "none";
        content.style.margin = "auto";
    } else {
        content.style.aspectRatio = "auto";
        content.style.width = "100%";
        content.style.height = "100%";
        content.style.flex = "1 1 auto";
        content.style.maxHeight = "100%";
        content.style.margin = "0";
    }
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
    txt.style.animation = "none";
    aut.style.animation = "none";
    bg.style.animation = "none";
    setTimeout(() => {
        txt.style.animation = "";
        aut.style.animation = "";
        bg.style.animation = "";
    }, 10);
};

window.fecharModoCinema = function() {
    const overlay = document.getElementById("modoCinema");
    if (overlay) {
        overlay.style.display = "none";
        document.body.style.overflow = "auto";
        document.getElementById("cinemaBackground").style.backgroundImage = "";
        document.getElementById("cinemaTexto").innerText = "";
        document.getElementById("cinemaAutor").innerText = "";
    }
};

// ======================
// MESSIAS IA
// ======================
async function inicializarIA() {
    const gerarIaBtn = document.getElementById("gerarIaBtn");
    const promptIA = document.getElementById("promptIA");
    const resultadoIA = document.getElementById("resultadoIA");

    if (!gerarIaBtn || !promptIA || !resultadoIA) return;

    gerarIaBtn.addEventListener("click", async () => {
        const prompt = promptIA.value.trim();
        if (!prompt) {
            alert("Por favor, digite um assunto ou pergunta para a IA.");
            return;
        }

        let apiKey = localStorage.getItem("openai_api_key");
        if (!apiKey) {
            try {
                const configDoc = await getDoc(doc(db, "config", "settings"));
                if (configDoc.exists() && configDoc.data().openai_api_key) {
                    apiKey = configDoc.data().openai_api_key;
                    localStorage.setItem("openai_api_key", apiKey);
                }
            } catch (err) {
                console.error("Erro ao buscar chave do Firestore:", err);
            }
        }

        if (!apiKey) {
            alert("⚠️ API Key da OpenAI não configurada. Por favor, configure-a no Painel Administrativo (ícone ⚙️).");
            return;
        }

        gerarIaBtn.disabled = true;
        gerarIaBtn.innerHTML = "⏳ Pensando...";
        resultadoIA.innerHTML = "<p>🔍 Messias IA está refletindo...</p>";

        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "Você é Messias, um mentor sábio e inspirador. Responda de forma curta, poética e motivacional. Se pedirem uma frase, gere apenas a frase. Se for uma pergunta, responda com sabedoria em no máximo 3 frases."
                        },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 150
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error?.message || response.statusText;
                throw new Error(`Erro ${response.status}: ${errMsg}`);
            }

            const data = await response.json();
            const resposta = data.choices[0].message.content.trim();

            // Criar um card especial para o resultado da IA
            const fraseFake = {
                id: "ia-" + Date.now(),
                texto: resposta,
                autor: "Messias IA",
                categoria: "Sabedoria IA",
                curtidas: 0,
                visualizacoes: 0,
                compartilhamentos: 0
            };

            resultadoIA.innerHTML = `<p style="margin-bottom:15px; color:#2563eb; font-weight:bold;">✨ Resposta da Messias IA:</p>`;
            criarCardFrase(fraseFake, resultadoIA);
            
            // Rolar até o resultado
            resultadoIA.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (error) {
            console.error(error);
            resultadoIA.innerHTML = `<p style="color:#ef4444;">❌ Erro da IA: ${error.message}</p>`;
        } finally {
            gerarIaBtn.disabled = false;
            gerarIaBtn.innerHTML = "Perguntar à IA";
        }
    });
}

// ======================
// INICIALIZAÇÃO
// ======================
document.addEventListener("DOMContentLoaded", () => {
    inicializarIA();
    const lista = document.getElementById("listaFrases");
    const listaCategorias = document.getElementById("listaCategorias");
    const pesquisa = document.getElementById("pesquisa");
    const fraseDiaElemento = document.getElementById("fraseDia");

    if (pesquisa) {
        pesquisa.addEventListener("input", (e) => mostrarFrases(lista, e.target.value));
    }

    carregarFrases(lista, fraseDiaElemento, listaCategorias, pesquisa);
    configurarBotoesCategoriasFixos(pesquisa, lista);

    // Modo Escuro
    const temaBtn = document.getElementById("temaBtn");
    if (temaBtn) {
        temaBtn.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            temaBtn.innerText = document.body.classList.contains("dark-mode") ? "☀️ Modo Claro" : "🌙 Modo Escuro";
        });
    }
});
