ffimport { db } from "./firebase.js";
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
// PRÉVIA DA REDE SOCIAL
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
    link.setAttribute("aria-label", "Ver publicação de " + (publicacao.autorNome || "membro da comunidade") + " na Rede Social");

    const cabecalho = document.createElement("div");
    cabecalho.className = "meta-previa-comunidade";

    const autor = document.createElement("strong");
    autor.textContent = publicacao.autorNome || "Membro da comunidade";

    const categoria = document.createElement("span");
    categoria.textContent = publicacao.categoria || "Comunidade";
    cabecalho.append(autor, categoria);

    const texto = document.createElement("blockquote");
    const conteudo = String(publicacao.texto || "").trim();
    texto.textContent = `“${conteudo.length > 170 ? conteudo.slice(0, 170).trimEnd() + "…" : conteudo}”`;

    const rodape = document.createElement("span");
    rodape.className = "link-cartao-previa";
    const data = dataDaPublicacaoSocial(publicacao.publicadoEm || publicacao.criadoEm);
    const dataFormatada = data
        ? data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
        : "Na Rede Social";
    rodape.textContent = `${dataFormatada} · Ver publicação →`;

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
            estado.textContent = "A Comunidade está começando. Seja uma das primeiras pessoas a compartilhar uma frase inspiradora.";
            lista.appendChild(estado);
            return;
        }

        publicacoes.forEach(publicacao => lista.appendChild(criarCartaoPreviaComunidade(publicacao)));
    } catch (erro) {
        console.error("Não foi possível carregar a prévia da Comunidade:", erro);
        lista.replaceChildren();
        const estado = document.createElement("p");
        estado.className = "estado-previa-comunidade";
        estado.textContent = "As publicações recentes não puderam ser carregadas agora.";
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
    mostrarFrases(lista, filtrosAtuais());
}

// ======================
// ABRIR EDITOR DE VÍDEO
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
    const descricao = autor ? ` por autor “${autor}”` : (texto ? ` para “${texto}”` : ` em “${categoria}”`);
    const sufixoCarregamento = haMaisFrases ? ` entre as ${frases.length} carregadas até agora` : "";
    mensagem.textContent = quantidade === 1
        ? `1 frase encontrada${descricao}${sufixoCarregamento}.`
        : `${quantidade} frases encontradas${descricao}${sufixoCarregamento}.`;

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
            alert("Não foi possível carregar mais frases agora. Tente novamente.");
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
                😔 Nenhuma frase encontrada entre as frases carregadas. Você pode buscar mais no acervo.
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
            <p class="autorFrase">— ${f.autor || "Messias"}</p>
            
            <div class="acoesFrase">
                <button type="button" class="btnAcao btnCopiar" title="Copiar texto">
                    📋 Copiar
                </button>
                <button type="button" class="btnAcao btnFavorito" title="Favoritar">
                    ${favoritos.includes(f.id) ? "❤️" : "🤍"}
                </button>
                <button type="button" class="btnAcao btnEditor" title="Criar Vídeo">
                    🎬 Vídeo
                </button>
                <button type="button" class="btnAcao btnBaixarImagem" title="Baixar Card como Imagem">
                    🖼️ Baixar
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
    btnBaixarImagem.addEventListener("click", () => baixarCardComoImagem(f, imagem, btnBaixarImagem));

    lista.appendChild(card);
}

// ======================
// AÇÕES DOS CARDS
// ======================
async function copiarFrase(texto, autor, botao) {
    const conteudo = `"${texto}" — ${autor || "Messias"}`;
    try {
        await navigator.clipboard.writeText(conteudo);
        const textoOriginal = botao.innerHTML;
        botao.innerHTML = "✅ Copiado!";
        setTimeout(() => { botao.innerHTML = textoOriginal; }, 2000);
    } catch (err) {
        alert("Não foi possível copiar o texto automaticamente.");
    }
}

function alternarFavorito(id, botao) {
    const index = favoritos.indexOf(id);
    if (index === -1) {
        favoritos.push(id);
        botao.innerHTML = "❤️";
    } else {
        favoritos.splice(index, 1);
        botao.innerHTML = "🤍";
    }
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
}

// ======================
// GERAÇÃO DE IMAGEM (CANVAS)
// ======================
async function baixarCardComoImagem(fraseObj, urlImagem, botao) {
    const textoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = "⏳ Gerando...";

    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const largura = 1080;
        const altura = 1080;
        canvas.width = largura;
        canvas.height = altura;

        const urlProxy = urlParaProxyImagem(urlImagem);
        try {
            const { imagem } = await carregarImagemParaCanvas(urlProxy || urlImagem);
            ctx.drawImage(imagem, 0, 0, largura, altura);
        } catch (_) {
            const grad = ctx.createLinearGradient(0, 0, 0, altura);
            grad.addColorStop(0, "#1e3a5f");
            grad.addColorStop(1, "#0f172a");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, largura, altura);
        }

        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(0, 0, largura, altura);

        const texto = `"${fraseObj.texto}"`;
        const autor = `— ${fraseObj.autor || "Messias"}`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const tamanhoFonte = 48;
        ctx.font = `bold ${tamanhoFonte}px sans-serif`;
        const maxLargura = largura * 0.82;
        const palavras = texto.split(" ");
        let linhas = [];
        let linhaAtual = "";

        palavras.forEach(p => {
            const teste = linhaAtual + p + " ";
            if (ctx.measureText(teste).width > maxLargura && linhaAtual !== "") {
                linhas.push(linhaAtual.trim());
                linhaAtual = p + " ";
            } else {
                linhaAtual = teste;
            }
        });
        if (linhaAtual) linhas.push(linhaAtual.trim());

        const alturaLinha = tamanhoFonte * 1.3;
        const alturaTotal = linhas.length * alturaLinha;
        let yInicial = (altura - alturaTotal) / 2 - 20;

        linhas.forEach(linha => {
            ctx.fillText(linha, largura / 2, yInicial);
            yInicial += alturaLinha;
        });

        ctx.font = "italic 32px sans-serif";
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(autor, largura / 2, yInicial + 30);

        ctx.font = "600 22px sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillText("Frases de Messias", largura / 2, altura - 50);

        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `frase-${fraseObj.id || "messias"}.png`;
        a.click();

        botao.innerHTML = "✅ Salvo!";
    } catch (erro) {
        console.error("Erro ao gerar imagem do card:", erro);
        alert("Não foi possível gerar a imagem para download.");
    } finally {
        setTimeout(() => {
            botao.disabled = false;
            botao.innerHTML = textoOriginal;
        }, 2000);
    }
}

// ======================
// MOSTRAR CATEGORIAS
// ======================
function mostrarCategorias(container, campoPesquisa, containerListaFrases) {
    if (!container) return;
    container.innerHTML = "";

    const listaNomes = Object.keys(categorias);
    if (!listaNomes.length) return;

    const btnTodas = document.createElement("button");
    btnTodas.type = "button";
    btnTodas.className = `btnCategoria ${categoriaSelecionada === "" ? "ativa" : ""}`;
    btnTodas.textContent = "Todas";
    btnTodas.addEventListener("click", () => {
        categoriaSelecionada = "";
        atualizarBotoesCategoria(container);
        mostrarFrases(containerListaFrases, filtrosAtuais());
    });
    container.appendChild(btnTodas);

    listaNomes.forEach(nome => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btnCategoria ${normalizarCategoria(categoriaSelecionada) === normalizarCategoria(nome) ? "ativa" : ""}`;
        btn.textContent = nome;
        btn.addEventListener("click", () => {
            categoriaSelecionada = nome;
            atualizarBotoesCategoria(container);
            mostrarFrases(containerListaFrases, filtrosAtuais());
        });
        container.appendChild(btn);
    });
}

function atualizarBotoesCategoria(container) {
    const botoes = container.querySelectorAll(".btnCategoria");
    botoes.forEach(btn => {
        const texto = btn.textContent;
        if (texto === "Todas" && categoriaSelecionada === "") {
            btn.classList.add("ativa");
        } else if (normalizarCategoria(texto) === normalizarCategoria(categoriaSelecionada)) {
            btn.classList.add("ativa");
        } else {
            btn.classList.remove("ativa");
        }
    });
}

// ======================
// INICIALIZAÇÃO E EVENTOS
// ======================
document.addEventListener("DOMContentLoaded", () => {
    const listaFrases = document.getElementById("listaFrases");
    const fraseDiaElemento = document.getElementById("fraseDia");
    const listaCategorias = document.getElementById("listaCategorias");
    const pesquisa = document.getElementById("pesquisa");
    const pesquisaAutor = document.getElementById("pesquisaAutor");

    carregarFrases(listaFrases, fraseDiaElemento, listaCategorias, pesquisa);
    carregarPreviaComunidade();

    const manipularInputBusca = () => {
        clearTimeout(temporizadorBusca);
        temporizadorBusca = setTimeout(() => {
            atualizarListaComFiltros();
        }, 300);
    };

    if (pesquisa) pesquisa.addEventListener("input", manipularInputBusca);
    if (pesquisaAutor) pesquisaAutor.addEventListener("input", manipularInputBusca);
});
