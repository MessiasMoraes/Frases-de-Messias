import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    increment,
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
let temporizadorBusca;
const TAMANHO_LOTE_FRASES = 24;
let ultimoDocumentoFrases = null;
let haMaisFrases = true;
let carregandoMaisFrases = false;

// ======================
// FUNÃ‡Ã•ES AUXILIARES
// ======================
function mostrarCarregando(lista) {
    if (lista) {
        lista.innerHTML = `
            <div class="loading" style="text-align:center; padding: 30px; font-weight: bold;">
                â³ Carregando frases...
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
        throw new Error("A foto original nÃ£o pÃ´de ser carregada para o download.");
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
                reject(new Error("A foto original nÃ£o pÃ´de ser decodificada."));
            };
            imagem.src = objectUrl;
        });

        if (!imagem.naturalWidth || !imagem.naturalHeight) {
            throw new Error("A foto original nÃ£o possui dimensÃµes vÃ¡lidas.");
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
    fraseDiaElemento.innerHTML = `"${f.texto}" â€” ${f.autor || "Messias"}`;
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
// PRÃ‰VIA DA REDE SOCIAL
// ======================
function dataDaPublicacaoSocial(valor) {
    if (valor?.toDate) return valor.toDate();
    if (valor?.seconds) return new Date(valor.seconds * 1000);
    return valor instanceof Date ? valor : null;
}

function criarCartaoPreviaComunidade(publicacao) {
    const link = document.createElement("a");
    link.className = "cartao-previa-comunidade";
    link.href = "comunidade.html";
    link.setAttribute("aria-label", "Ver publicaÃ§Ã£o de " + (publicacao.autorNome || "membro da comunidade") + " na Rede Social");

    const cabecalho = document.createElement("div");
    cabecalho.className = "meta-previa-comunidade";

    const autor = document.createElement("strong");
    autor.textContent = publicacao.autorNome || "Membro da comunidade";

    const categoria = document.createElement("span");
    categoria.textContent = publicacao.categoria || "Comunidade";
    cabecalho.append(autor, categoria);

    const texto = document.createElement("blockquote");
    const conteudo = String(publicacao.texto || "").trim();
    texto.textContent = `â€œ${conteudo.length > 170 ? conteudo.slice(0, 170).trimEnd() + "â€¦" : conteudo}â€`;

    const rodape = document.createElement("span");
    rodape.className = "link-cartao-previa";
    const data = dataDaPublicacaoSocial(publicacao.publicadoEm || publicacao.criadoEm);
    const dataFormatada = data
        ? data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
        : "Na Rede Social";
    rodape.textContent = `${dataFormatada} Â· Ver publicaÃ§Ã£o â†’`;

    link.append(cabecalho, texto, rodape);
    return link;
}

async function carregarPreviaComunidade() {
    const lista = document.getElementById("listaPublicacoesComunidade");
    if (!lista) return;

    try {
        const resultado = await getDocs(query(
            collection(db, "comunidadePublicacoes"),
            where("status", "==", "publicado"),
            limit(12)
        ));
        const publicacoes = resultado.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .sort((primeira, segunda) => {
                const dataPrimeira = dataDaPublicacaoSocial(primeira.publicadoEm || primeira.criadoEm)?.getTime() || 0;
                const dataSegunda = dataDaPublicacaoSocial(segunda.publicadoEm || segunda.criadoEm)?.getTime() || 0;
                return dataSegunda - dataPrimeira;
            })
            .slice(0, 3);

        lista.replaceChildren();
        if (!publicacoes.length) {
            const estado = document.createElement("p");
            estado.className = "estado-previa-comunidade";
            estado.textContent = "A Comunidade estÃ¡ comeÃ§ando. Seja uma das primeiras pessoas a compartilhar uma frase inspiradora.";
            lista.appendChild(estado);
            return;
        }

        publicacoes.forEach(publicacao => lista.appendChild(criarCartaoPreviaComunidade(publicacao)));
    } catch (erro) {
        console.error("NÃ£o foi possÃ­vel carregar a prÃ©via da Comunidade:", erro);
        lista.replaceChildren();
        const estado = document.createElement("p");
        estado.className = "estado-previa-comunidade";
        estado.textContent = "As publicaÃ§Ãµes recentes nÃ£o puderam ser carregadas agora.";
        lista.appendChild(estado);
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

async function carregarFrases(lista, fraseDiaElemento, listaCategorias, pesquisa) {
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
        mostrarErro(lista, "Erro ao conectar ao banco de dados. Verifique a conexÃ£o.");
        return;
    }

    if (frases.length === 0) {
        mostrarErro(lista, "Nenhuma frase cadastrada no momento.");
        return;
    }

    frasesCarregadas = true;
    fraseDoDia(fraseDiaElemento);
    mostrarCategorias(listaCategorias, pesquisa, lista);
    mostrarFrases(lista, filtrosAtuais());
}

// ======================
// ABRIR EDITOR DE VÃDEO
// ======================
function abrirEditorVideo(texto, autor = "Messias") {
    const frase = encodeURIComponent(texto);
    const autorCod = encodeURIComponent(autor);
    window.location.href = `editor.html?frase=${frase}&autor=${autorCod}`;
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
    const descricao = autor ? ` por autor â€œ${autor}â€` : (texto ? ` para â€œ${texto}â€` : ` em â€œ${categoria}â€`);
    const sufixoCarregamento = haMaisFrases ? ` entre as ${frases.length} carregadas atÃ© agora` : "";
    mensagem.textContent = quantidade === 1
        ? `1 frase encontrada${descricao}${sufixoCarregamento}.`
        : `${quantidade} frases encontradas${descricao}${sufixoCarregamento}.`;

    const verResultados = document.createElement("button");
    verResultados.type = "button";
    verResultados.className = "btn-ver-resultados";
    verResultados.textContent = "Ver resultados â†“";
    verResultados.addEventListener("click", rolarParaResultados);

    status.append(mensagem, verResultados);
}

function mostrarStatusCarregandoBusca() {
    const status = document.getElementById("statusPesquisa");
    if (!status) return;
    status.hidden = false;
    status.textContent = "Carregando frasesâ€¦ sua busca serÃ¡ aplicada automaticamente.";
}

function atualizarListaComFiltros() {
    const filtros = filtrosAtuais();
    if (!frasesCarregadas) {
        mostrarStatusCarregandoBusca();
        return;
    }
    mostrarFrases(document.getElementById("listaFrases"), filtros);
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
            alert("NÃ£o foi possÃ­vel carregar mais frases agora. Tente novamente.");
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

    atualizarStatusPesquisa(resultado.length, filtros);

    if (resultado.length === 0) {
        lista.innerHTML = `
            <div class="semResultado" style="text-align:center; padding: 20px; grid-column: 1 / -1;">
                ðŸ˜” Nenhuma frase encontrada entre as frases carregadas. VocÃª pode buscar mais no acervo.
            </div>
        `;
        adicionarBotaoCarregarMais(lista);
        return;
    }

    resultado.forEach(f => criarCardFrase(f, lista));
    adicionarBotaoCarregarMais(lista);
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
        <div class="conteudoFrase">
            ${categoriaLimpa ? `<span class="categoriaBadge">${categoriaLimpa}</span>` : ""}
            <p class="textoFrase">"${f.texto}"</p>
            <p class="autorFrase">â€” ${f.autor || "Messias"}</p>
            
            <div class="acoesFrase">
                <button type="button" class="btnAcao btnCopiar" title="Copiar texto">
                    ðŸ“‹ Copiar
                </button>
                <button type="button" class="btnAcao btnFavorito" title="Favoritar">
                    ${favoritos.includes(f.id) ? "â¤ï¸" : "ðŸ¤"}
                </button>
                <button type="button" class="btnAcao btnEditor" title="Criar VÃ­deo">
                    ðŸŽ¬ VÃ­deo
                </button>
                <button type="button" class="btnAcao btnBaixarImagem" title="Baixar Card como Imagem">
                    ðŸ–¼ï¸ Baixar
                </button>
            </div>
        </div>
        <div class="imagemFrase">
            <img src="${imagem}" alt="Imagem ilustrativa"
                loading="lazy"
                decoding="async"
                onerror="this.onerror=null; this.src='https://picsum.photos/seed/${encodeURIComponent(semente)}/${larguraImg}/${alturaImg}';"
            >
        </div>
    `;

    const btnCopiar = card.querySelector(".btnCopiar");
    const btnFavorito = card.querySelector(".btnFavorito");
    const btnEditor = card.querySelector(".btnEditor");
    const btnBaixarImagem = card.querySelector(".btnBaixarImagem");

    btnCopiar.addEventListener("click", () => copiarFrase(f.texto, f.autor, btnCopiar));
    btnFavorito.addEventListener("click", () => alternarFavorito(f.id, btnFavorito));
    btnEditor.addEventListener("click", () => abrirEditorVideo(f.texto, f.autor));
    btnBaixarImagem.addEventListener("click", () => baixarCardComoImagem(f, imagem, btnBaixarImagem
