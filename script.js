import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    doc,
    runTransaction,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    documentId
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

let frases = [];
let categorias = {};
let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];
let categoriaSelecionada = "";
let frasesCarregadas = false;
const TAMANHO_LOTE_FRASES = 24;
let ultimoDocumentoFrases = null;
let haMaisFrases = true;
let carregandoMaisFrases = false;

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

function normalizarCategoria(texto = "") {
    return normalizarParaBusca(
        sanitizarTexto(String(texto).replace(/[-_]+/g, " "))
    ).replace(/\s+/g, " ").trim();
}

function termosRelevantesDaBusca(texto = "") {
    const palavrasIgnoradas = new Set([
        "a", "as", "o", "os", "de", "da", "das", "do", "dos", "e", "em", "para", "por", "com", "sobre",
        "frase", "frases", "mensagem", "mensagens", "pensamento", "pensamentos"
    ]);

    return normalizarParaBusca(String(texto))
        .split(/[^a-z0-9]+/)
        .filter(palavra => palavra && !palavrasIgnoradas.has(palavra));
}

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
        const jaRegistrouNestaSessao = sessionStorage.getItem(chaveVisita) === "true";

        const totalAtualizado = await runTransaction(db, async (transacao) => {
            const estatistica = await transacao.get(docRef);
            const visitasAtuais = Number(estatistica.data()?.visitas || 0);

            if (!jaRegistrouNestaSessao) {
                transacao.update(docRef, { visitas: visitasAtuais + 1 });
                return visitasAtuais + 1;
            }

            return visitasAtuais;
        });

        if (!jaRegistrouNestaSessao) {
            sessionStorage.setItem(chaveVisita, "true");
        }

        if (contadorElemento) {
            contadorElemento.textContent = Number(totalAtualizado).toLocaleString("pt-BR");
        }
    } catch (e) {
        console.error("Erro ao contar visita global:", e);
    }
}

// ======================
// CARREGAR DADOS
// ======================
async function carregarProximoLoteDeFrases() {
    if (!haMaisFrases || carregandoMaisFrases) return 0;

    carregandoMaisFrases = true;
    try {
        const restricoes = [orderBy(documentId()), limit(TAMANHO_LOTE_FRASES)];
        if (ultimoDocumentoFrases) restricoes.push(startAfter(ultimoDocumentoFrases));

        const consultaFrases = await getDocs(query(collection(db, "frases"), ...restricoes));
        consultaFrases.forEach(docSnap => {
            frases.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (consultaFrases.docs.length) {
            ultimoDocumentoFrases = consultaFrases.docs[consultaFrases.docs.length - 1];
        }
        haMaisFrases = consultaFrases.size === TAMANHO_LOTE_FRASES;
        return consultaFrases.size;
    } finally {
        carregandoMaisFrases = false;
    }
}

async function carregarFrases() {
    const lista = document.getElementById("listaFrases");
    const fraseDiaElemento = document.getElementById("fraseDia");
    mostrarCarregando(lista);

    frases = [];
    categorias = {};
    frasesCarregadas = false;
    ultimoDocumentoFrases = null;
    haMaisFrases = true;

    try {
        contarVisitaGlobal();

        const consultaCategorias = await getDocs(collection(db, "categorias"));
        consultaCategorias.forEach(docSnap => {
            const dados = docSnap.data();
            const nomeLimpo = sanitizarTexto(dados.nome || "");
            if (nomeLimpo) categorias[nomeLimpo] = dados.imagem;
        });

        await carregarProximoLoteDeFrases();
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
    mostrarFrases(lista, filtrosAtuais());
}

// ======================
// ACOES DOS BOTÕES
// ======================
function abrirEditorVideo(texto, autor = "Messias") {
    const frase = encodeURIComponent(texto);
    const autorCod = encodeURIComponent(autor);
    window.location.href = `editor.html?frase=${frase}&autor=${autorCod}`;
}

function copiarFrase(texto, autor, botao) {
    const conteudo = `"${texto}" — ${autor || "Messias"}`;
    navigator.clipboard.writeText(conteudo).then(() => {
        const textoOrig = botao.textContent;
        botao.textContent = "✅ Copiado!";
        setTimeout(() => { botao.textContent = textoOrig; }, 2000);
    }).catch(() => {
        alert("Não foi possível copiar a frase.");
    });
}

function alternarFavorito(id, botao) {
    if (favoritos.includes(id)) {
        favoritos = favoritos.filter(favId => favId !== id);
        botao.textContent = "🤍";
    } else {
        favoritos.push(id);
        botao.textContent = "❤️";
    }
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
}

// ======================
// GERADOR E DOWNLOAD DE IMAGEM
// ======================
async function baixarCardComoImagem(f, urlImagem, botao) {
    const textoOriginal = botao.textContent;
    botao.textContent = "⏳ Gerando...";
    botao.disabled = true;

    try {
        let imgTemp = new Image();
        imgTemp.crossOrigin = "anonymous";

        try {
            const resposta = await fetch(urlImagem, { mode: "cors" });
            const blob = await resposta.blob();
            const urlBlob = URL.createObjectURL(blob);
            imgTemp.src = urlBlob;
            await new Promise((resolve, reject) => {
                imgTemp.onload = () => { resolve(); URL.revokeObjectURL(urlBlob); };
                imgTemp.onerror = reject;
            });
        } catch (_) {
            imgTemp.src = urlImagem;
            await new Promise((resolve, reject) => {
                imgTemp.onload = resolve;
                imgTemp.onerror = reject;
            });
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 800;
        canvas.height = 800;

        const escala = Math.max(canvas.width / imgTemp.width, canvas.height / imgTemp.height);
        const x = (canvas.width / 2) - (imgTemp.width / 2) * escala;
        const y = (canvas.height / 2) - (imgTemp.height / 2) * escala;
        ctx.drawImage(imgTemp, x, y, imgTemp.width * escala, imgTemp.height * escala);

        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 32px sans-serif";

        const palavras = `"${f.texto}"`.split(" ");
        let linha = "";
        const linhas = [];
        const larguraMaxima = 680;

        for (let n = 0; n < palavras.length; n++) {
            const linhaTeste = linha + palavras[n] + " ";
            if (ctx.measureText(linhaTeste).width > larguraMaxima && n > 0) {
                linhas.push(linha);
                linha = palavras[n] + " ";
            } else {
                linha = linhaTeste;
            }
        }
        linhas.push(linha);

        const alturaLinha = 42;
        let inicioY = (canvas.height / 2) - ((linhas.length * alturaLinha) / 2) - 20;

        linhas.forEach(l => {
            ctx.fillText(l.trim(), canvas.width / 2, inicioY);
            inicioY += alturaLinha;
        });

        ctx.font = "italic 24px sans-serif";
        ctx.fillText(`— ${f.autor || "Messias"}`, canvas.width / 2, inicioY + 30);

        ctx.font = "18px sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillText("📖 Frases de Messias", canvas.width / 2, canvas.height - 40);

        const link = document.createElement("a");
        link.download = `frase-${f.id || "messias"}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (erro) {
        console.error("Erro ao gerar a imagem:", erro);
        alert("Não foi possível gerar o download direto devido a restrições da imagem.");
    } finally {
        botao.textContent = textoOriginal;
        botao.disabled = false;
    }
}

// ======================
// MOSTRAR E FILTRAR FRASES
// ======================
function filtrosAtuais() {
    return {
        texto: document.getElementById("pesquisa")?.value || "",
        autor: document.getElementById("pesquisaAutor")?.value || "",
        categoria: categoriaSelecionada
    };
}

function adicionarBotaoCarregarMais(lista) {
    if (!lista || !haMaisFrases) return;

    const areaMais = document.createElement("div");
    areaMais.style.cssText = "text-align:center; padding:18px 0 8px; width:100%; grid-column: 1 / -1;";
    const botaoMais = document.createElement("button");
    botaoMais.type = "button";
    botaoMais.className = "btn-ver-resultados";
    botaoMais.textContent = "Carregar mais frases";
    botaoMais.addEventListener("click", async () => {
        const textoOriginal = botaoMais.textContent;
        botaoMais.disabled = true;
        botaoMais.textContent = "Carregando...";
        try {
            const quantidade = await carregarProximoLoteDeFrases();
            if (!quantidade) haMaisFrases = false;
            mostrarFrases(lista, filtrosAtuais());
        } catch (erro) {
            console.error("Erro ao carregar mais frases:", erro);
            botaoMais.disabled = false;
            botaoMais.textContent = textoOriginal;
            alert("Não foi possível carregar mais frases agora.");
        }
    });
    areaMais.appendChild(botaoMais);
    lista.appendChild(areaMais);
}

function mostrarFrases(lista, filtro = "") {
    if (!lista) return;
    lista.innerHTML = "";

    const filtros = typeof filtro === "string"
        ? { texto: filtro, autor: "", categoria: "" }
        : (filtro || {});
    const textoLimpo = normalizarParaBusca(String(filtros.texto || "").trim());
    const termosBusca = termosRelevantesDaBusca(filtros.texto || "");
    const autorLimpo = normalizarParaBusca(String(filtros.autor || "").trim());
    const categoriaLimpa = normalizarCategoria(filtros.categoria || "");

    const resultado = frases.filter(f => {
        const textoFrase = normalizarParaBusca(f.texto || "");
        const autorFrase = normalizarParaBusca(f.autor || "Messias");
        const categoriaFrase = normalizarCategoria(f.categoria || "");
        const conteudoPesquisavel = `${textoFrase} ${categoriaFrase} ${autorFrase}`;

        const correspondeTexto = !textoLimpo
            || conteudoPesquisavel.includes(textoLimpo)
            || termosBusca.length === 0
            || termosBusca.every(termo => conteudoPesquisavel.includes(termo));
        const correspondeAutor = !autorLimpo || autorFrase.includes(autorLimpo);
        const correspondeCategoria = !categoriaLimpa || categoriaFrase === categoriaLimpa;

        return correspondeTexto && correspondeAutor && correspondeCategoria;
    });

    if (resultado.length === 0) {
        lista.innerHTML = `
            <div class="semResultado" style="text-align:center; padding: 20px; grid-column: 1 / -1;">
                😔 Nenhuma frase encontrada entre as frases carregadas.
            </div>
        `;
        adicionarBotaoCarregarMais(lista);
        return;
    }

    resultado.forEach(f => criarCardFrase(f, lista));
    adicionarBotaoCarregarMais(lista);
}

// ======================
// RENDEREIZAR CARD COM TEXTO CENTRALIZADO
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
            <img src="${imagem}" alt="Frase de Messias" loading="lazy"
                onerror="this.onerror=null; this.src='https://picsum.photos/seed/${encodeURIComponent(semente)}/${larguraImg}/${alturaImg}';">
            <div class="overlay">
                <p class="textoFrase">"${f.texto}"</p>
                <p class="autorFrase">— ${f.autor || "Messias"}</p>
                <div class="marca">📖 Frases de Messias</div>
            </div>
        </div>
        <div class="botoes">
            <button type="button" class="btnAcao btnFavorito" title="Favoritar">
                ${favoritos.includes(f.id) ? "❤️" : "🤍"}
            </button>
            <button type="button" class="btnAcao btnCopiar" title="Copiar texto">
                📋 Copiar
            </button>
            <button type="button" class="btnAcao btnEditor" title="Criar Vídeo">
                🎬 Vídeo
            </button>
            <button type="button" class="btnAcao btnBaixarImagem" title="Baixar Card como Imagem">
                🖼️ Baixar
            </button>
        </div>
    `;

    const btnCopiar = card.querySelector(".btnCopiar");
    const btnFavorito = card.querySelector(".btnFavorito");
    const btnEditor = card.querySelector(".btnEditor");
    const btnBaixarImagem = card.querySelector(".btnBaixarImagem");

    btnCopiar.addEventListener("click", () => copiarFrase(f.texto, f.autor, btnCopiar));
    btnFavorito.addEventListener("click", () => alternarFavorito(f.id, btnFavorito));
    btnEditor.addEventListener("click", () => abrirEditorVideo(f.texto, f.autor));
    btnBaixarImagem.addEventListener("click", async () => {
        await baixarCardComoImagem(f, imagem, btnBaixarImagem);
    });

    lista.appendChild(card);
}

// INICIALIZAÇÃO
const pesquisaInput = document.getElementById("pesquisa");
if (pesquisaInput) {
    pesquisaInput.addEventListener("input", () => {
        mostrarFrases(document.getElementById("listaFrases"), filtrosAtuais());
    });
}

carregarFrases();
