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

// Permite consultas naturais, como “frases de amor” ou “mensagens de fé”.
// Palavras de contexto são ignoradas e o tema restante é comparado com
// o texto, o autor e a categoria de cada frase.
function termosRelevantesDaBusca(texto = "") {
    const palavrasIgnoradas = new Set([
        "a", "as", "o", "os", "de", "da", "das", "do", "dos", "e", "em", "para", "por", "com", "sobre",
        "frase", "frases", "mensagem", "mensagens", "pensamento", "pensamentos"
    ]);

    return normalizarParaBusca(String(texto))
        .split(/[^a-z0-9]+/)
        .filter(palavra => palavra && !palavrasIgnoradas.has(palavra));
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
        const jaRegistrouNestaSessao = sessionStorage.getItem(chaveVisita) === "true";

        // A transação lê o valor atual e grava somente o próximo número inteiro.
        // Assim, ela respeita a regra pública do Firestore, que permite alterar
        // exclusivamente o campo "visitas" em +1, e evita perder contagens
        // quando duas pessoas entram no site ao mesmo tempo.
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
        // A filtragem espelha o feed público: somente conteúdo já aprovado é exibido.
        // A ordenação no navegador mantém a consulta compatível com os índices existentes.
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

        // As categorias são poucas e são carregadas uma única vez.
        const consultaCategorias = await getDocs(collection(db, "categorias"));
        consultaCategorias.forEach(docSnap => {
            const dados = docSnap.data();
            const nomeLimpo = sanitizarTexto(dados.nome || "");
            if (nomeLimpo) categorias[nomeLimpo] = dados.imagem;
        });

        // Carrega somente o primeiro lote. Os demais são buscados por ação do visitante.
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
    areaMais.style.cssText = "text-align:center; padding:18px 0 8px;";
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

    // Mantém compatibilidade com chamadas antigas que enviavam apenas um texto.
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

        // Primeiro preserva a busca exata. Se o visitante escrever uma frase
        // natural, cada termo relevante também é considerado; assim “frases de
        // amor” encontra a categoria Amor, e “mensagens de fé” encontra Fé.
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
            <div class="semResultado" style="text-align:center; padding: 20px;">
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
// CRIAR CARD PROFISSIONAL
// ======================
function criarCardFrase(f, lista) {
    if (!lista || !f) return;

    const categoriaLimpa = sanitizarTexto(String(f.categoria || ""));
    const textoFrase = sanitizarTexto(String(f.texto || "")).trim();
    const autorFrase = sanitizarTexto(String(f.autor || "Messias")).trim();

    // Tamanho adequado para celular e computador
    const larguraImg = window.innerWidth < 600 ? 800 : 1200;
    const alturaImg = window.innerWidth < 600 ? 1000 : 800;

    const semente = String(f.id || textoFrase || "frase-messias")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .slice(0, 60);

    // Verifica se existe uma imagem cadastrada no Firebase.
    let imagem = "";

    if (typeof f.imagem === "string" && f.imagem.trim()) {
        imagem = normalizarUrlImagem(f.imagem.trim());
    }

    // Se não houver imagem da frase, tenta usar a imagem da categoria.
    if (!imagem && categoriaLimpa) {
        const chaveCategoria = Object.keys(categorias).find(
            chave => normalizarCategoria(chave) === normalizarCategoria(categoriaLimpa)
        );

        if (chaveCategoria && categorias[chaveCategoria]) {
            imagem = normalizarUrlImagem(categorias[chaveCategoria]);
        }
    }

    // Último recurso: imagem automática estável.
    if (!imagem) {
        imagem = `https://picsum.photos/seed/${encodeURIComponent(semente)}/${larguraImg}/${alturaImg}`;
    }

    const card = document.createElement("article");
    card.className = "cardFrase profissional";

    // ==========================
    // ÁREA DA IMAGEM
    // ==========================
    const imagemFrase = document.createElement("div");
    imagemFrase.className = "imagemFrase profissionalImagem";

    const img = document.createElement("img");
    img.src = imagem;
    img.alt = textoFrase
        ? `Frase de Messias: ${textoFrase}`
        : "Frases de Messias";
    img.loading = "lazy";
    img.decoding = "async";

    // Caso a imagem falhe, cria uma imagem alternativa.
    img.onerror = function () {
        this.onerror = null;
        this.src = `https://picsum.photos/seed/${encodeURIComponent(
            semente + "-fallback"
        )}/${larguraImg}/${alturaImg}`;
    };

    // ==========================
    // SOBREPOSIÇÃO PROFISSIONAL
    // ==========================
    const overlay = document.createElement("div");
    overlay.className = "overlayFrase";

    // Pequeno brilho decorativo
    const brilho = document.createElement("div");
    brilho.className = "brilhoFrase";
    brilho.setAttribute("aria-hidden", "true");

    // Marca
    const marcaTopo = document.createElement("div");
    marcaTopo.className = "marcaTopo";
    marcaTopo.innerHTML = `
        <span class="marcaIcone">✦</span>
        <span>FRASES DE MESSIAS</span>
    `;

    // Categoria
    if (categoriaLimpa) {
        const categoria = document.createElement("div");
        categoria.className = "categoriaImagem";
        categoria.textContent = categoriaLimpa;
        overlay.appendChild(categoria);
    }

    // Frase
    const frase = document.createElement("p");
    frase.className = "textoImagem";
    frase.textContent = `“${textoFrase}”`;

    // Autor
    const autor = document.createElement("p");
    autor.className = "autorImagem";
    autor.textContent = `— ${autorFrase || "Messias"}`;

    // Marca inferior
    const marca = document.createElement("div");
    marca.className = "marcaImagem";
    marca.innerHTML = `
        <span>📖</span>
        <span>Frases de Messias</span>
    `;

    overlay.append(
        brilho,
        marcaTopo,
        frase,
        autor,
        marca
    );

    imagemFrase.append(img, overlay);

    // ==========================
    // BOTÕES
    // ==========================
    const botoes = document.createElement("div");
    botoes.className = "botoes botoesFrase";

    const btnCurtir = document.createElement("button");
    btnCurtir.type = "button";
    btnCurtir.className = "btnAcao btnCurtir";
    btnCurtir.innerHTML = favoritos.includes(f.id)
        ? "❤️ Curtido"
        : "🤍 Curtir";
    btnCurtir.title = "Favoritar frase";

    const btnCopiar = document.createElement("button");
    btnCopiar.type = "button";
    btnCopiar.className = "btnAcao btnCopiar";
    btnCopiar.innerHTML = "📋 Copiar";
    btnCopiar.title = "Copiar frase";

    const btnVideo = document.createElement("button");
    btnVideo.type = "button";
    btnVideo.className = "btnAcao btnVideo";
    btnVideo.innerHTML = "🎬 Vídeo";
    btnVideo.title = "Criar vídeo com esta frase";

    const btnBaixar = document.createElement("button");
    btnBaixar.type = "button";
    btnBaixar.className = "btnAcao btnBaixarImagem";
    btnBaixar.innerHTML = "🖼️ Baixar";
    btnBaixar.title = "Baixar imagem com a frase";

    botoes.append(
        btnCurtir,
        btnCopiar,
        btnVideo,
        btnBaixar
    );

    card.append(
        imagemFrase,
        botoes
    );

    // ==========================
    // EVENTOS
    // ==========================
    btnCurtir.addEventListener("click", () => {
        alternarFavorito(f.id, btnCurtir);
    });

    btnCopiar.addEventListener("click", () => {
        copiarFrase(
            textoFrase,
            autorFrase,
            btnCopiar
        );
    });

    btnVideo.addEventListener("click", () => {
        abrirEditorVideo(
            textoFrase,
            autorFrase || "Messias"
        );
    });

    btnBaixar.addEventListener("click", () => {
        baixarCardComoImagem(
            f,
            imagem,
            btnBaixar
        );
    });

    lista.appendChild(card);
        }
