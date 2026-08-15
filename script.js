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
let categoriaSelecionada = "";
let frasesCarregadas = false;
let temporizadorBusca;

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

// Padroniza nomes de categorias exibidos no botão e no Firestore.
// Assim, por exemplo, “boa-noite”, “Boa Noite” e “🌙 Boa Noite” apontam
// para a mesma categoria, inclusive no WebView Android.
function normalizarCategoria(texto = "") {
    return normalizarParaBusca(
        sanitizarTexto(String(texto).replace(/[-_]+/g, " "))
    ).replace(/\s+/g, " ").trim();
}

// Converte imagens antigas do GitHub Pages para o mesmo domínio atual.
// O carregamento normal dos cards continua direto; a exportação usa o proxy abaixo.
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

// Proxy público estável na Vercel. Ele é usado também quando o domínio principal
// ainda estiver servido pelo GitHub Pages, onde a rota /api/image não existe.
const ORIGEM_PROXY_IMAGEM = "https://frasesdemessiascombr.vercel.app";

function origemApiVideo() {
    return window.location.hostname.endsWith(".vercel.app")
        ? window.location.origin
        : ORIGEM_PROXY_IMAGEM;
}

function urlParaProxyImagem(url = "") {
    const valor = String(url || "").trim();
    if (!valor) return "";
    try {
        const origem = new URL(valor, window.location.href);
        if (origem.origin === window.location.origin) return origem.href;
        if (origem.protocol !== "https:") return "";

        const proxyBase = window.location.hostname.endsWith(".vercel.app")
            ? window.location.origin
            : ORIGEM_PROXY_IMAGEM;
        return `${proxyBase}/api/image?url=${encodeURIComponent(origem.href)}`;
    } catch (_) {
        return "";
    }
}

async function carregarImagemParaCanvas(url) {
    const resposta = await fetch(url, { cache: "no-store", mode: "cors" });
    const tipo = resposta.headers.get("content-type") || "";
    if (!resposta.ok || !tipo.toLowerCase().startsWith("image/")) {
        throw new Error("A foto original não pôde ser carregada para o download.");
    }

    const blob = await resposta.blob();
    if (!blob.size) throw new Error("A foto original retornou vazia.");

    const objectUrl = URL.createObjectURL(blob);
    const imagem = new Image();
    imagem.decoding = "async";

    try {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Tempo esgotado ao carregar a foto original.")), 10000);
            imagem.onload = () => {
                clearTimeout(timeout);
                resolve();
            };
            imagem.onerror = () => {
                clearTimeout(timeout);
                reject(new Error("A foto original não pôde ser decodificada."));
            };
            imagem.src = objectUrl;
        });

        if (!imagem.naturalWidth || !imagem.naturalHeight) {
            throw new Error("A foto original não possui dimensões válidas.");
        }
        return { imagem, liberar: () => URL.revokeObjectURL(objectUrl) };
    } catch (erro) {
        URL.revokeObjectURL(objectUrl);
        throw erro;
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
    frasesCarregadas = false;

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

    frasesCarregadas = true;
    fraseDoDia(fraseDiaElemento);
    mostrarCategorias(listaCategorias, pesquisa, lista);
    // Preserva uma busca já digitada enquanto as frases estavam sendo carregadas.
    mostrarFrases(lista, filtrosAtuais());
}

// ======================
// MOSTRAR FRASES
// ======================
function filtrosAtuais() {
    return {
        texto: document.getElementById("pesquisa")?.value || "",
        autor: document.getElementById("pesquisaAutor")?.value || "",
        categoria: categoriaSelecionada
    };
}

function rolarParaResultados() {
    document.getElementById("todas-as-frases")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function atualizarStatusPesquisa(quantidade, filtros) {
    const status = document.getElementById("statusPesquisa");
    if (!status) return;

    const texto = String(filtros.texto || "").trim();
    const autor = String(filtros.autor || "").trim();
    const categoria = String(filtros.categoria || "").trim();
    const buscaAtiva = Boolean(texto || autor || categoria);

    if (!buscaAtiva) {
        status.hidden = true;
        status.replaceChildren();
        return;
    }

    status.hidden = false;
    status.replaceChildren();

    const mensagem = document.createElement("span");
    const descricao = autor ? ` por autor “${autor}”` : (texto ? ` para “${texto}”` : ` em “${categoria}”`);
    mensagem.textContent = quantidade === 1
        ? `1 frase encontrada${descricao}.`
        : `${quantidade} frases encontradas${descricao}.`;

    const verResultados = document.createElement("button");
    verResultados.type = "button";
    verResultados.className = "btn-ver-resultados";
    verResultados.textContent = "Ver resultados ↓";
    verResultados.addEventListener("click", rolarParaResultados);

    status.append(mensagem, verResultados);
}

function mostrarStatusCarregandoBusca() {
    const status = document.getElementById("statusPesquisa");
    if (!status) return;
    status.hidden = false;
    status.textContent = "Carregando frases… sua busca será aplicada automaticamente.";
}

function atualizarListaComFiltros() {
    const filtros = filtrosAtuais();
    if (!frasesCarregadas) {
        mostrarStatusCarregandoBusca();
        return;
    }
    mostrarFrases(document.getElementById("listaFrases"), filtros);
}

function mostrarFrases(lista, filtro = "") {
    if (!lista) return;
    lista.innerHTML = "";

    // Mantém compatibilidade com chamadas antigas que enviavam apenas um texto.
    const filtros = typeof filtro === "string"
        ? { texto: filtro, autor: "", categoria: "" }
        : (filtro || {});
    const textoLimpo = normalizarParaBusca(String(filtros.texto || "").trim());
    const autorLimpo = normalizarParaBusca(String(filtros.autor || "").trim());
    const categoriaLimpa = normalizarCategoria(filtros.categoria || "");

    const resultado = frases.filter(f => {
        const textoFrase = normalizarParaBusca(f.texto || "");
        const autorFrase = normalizarParaBusca(f.autor || "Messias");
        const categoriaFrase = normalizarCategoria(f.categoria || "");

        const correspondeTexto = !textoLimpo
            || textoFrase.includes(textoLimpo)
            || categoriaFrase.includes(textoLimpo)
            || autorFrase.includes(textoLimpo);
        const correspondeAutor = !autorLimpo || autorFrase.includes(autorLimpo);
        const correspondeCategoria = !categoriaLimpa || categoriaFrase === categoriaLimpa;

        return correspondeTexto && correspondeAutor && correspondeCategoria;
    });

    atualizarStatusPesquisa(resultado.length, filtros);

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
            categoriaSelecionada = categoriaLimpa;
            if (pesquisa) pesquisa.value = categoriaLimpa;
            atualizarListaComFiltros();
            const offset = lista.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({ top: offset, behavior: "smooth" });
        };
        listaCategorias.appendChild(btn);
    });
}

function configurarBotoesCategoriasFixos(pesquisa, lista) {
    // Os atalhos da página inicial agora são links para páginas públicas de categoria.
    // Mantemos o filtro local apenas para botões reais que venham a existir futuramente.
    const botoes = document.querySelectorAll(".grid-botoes button.btn-categoria");
    botoes.forEach(btn => {
        btn.onclick = () => {
            // O texto visível preserva o nome usado no Firestore; o atributo
            // data-categoria possui versões técnicas como “bom-dia”.
            const cat = sanitizarTexto(btn.textContent || btn.getAttribute("data-categoria") || "");
            categoriaSelecionada = cat;
            if (pesquisa) pesquisa.value = cat;
            atualizarListaComFiltros();
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
        atualizarListaComFiltros();
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
        atualizarListaComFiltros();
    } catch (e) {
        console.error(e);
    }
};

async function copiarTextoCompativel(texto) {
    const valor = String(texto || "").trim();
    if (!valor) throw new Error("Não há texto para copiar.");

    // A API moderna funciona nos navegadores seguros; o fallback atende WebViews
    // Android e navegadores que não expõem navigator.clipboard ao aplicativo.
    if (navigator.clipboard?.writeText && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(valor);
            return;
        } catch (erroClipboard) {
            console.warn("Clipboard moderno indisponível; usando fallback:", erroClipboard);
        }
    }

    const campo = document.createElement("textarea");
    campo.value = valor;
    campo.setAttribute("readonly", "");
    campo.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;";
    document.body.appendChild(campo);
    campo.focus();
    campo.select();
    campo.setSelectionRange(0, campo.value.length);

    try {
        if (!document.execCommand("copy")) {
            throw new Error("O navegador não confirmou a cópia.");
        }
    } finally {
        campo.remove();
    }
}

window.copiar = async function(texto) {
    try {
        await copiarTextoCompativel(texto);
        alert("📋 Frase copiada com sucesso!");
    } catch (e) {
        console.error("Erro ao copiar frase:", e);
        alert("Não foi possível copiar a frase. Tente novamente.");
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
        const imgUrlOriginal = imgElement ? (imgElement.currentSrc || imgElement.src) : "";
        const imgSrcExportacao = urlParaProxyImagem(imgUrlOriginal);
        if (!imgSrcExportacao) throw new Error("A imagem da frase não foi encontrada.");
        const texto = card.querySelector(".textoFrase")?.innerText || "";
        const autor = card.querySelector(".autorFrase")?.innerText || "";
        const largura = 1080;
        const altura = formato === "feed" ? 1080 : 1920;
        const tamanhoFonteTexto = formato === "feed" ? "52px" : "70px";
        const tamanhoFonteAutor = formato === "feed" ? "34px" : "42px";
        const tamanhoFonteMarca = formato === "feed" ? "26px" : "34px";

        // Renderização direta em Canvas nativo para evitar qualquer travamento do html2canvas
        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext("2d");

        // Fundo degradê base
        const grad = ctx.createLinearGradient(0, 0, largura, altura);
        grad.addColorStop(0, "#1e1b4b");
        grad.addColorStop(0.5, "#31103f");
        grad.addColorStop(1, "#0f172a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, largura, altura);

        // Busca a foto como Blob e a desenha no Canvas somente após decodificação.
        // Não gera PNG apenas com degradê quando a foto original estiver indisponível.
        const recursoImagem = await carregarImagemParaCanvas(imgSrcExportacao);
        try {
            const img = recursoImagem.imagem;
            const imgRatio = img.naturalWidth / img.naturalHeight;
            const canvasRatio = largura / altura;
            let rw = largura, rh = altura, rx = 0, ry = 0;
            if (imgRatio > canvasRatio) {
                rw = altura * imgRatio;
                rx = (largura - rw) / 2;
            } else {
                rh = largura / imgRatio;
                ry = (altura - rh) / 2;
            }
            ctx.drawImage(img, rx, ry, rw, rh);
        } finally {
            recursoImagem.liberar();
        }

        // Camada escura de leitura (overlay)
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, largura, altura);

        // Textos centralizados com quebra de linha (Word Wrap)
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";

        // Formatação do texto da frase
        const fontSizeTextoNum = formato === "feed" ? 52 : 70;
        ctx.font = `bold ${fontSizeTextoNum}px Arial, sans-serif`;
        const maxWidth = largura - 140;
        const words = texto.replace(/^"|"$/g, "").trim().split(/\s+/);
        let lines = [];
        let currentLine = words[0] || "";

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine + " " + word;
            if (ctx.measureText(testLine).width < maxWidth) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);

        const lineHeight = fontSizeTextoNum * 1.4;
        const totalTextHeight = lines.length * lineHeight;

        // Autor e marca
        const fontSizeAutorNum = formato === "feed" ? 34 : 42;
        const fontSizeMarcaNum = formato === "feed" ? 26 : 34;
        const autorSpacing = 60;
        const totalBlockHeight = totalTextHeight + autorSpacing + fontSizeAutorNum;

        let startY = (altura - totalBlockHeight) / 2 + totalTextHeight / 2;

        // Desenhar linhas da frase
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;

        for (let i = 0; i < lines.length; i++) {
            const lineY = startY - ((lines.length - i) * lineHeight) + (lineHeight / 2);
            ctx.fillText('"' + lines[i] + '"', largura / 2, lineY);
        }

        // Desenhar autor
        if (autor) {
            ctx.font = `600 ${fontSizeAutorNum}px Arial, sans-serif`;
            const autorY = startY + (autorSpacing / 2) + (fontSizeAutorNum / 2);
            ctx.fillText(autor, largura / 2, autorY);
        }

        // Desenhar marca d'água no rodapé
        ctx.font = `bold ${fontSizeMarcaNum}px Arial, sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillText("📖 Frases de Messias", largura / 2, altura - 80);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("Erro ao gerar imagem.");

        const url = URL.createObjectURL(blob);

        // Mantém apenas uma prévia por vez. Isso evita modais sobrepostos, que podem
        // bloquear o toque no botão Fechar em celulares.
        document.querySelectorAll('[data-modal-download="imagem"]').forEach(modalAntigo => {
            const urlAntiga = modalAntigo.dataset.objectUrl;
            if (urlAntiga) URL.revokeObjectURL(urlAntiga);
            modalAntigo.remove();
        });

        // Em vez de forçar download, mostra a imagem para o usuário salvar manualmente.
        // O fechamento usa listener isolado, evitando depender de onclick inserido em HTML.
        const modalDownload = document.createElement("div");
        modalDownload.dataset.modalDownload = "imagem";
        modalDownload.dataset.objectUrl = url;
        modalDownload.setAttribute("role", "dialog");
        modalDownload.setAttribute("aria-modal", "true");
        modalDownload.setAttribute("aria-label", "Prévia da imagem gerada");
        modalDownload.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;color:white;text-align:center;";
        modalDownload.innerHTML = `
            <p style="margin-bottom:15px; font-weight:bold;">✨ Imagem Gerada!</p>
            <img src="${url}" alt="Imagem da frase gerada" style="max-width:100%; max-height:65vh; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.5); margin-bottom:14px;">
            <a href="${url}" download="frase-${formato}-${Date.now()}.png" style="display:inline-block; padding:12px 22px; background:#2563eb; color:white; text-decoration:none; border-radius:8px; font-weight:bold; margin-bottom:14px;">⬇️ Baixar imagem</a>
            <p style="font-size:14px; margin:0 0 16px;">No celular, se a imagem abrir em vez de baixar, pressione-a e escolha <b>Salvar imagem</b>.</p>
            <button type="button" data-fechar-preview style="padding:12px 30px; min-height:46px; background:#ef4444; color:white; border:none; border-radius:7px; font-weight:bold; cursor:pointer;">Fechar</button>
        `;

        const fecharPreview = () => {
            URL.revokeObjectURL(url);
            modalDownload.remove();
        };
        modalDownload.querySelector("[data-fechar-preview]")?.addEventListener("click", fecharPreview);
        modalDownload.addEventListener("click", evento => {
            if (evento.target === modalDownload) fecharPreview();
        });
        document.body.appendChild(modalDownload);

    } catch (e) {
        console.error("Erro ao gerar imagem:", e);
        const textoCard = card.querySelector(".textoFrase")?.innerText || "";
        if (textoCard) {
            await navigator.clipboard.writeText(textoCard);
            alert(`⚠️ ${e.message || "Não foi possível carregar a foto original para gerar a imagem."} Tente novamente em instantes.`);
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

function ehDispositivoApple() {
    const agente = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(agente)
        || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function ehNavegadorInstagram() {
    return /Instagram/i.test(navigator.userAgent || "");
}

function temDownloaderAndroidNativo() {
    return Boolean(window.AndroidDownloader)
        && typeof window.AndroidDownloader.baixarVideo === "function";
}

function ehAplicativoAndroid() {
    if (!/Android/i.test(navigator.userAgent || "")) return false;

    // Ao carregar uma página remota, o objeto Capacitor pode não ser exposto
    // novamente no JavaScript. A ponte AndroidDownloader continua disponível
    // no WebView e é a confirmação mais confiável de que o app é nativo.
    return temDownloaderAndroidNativo()
        || (Boolean(window.Capacitor?.isNativePlatform?.())
            && window.Capacitor?.getPlatform?.() === "android");
}

function baixarVideoNoAppAndroid(url, filename) {
    const downloader = window.AndroidDownloader;
    if (!temDownloaderAndroidNativo()) return false;

    try {
        const resultado = downloader.baixarVideo(url, filename);
        // APKs anteriores não retornavam valor; undefined significa que a ponte
        // recebeu a solicitação. A versão atual retorna false apenas ao rejeitar a URL.
        return resultado !== false;
    } catch (erro) {
        console.warn("Não foi possível acionar o download nativo Android:", erro);
        return false;
    }
}

function abrirDownloadNoNavegadorExterno(url) {
    let destino;
    try {
        destino = new URL(url, window.location.href).href;
    } catch (_) {
        destino = url;
    }

    // O navegador interno do Instagram pode bloquear downloads de Blob. No Android,
    // a intenção VIEW solicita que o sistema abra o arquivo no navegador instalado.
    if (/Android/i.test(navigator.userAgent || "")) {
        const destinoSemProtocolo = destino.replace(/^https?:\/\//i, "");
        window.location.href = `intent://${destinoSemProtocolo}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
        return;
    }

    const link = document.createElement("a");
    link.href = destino;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function nomeArquivoMp4Unico(filename, formato) {
    const base = String(filename || `frases-de-messias-${formato || "video"}.mp4`)
        .replace(/\.mp4$/i, "")
        .replace(/-\d{13}$/, "");
    return `${base}-${Date.now()}.mp4`;
}

function iniciarDownloadBlob(blob, filename) {
    const objetoUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objetoUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objetoUrl), 60000);
}

function iniciarDownloadDireto(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
}

async function prepararArquivoMp4(url, filename) {
    const resposta = await fetch(url, { cache: "no-store", mode: "cors" });
    const tipo = resposta.headers.get("content-type") || "";
    if (!resposta.ok || !tipo.toLowerCase().startsWith("video/")) {
        throw new Error("O vídeo não pôde ser preparado para salvar.");
    }
    const blob = await resposta.blob();
    if (!blob.size) throw new Error("O vídeo gerado está vazio.");
    return {
        blob,
        arquivo: new File([blob], filename, { type: blob.type || "video/mp4" })
    };
}

function mostrarMp4Gerado(url, downloadUrl, filename, formato, dadosCapa = {}) {
    const modal = document.createElement("div");
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;color:#fff;text-align:center;overflow:auto;";

    const titulo = document.createElement("p");
    titulo.textContent = `✅ Vídeo MP4 ${formato === "feed" ? "Feed" : "Story"} pronto!`;
    titulo.style.cssText = "font-weight:bold;font-size:18px;margin:0 0 14px;";

    const areaVideo = document.createElement("div");
    areaVideo.style.cssText = `position:relative;width:min(100%,360px);max-height:62vh;overflow:hidden;border-radius:10px;background:#111;${formato === "feed" ? "aspect-ratio:1/1;" : "aspect-ratio:9/16;"}`;

    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = dadosCapa.imagem || "";
    video.style.cssText = "width:100%;height:100%;object-fit:contain;display:block;background:#111;";

    // A capa evita que navegadores Android exibam o ícone genérico enquanto o MP4 carrega.
    const capa = document.createElement("button");
    capa.type = "button";
    capa.setAttribute("aria-label", "Reproduzir prévia do vídeo");
    capa.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:10px;padding:24px 18px;border:0;color:#fff;text-align:center;cursor:pointer;background:linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.32) 38%,rgba(0,0,0,.92) 100%);font-family:inherit;transition:opacity .2s ease;";

    const textoCapa = document.createElement("span");
    textoCapa.textContent = dadosCapa.texto || "Sua frase em vídeo está pronta";
    textoCapa.style.cssText = "display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;max-width:100%;font-size:clamp(17px,4.8vw,23px);line-height:1.28;font-weight:700;text-shadow:0 2px 6px rgba(0,0,0,.85);";

    const autorCapa = document.createElement("span");
    autorCapa.textContent = dadosCapa.autor || "Frases de Messias";
    autorCapa.style.cssText = "font-size:13px;font-weight:600;opacity:.94;text-shadow:0 1px 4px rgba(0,0,0,.85);";

    const reproduzirCapa = document.createElement("span");
    reproduzirCapa.textContent = "▶ Toque para assistir";
    reproduzirCapa.style.cssText = "margin-top:3px;padding:10px 16px;border-radius:999px;background:rgba(37,99,235,.94);font-size:14px;font-weight:700;box-shadow:0 3px 12px rgba(0,0,0,.35);";

    capa.append(textoCapa, autorCapa, reproduzirCapa);
    capa.onclick = () => {
        video.play().catch(() => { /* O controle nativo continua disponível se a reprodução for bloqueada. */ });
    };
    video.addEventListener("playing", () => {
        capa.style.opacity = "0";
        capa.style.pointerEvents = "none";
        window.setTimeout(() => capa.remove(), 220);
    }, { once: true });

    areaVideo.append(video, capa);

    const baixar = document.createElement("button");
    baixar.type = "button";
    baixar.disabled = true;
    baixar.textContent = "⏳ Preparando MP4...";
    baixar.style.cssText = "display:inline-block;margin-top:18px;min-height:44px;padding:12px 24px;background:#2563eb;color:#fff;border:0;border-radius:8px;font-weight:bold;touch-action:manipulation;";

    const situacao = document.createElement("p");
    situacao.setAttribute("aria-live", "polite");
    situacao.textContent = "Preparando o arquivo para salvar no seu celular...";
    situacao.style.cssText = "font-size:13px;line-height:1.4;max-width:360px;margin:12px 0 0;";

    const noInstagram = ehNavegadorInstagram();
    const aplicativoAndroid = ehAplicativoAndroid();
    const ajuda = document.createElement("p");
    ajuda.textContent = noInstagram
        ? "O navegador do Instagram não permite salvar este MP4 diretamente. Toque no botão para abrir no navegador do celular e concluir o download."
        : aplicativoAndroid
            ? "Toque em Baixar MP4. O aplicativo salvará o arquivo na pasta Downloads do seu celular."
            : ehDispositivoApple()
                ? "No iPhone/iPad, toque em Salvar MP4 e escolha Salvar Vídeo ou Salvar em Arquivos na tela que abrir."
                : "Toque em Baixar MP4. O arquivo será salvo na pasta Downloads do navegador.";
    ajuda.style.cssText = "font-size:13px;line-height:1.4;max-width:360px;margin:8px 0 14px;";

    const fechar = document.createElement("button");
    fechar.type = "button";
    fechar.textContent = "Fechar";
    fechar.style.cssText = "min-height:44px;padding:10px 24px;background:#ef4444;color:#fff;border:0;border-radius:6px;font-weight:bold;touch-action:manipulation;";
    fechar.onclick = () => modal.remove();

    modal.append(titulo, areaVideo, baixar, situacao, ajuda, fechar);
    document.body.appendChild(modal);

    let arquivoPreparado = null;
    const urlDireta = downloadUrl || `${url}?download=1`;

    // O WebView do Capacitor não salva com segurança links gerados por Blob.
    // No APK Android, delegamos o arquivo remoto ao DownloadManager nativo.
    if (aplicativoAndroid) {
        baixar.disabled = false;
        baixar.textContent = "⬇️ Baixar MP4";
        situacao.textContent = "Arquivo pronto. Toque para salvá-lo na pasta Downloads do celular.";
    } else {
        prepararArquivoMp4(url, filename)
            .then((resultado) => {
                arquivoPreparado = resultado;
                baixar.disabled = false;
                baixar.textContent = noInstagram
                    ? "🌐 Abrir no navegador e baixar MP4"
                    : ehDispositivoApple() ? "⬇️ Salvar MP4" : "⬇️ Baixar MP4";
                situacao.textContent = noInstagram
                    ? "Arquivo pronto. Abra no navegador do celular para fazer o download."
                    : "Arquivo pronto para salvar.";
            })
            .catch((erro) => {
                console.warn("Preparação local do MP4 indisponível:", erro);
                baixar.disabled = false;
                baixar.textContent = noInstagram ? "🌐 Abrir no navegador e baixar MP4" : "⬇️ Baixar MP4";
                situacao.textContent = noInstagram
                    ? "Abra no navegador do celular para fazer o download."
                    : "Use o download direto do arquivo.";
            });
    }

    baixar.onclick = () => {
        if (noInstagram) {
            abrirDownloadNoNavegadorExterno(urlDireta);
            situacao.textContent = "Abrindo no navegador do celular. Confirme o download na próxima tela.";
            return;
        }

        if (aplicativoAndroid) {
            if (baixarVideoNoAppAndroid(urlDireta, filename)) {
                situacao.textContent = "Download iniciado. Confira a pasta Downloads e a notificação do Android.";
            } else {
                iniciarDownloadDireto(urlDireta, filename);
                situacao.textContent = "Abrimos o download. Confirme o salvamento na tela do Android.";
            }
            return;
        }

        if (!arquivoPreparado) {
            iniciarDownloadDireto(urlDireta, filename);
            situacao.textContent = "O download foi iniciado. Verifique a pasta Downloads ou a tela de compartilhamento.";
            return;
        }

        if (ehDispositivoApple() && navigator.share) {
            const dadosCompartilhamento = {
                title: "Vídeo — Frases de Messias",
                text: "Escolha Salvar Vídeo ou Salvar em Arquivos.",
                files: [arquivoPreparado.arquivo]
            };
            if (!navigator.canShare || navigator.canShare(dadosCompartilhamento)) {
                navigator.share(dadosCompartilhamento)
                    .then(() => { situacao.textContent = "Concluído. Confira Fotos ou Arquivos para localizar o MP4."; })
                    .catch((erro) => {
                        if (erro?.name === "AbortError") {
                            situacao.textContent = "Salvamento cancelado.";
                            return;
                        }
                        iniciarDownloadDireto(urlDireta, filename);
                        situacao.textContent = "Abrimos o download direto. Escolha Salvar Vídeo ou Salvar em Arquivos.";
                    });
                return;
            }
        }

        iniciarDownloadBlob(arquivoPreparado.blob, filename);
        situacao.textContent = "Download iniciado. Verifique a pasta Downloads do navegador.";
    };
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
        const response = await fetch(`${origemApiVideo()}/api/video`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl, texto, autor, formato })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok || !data.url) {
            throw new Error(data.error || `Falha HTTP ${response.status}.`);
        }
        mostrarMp4Gerado(
            data.url,
            data.downloadUrl || `${data.url}?download=1`,
            nomeArquivoMp4Unico(data.filename, formato),
            formato,
            { imagem: imageUrl, texto, autor }
        );
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
// AVISO DE INSTALAÇÃO APK
// ======================
function configurarAvisoApk() {
    const aviso = document.getElementById("avisoApk");
    const continuar = document.getElementById("continuarNoSiteBtn");
    const baixar = document.getElementById("baixarApkBtn");

    if (!aviso || !continuar || !baixar) return;

    // No aplicativo Android, o portal já está instalado. Portanto, o aviso de APK
    // não deve ser exibido nem levar a pessoa a tentar baixar o próprio app novamente.
    const emAplicativoNativo = window.Capacitor?.isNativePlatform?.()
        || window.location.protocol === "capacitor:"
        || window.location.hostname === "localhost";
    if (emAplicativoNativo) {
        aviso.hidden = true;
        document.body.classList.remove("aviso-apk-ativo");
        return;
    }

    const fecharAviso = () => {
        aviso.hidden = true;
        document.body.classList.remove("aviso-apk-ativo");
        localStorage.setItem("avisoApkDispensado", "1");
    };

    // Exibe o aviso apenas na primeira visita deste navegador. Depois da escolha,
    // a preferência permanece salva sem impedir a navegação no portal.
    if (localStorage.getItem("avisoApkDispensado") !== "1") {
        aviso.hidden = false;
        document.body.classList.add("aviso-apk-ativo");
    }

    continuar.addEventListener("click", fecharAviso);
    baixar.addEventListener("click", () => {
        // Registra a escolha para não reabrir o aviso nas próximas visitas deste navegador.
        localStorage.setItem("avisoApkDispensado", "1");
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
    const pesquisaAutor = document.getElementById("pesquisaAutor");
    const fraseDiaElemento = document.getElementById("fraseDia");
    const copiarBtn = document.getElementById("copiarBtn");

    if (copiarBtn && fraseDiaElemento) {
        copiarBtn.addEventListener("click", async () => {
            const texto = fraseDiaElemento.innerText.trim();
            const rotuloOriginal = copiarBtn.textContent;
            if (!texto) return;

            copiarBtn.disabled = true;
            copiarBtn.textContent = "Copiando...";
            try {
                await copiarTextoCompativel(texto);
                copiarBtn.textContent = "✓ Frase copiada!";
                window.setTimeout(() => {
                    copiarBtn.textContent = rotuloOriginal;
                }, 1800);
            } catch (erro) {
                console.error("Erro ao copiar a Frase do Dia:", erro);
                copiarBtn.textContent = "Tentar novamente";
                alert("Não foi possível copiar a frase. Tente novamente.");
                window.setTimeout(() => {
                    copiarBtn.textContent = rotuloOriginal;
                }, 1800);
            } finally {
                copiarBtn.disabled = false;
            }
        });
    }

    const atualizarBuscaComEspera = (limparCategoria = false) => {
        if (limparCategoria) categoriaSelecionada = "";
        window.clearTimeout(temporizadorBusca);
        temporizadorBusca = window.setTimeout(atualizarListaComFiltros, 180);
    };

    const tratarEnterDaBusca = (evento) => {
        if (evento.key !== "Enter") return;
        evento.preventDefault();
        window.clearTimeout(temporizadorBusca);
        atualizarListaComFiltros();
        rolarParaResultados();
    };

    if (pesquisa) {
        pesquisa.addEventListener("input", () => atualizarBuscaComEspera(true));
        pesquisa.addEventListener("keydown", tratarEnterDaBusca);
        pesquisa.addEventListener("search", () => atualizarBuscaComEspera(true));
    }

    if (pesquisaAutor) {
        pesquisaAutor.addEventListener("input", () => atualizarBuscaComEspera());
        pesquisaAutor.addEventListener("keydown", tratarEnterDaBusca);
        pesquisaAutor.addEventListener("search", () => atualizarBuscaComEspera());
    }

    carregarFrases(lista, fraseDiaElemento, listaCategorias, pesquisa);
    configurarBotoesCategoriasFixos(pesquisa, lista);

    // Modo escuro compartilhado por todas as páginas públicas.
    const temaBtn = document.getElementById("temaBtn");
    const aplicarTema = (escuro) => {
        document.body.classList.toggle("dark", escuro);
        // Remove a classe antiga para evitar que estilos diferentes disputem o tema.
        document.body.classList.remove("dark-mode");
        if (temaBtn) {
            temaBtn.textContent = escuro ? "☀️ Modo Claro" : "🌙 Modo Escuro";
            temaBtn.setAttribute("aria-pressed", String(escuro));
            temaBtn.setAttribute("title", escuro ? "Ativar modo claro" : "Ativar modo escuro");
        }
    };

    aplicarTema(localStorage.getItem("tema") === "dark");
    configurarAvisoApk();

    if (temaBtn) {
        temaBtn.addEventListener("click", () => {
            const escuro = !document.body.classList.contains("dark");
            aplicarTema(escuro);
            localStorage.setItem("tema", escuro ? "dark" : "light");
        });
    }
});
