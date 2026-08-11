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

// Função auxiliar para remover emojis e espaços extras das pontas
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
        
        // Se o usuário ainda não foi contado nesta sessão
        if (!sessionStorage.getItem(chaveVisita)) {
            await updateDoc(docRef, {
                visitas: increment(1)
            });
            sessionStorage.setItem(chaveVisita, "true");
        }
        
        // Buscar o valor atualizado para exibir
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
    contarVisitaGlobal();
    mostrarCarregando();
    frases = [];
    categorias = {};

    try {
        const consultaCategorias = await getDocs(collection(db, "categorias"));
        consultaCategorias.forEach(docSnap => {
            const dados = docSnap.data();
            const nomeLimpo = sanitizarTexto(dados.nome || "");
            if (nomeLimpo) {
                categorias[nomeLimpo] = dados.imagem;
            }
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
            <div class="semResultado">
                😔 Nenhuma frase encontrada.
            </div>
        `;
        return;
    }

    resultado.forEach(criarCardFrase);
}

function criarCardFrase(f) {
    const categoriaLimpa = sanitizarTexto(f.categoria || "");
    
    // Otimização: Imagens menores para mobile (400x300) e maiores para desktop (800x600)
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

            // Forçar download direto em vez de abrir o menu de compartilhamento do sistema
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

if (gerarIaBtn) {
    gerarIaBtn.onclick = gerarFraseIA;
}

if (promptIA) {
    promptIA.onkeypress = (e) => {
        if (e.key === 'Enter') gerarFraseIA();
    };
}

window.curtir = curtir;
window.favoritar = favoritar;
window.compartilhar = compartilhar;
window.baixarImagem = baixarImagem;
window.mostrarOpcoesDownload = mostrarOpcoesDownload;
window.visualizar = visualizar;
window.copiar = copiar;

// Função específica para criar cards da IA com destaque
function criarCardFraseIA(f) {
    const card = document.createElement("div");
    card.className = "cardFrase";
    card.style.border = "2px solid #2563eb"; // Destaque para frases da IA
    
    const larguraImg = window.innerWidth < 600 ? 400 : 800;
    const alturaImg = window.innerWidth < 600 ? 300 : 600;
    const imagem = `https://picsum.photos/seed/${f.id}/${larguraImg}/${alturaImg}`;

    card.innerHTML = `
        <div class="imagemFrase">
            <img loading="lazy" crossorigin="anonymous" src="${imagem}" alt="Resposta IA">
            <div class="overlay">
                <p class="textoFrase">"${f.texto}"</p>
                <div class="autorFrase">— Messias IA</div>
                <div class="marca" style="font-size: 16px; background: rgba(37, 99, 235, 0.8); padding: 5px 10px; border-radius: 4px;">📖 Frases de Messias</div>
            </div>
        </div>
        <div class="botoes">
            <button onclick="copiar('${f.texto.replace(/'/g, "\\'")}')">📋 Copiar</button>
            <button onclick="mostrarOpcoesDownload(this)">📥 Baixar Imagem</button>
        </div>
        <div class="opcoesDownload" style="display:none; margin-top:10px; text-align:center; padding: 10px;">
            <p style="font-size:13px; margin-bottom:5px; font-weight:bold;">Baixar com Marca D'água:</p>
            <button onclick="baixarImagem(this, 'story')" style="margin-right:5px; font-size:12px; padding:6px 12px;">📱 Story</button>
            <button onclick="baixarImagem(this, 'feed')" style="font-size:12px; padding:6px 12px;">📸 Feed</button>
            <button onclick="gerarVideo(this, 'story')" style="margin-top:8px; margin-right:5px; font-size:12px; padding:6px 12px; background:#ff6b6b; color:white; border:none; border-radius:4px; cursor:pointer;">🎬 Video Story</button>
            <button onclick="gerarVideo(this, 'feed')" style="margin-top:8px; font-size:12px; padding:6px 12px; background:#ff6b6b; color:white; border:none; border-radius:4px; cursor:pointer;">🎬 Video Feed</button>
        </div>
    `;
    return card;
}

async function gerarFraseIA() {
    if (!promptIA || !resultadoIA) return;
    const tema = promptIA.value.trim();
    if (!tema) {
        alert("Por favor, digite um tema ou sentimento.");
        return;
    }

    gerarIaBtn.disabled = true;
    gerarIaBtn.innerHTML = "⏳ Criando...";
    resultadoIA.innerHTML = "✨ Messias IA está pensando em algo especial...";

    try {
        // Simulação de IA Avançada para ambiente estático
        // Esta lógica analisa o input do usuário para dar respostas contextuais
        const input = tema.toLowerCase();
        let resposta = "";

        if (input.includes("bom dia")) {
            resposta = "Que o seu dia comece com a luz da esperança e termine com a paz da gratidão.";
        } else if (input.includes("boa noite")) {
            resposta = "Descanse o seu coração, pois o amanhã trará novas oportunidades de ser feliz.";
        } else if (input.includes("fé") || input.includes("deus")) {
            resposta = "A fé não é o caminho mais fácil, mas é o único que nos leva ao destino certo.";
        } else if (input.includes("amor") || input.includes("relacionamento")) {
            resposta = "O amor é a única semente que, mesmo plantada no silêncio, floresce em cores vibrantes.";
        } else if (input.includes("trabalho") || input.includes("sucesso") || input.includes("carreira")) {
            resposta = "O sucesso não é um golpe de sorte, mas o resultado de cada pequeno esforço invisível.";
        } else if (input.includes("triste") || input.includes("dor") || input.includes("sofrimento")) {
            resposta = "Até a noite mais escura é obrigada a ceder lugar ao brilho do sol. Aguente firme.";
        } else if (input.includes("ajuda") || input.includes("conselho")) {
            resposta = "Escute a sua intuição; ela é a voz da sua alma guiando você para a sua melhor versão.";
        } else {
            // Fallback para frases genéricas inspiradoras
            const frasesGenéricas = [
                "A sua jornada é única, não se compare com os outros, supere a si mesmo.",
                "Grandes vitórias exigem grandes batalhas e uma paciência inabalável.",
                "O que você faz hoje é o que constrói o cenário do seu amanhã.",
                "Seja gentil consigo mesmo; você está evoluindo a cada respiração.",
                "A vida é um espelho: ela reflete exatamente a energia que você emite."
            ];
            resposta = frasesGenéricas[Math.floor(Math.random() * frasesGenéricas.length)];
        }

        setTimeout(() => {
            resultadoIA.innerHTML = `
                <div style="margin-bottom: 10px; padding: 15px; background: white; border-radius: 8px; border-left: 5px solid #2563eb;">
                    <strong>"${resposta}"</strong>
                </div>
                <button id="copiarIaBtn" style="padding: 10px 20px; font-size: 1rem; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">📋 Copiar Resposta</button>
            `;
            
            const btnCopiarIA = document.getElementById("copiarIaBtn");
            if (btnCopiarIA) {
                btnCopiarIA.onclick = () => {
                    copiar(resposta);
                };
            }

            gerarIaBtn.disabled = false;
            gerarIaBtn.innerHTML = "Perguntar à IA";
            
            // Adicionar a resposta da IA como um novo Card Visual com Marca D'água
            const novaFrase = {
                id: "ia_" + Date.now(),
                texto: resposta,
                autor: "Messias IA",
                categoria: "Resposta IA",
                curtidas: 0,
                visualizacoes: 1,
                compartilhamentos: 0,
                imagem: `https://picsum.photos/seed/ia_${Date.now()}/800/600`
            };
            
            // Inserir no topo da lista de frases para visibilidade imediata
            if (lista) {
                const tempDiv = document.createElement("div");
                lista.insertBefore(tempDiv, lista.firstChild);
                // Usamos a função existente para criar o card completo (que já inclui a marca d'água)
                const card = criarCardFraseIA(novaFrase);
                tempDiv.replaceWith(card);
            }

            window.scrollTo({
                top: resultadoIA.offsetTop - 50,
                behavior: "smooth"
            });
        }, 1500);

    } catch (e) {
        console.error(e);
        resultadoIA.innerHTML = "❌ Ops, a IA teve um momento de reflexão profunda. Tente novamente!";
        gerarIaBtn.disabled = false;
        gerarIaBtn.innerHTML = "Gerar Frase";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    carregarFrases();

    // Adicionar eventos para os botões de categorias estáticos
    const botoesEstaticos = document.querySelectorAll(".btn-categoria");
    botoesEstaticos.forEach(btn => {
        btn.onclick = () => {
            const nomeCategoria = btn.textContent || "";
            const nomeLimpo = sanitizarTexto(nomeCategoria);
            
            if (pesquisa) pesquisa.value = nomeLimpo;
            mostrarFrases(nomeLimpo);

            const offset = lista.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({
                top: offset,
                behavior: "smooth"
            });
        };
    });
});

// Service Worker PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado!', reg))
            .catch(err => console.log('Erro no Service Worker:', err));
    });
            }
                      


// FUNÇÃO DE GERAÇÃO DE VÍDEO ANIMADO
async function gerarVideo(botao, formato = "story") {
    const card = botao.closest(".cardFrase");
    if (!card) return;

    const btnOpcoes = card.querySelector(".opcoesDownload");
    if (btnOpcoes) btnOpcoes.style.display = "none";

    const textoBotaoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = "⏳ Gerando vídeo...";

    let canvas = null;
    let stream = null;
    let mediaRecorder = null;

    try {
        const imgElement = card.querySelector(".imagemFrase img");
        const imgSrc = imgElement ? imgElement.src : "";
        const texto = card.querySelector(".textoFrase")?.innerText || "";
        const autor = card.querySelector(".autorFrase")?.innerText || "";

        // Dimensões do vídeo
        const largura = 1080;
        const altura = formato === "feed" ? 1080 : 1920;
        const duracao = 5000; // 5 segundos de vídeo
        const fps = 30;

        // Criar canvas para renderizar a animação
        canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext("2d");

        // Carregar a imagem de fundo
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imgSrc;
        });

        // Obter o stream do canvas
        stream = canvas.captureStream(fps);
        
        // Criar MediaRecorder
        const options = {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 2500000
        };

        // Fallback se vp9 não for suportado
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm';
        }

        mediaRecorder = new MediaRecorder(stream, options);
        const chunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `frase-video-${formato}-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            botao.disabled = false;
            botao.innerHTML = textoBotaoOriginal;
        };

        mediaRecorder.start();

        // Animar o canvas
        let startTime = Date.now();
        const animarFrame = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duracao, 1);

            // Desenhar imagem de fundo
            ctx.drawImage(img, 0, 0, largura, altura);

            // Overlay escuro
            ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
            ctx.fillRect(0, 0, largura, altura);

            // Calcular opacidade do texto (fade-in)
            const opacidade = Math.min(progress * 1.5, 1);
            ctx.globalAlpha = opacidade;

            // Desenhar texto
            ctx.fillStyle = "white";
            ctx.font = `bold ${formato === "feed" ? "52px" : "70px"} Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // Quebrar texto em múltiplas linhas
            const palavras = texto.replace(/"/g, "").split(" ");
            let linha = "";
            const linhas = [];
            const maxLargura = largura - 120;

            palavras.forEach((palavra) => {
                const teste = linha + (linha ? " " : "") + palavra;
                const metricas = ctx.measureText(teste);
                if (metricas.width > maxLargura && linha) {
                    linhas.push(linha);
                    linha = palavra;
                } else {
                    linha = teste;
                }
            });
            if (linha) linhas.push(linha);

            const alturaTexto = linhas.length * 80;
            let yTexto = altura / 2 - alturaTexto / 2;

            linhas.forEach((l) => {
                ctx.fillText(l, largura / 2, yTexto);
                yTexto += 80;
            });

            // Desenhar autor
            ctx.font = `${formato === "feed" ? "34px" : "42px"} Arial`;
            ctx.fillText(autor, largura / 2, altura / 2 + alturaTexto / 2 + 80);

            // Desenhar marca d'água
            ctx.globalAlpha = 1;
            ctx.font = `${formato === "feed" ? "26px" : "34px"} Arial`;
            ctx.fillText("📖 Frases de Messias", largura / 2, altura - 80);

            if (progress < 1) {
                requestAnimationFrame(animarFrame);
            } else {
                mediaRecorder.stop();
            }
        };

        animarFrame();

    } catch (e) {
        console.error("Erro ao gerar vídeo:", e);
        alert("⚠️ Não foi possível gerar o vídeo. Seu navegador pode não suportar essa funcionalidade.");
        botao.disabled = false;
        botao.innerHTML = textoBotaoOriginal;
    }
}
