import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    doc,
    runTransaction,
    query,
    where,
    limit
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";


// ============================================================
// CONFIGURAÇÕES
// ============================================================

const ORIGEM_PROXY_IMAGEM =
    "https://frasesdemessiascombr.vercel.app";

const TAMANHO_DOWNLOAD = {
    largura: 1080,
    altura: 1350
};


// ============================================================
// ESTADO DO SITE
// ============================================================

let frases = [];
let categorias = {};

let favoritos = JSON.parse(
    localStorage.getItem("favoritos") || "[]"
);

let categoriaSelecionada = "";

let frasesCarregadas = false;

let temporizadorBusca = null;


// ============================================================
// ELEMENTOS
// ============================================================

const listaFrases =
    document.getElementById("listaFrases");

const pesquisa =
    document.getElementById("pesquisa");

const pesquisaAutor =
    document.getElementById("pesquisaAutor");

const listaCategorias =
    document.getElementById("listaCategorias");

const fraseDiaElemento =
    document.getElementById("fraseDia") ||
    document.getElementById("fraseDoDia");


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function sanitizarTexto(texto = "") {
    return String(texto)
        .trim();
}


function normalizarParaBusca(texto = "") {
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


function normalizarCategoria(texto = "") {
    return normalizarParaBusca(
        String(texto)
            .replace(/[-_]+/g, " ")
    )
        .replace(/\s+/g, " ")
        .trim();
}


function escaparHtml(texto = "") {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function obterTextoFrase(frase) {
    return String(
        frase?.texto ||
        frase?.frase ||
        frase?.mensagem ||
        ""
    ).trim();
}


function obterAutorFrase(frase) {
    return String(
        frase?.autor ||
        "Messias"
    ).trim() || "Messias";
}


function obterCategoriaFrase(frase) {
    return String(
        frase?.categoria ||
        ""
    ).trim();
}


// ============================================================
// IMAGENS
// ============================================================

function normalizarUrlImagem(url = "") {

    const valor = String(url || "").trim();

    if (!valor) {
        return "";
    }

    try {

        const origem = new URL(
            valor,
            window.location.href
        );

        /*
         * Converte imagens antigas do GitHub Pages
         * para o domínio atual.
         */

        if (
            origem.hostname === "messiasmoraes.github.io" &&
            origem.pathname.startsWith(
                "/Frases-de-Messias/"
            )
        ) {

            origem.pathname =
                origem.pathname.replace(
                    /^\/Frases-de-Messias\//,
                    "/"
                );

            origem.protocol =
                window.location.protocol;

            origem.host =
                window.location.host;
        }

        return origem.href;

    } catch (erro) {

        console.warn(
            "URL de imagem inválida:",
            url
        );

        return "";
    }
}


function obterImagemDaFrase(frase) {

    const categoria =
        obterCategoriaFrase(frase);

    const categoriaNormalizada =
        normalizarCategoria(categoria);

    let imagem =
        String(
            frase?.imagem ||
            frase?.image ||
            ""
        ).trim();

    /*
     * Se a frase tiver imagem própria,
     * usa essa imagem.
     */

    if (imagem) {
        return normalizarUrlImagem(imagem);
    }

    /*
     * Caso não tenha, procura a imagem
     * cadastrada na coleção categorias.
     */

    if (
        categoriaNormalizada &&
        categorias[categoriaNormalizada]
    ) {

        return normalizarUrlImagem(
            categorias[categoriaNormalizada]
        );
    }

    /*
     * Último fallback.
     */

    const id =
        String(frase?.id || "frase-messias");

    return `https://picsum.photos/seed/${encodeURIComponent(
        id
    )}/800/600`;
}


function urlParaProxyImagem(url = "") {

    const valor =
        String(url || "").trim();

    if (!valor) {
        return "";
    }

    try {

        const origem =
            new URL(
                valor,
                window.location.href
            );

        /*
         * Se já está no mesmo domínio,
         * não precisa passar pelo proxy.
         */

        if (
            origem.origin ===
            window.location.origin
        ) {
            return origem.href;
        }

        /*
         * Só aceitamos HTTPS.
         */

        if (
            origem.protocol !== "https:"
        ) {
            return "";
        }

        const proxyBase =
            window.location.hostname.endsWith(
                ".vercel.app"
            )
                ? window.location.origin
                : ORIGEM_PROXY_IMAGEM;

        return (
            proxyBase +
            "/api/image?url=" +
            encodeURIComponent(
                origem.href
            )
        );

    } catch (erro) {

        console.error(
            "Erro ao criar proxy da imagem:",
            erro
        );

        return "";
    }
}


// ============================================================
// CARREGAR IMAGEM PARA CANVAS
// ============================================================

async function carregarImagemParaCanvas(url) {

    const resposta =
        await fetch(
            url,
            {
                cache: "no-store",
                mode: "cors"
            }
        );

    if (!resposta.ok) {
        throw new Error(
            "Não foi possível carregar a imagem."
        );
    }

    const tipo =
        resposta.headers.get(
            "content-type"
        ) || "";

    if (
        !tipo
            .toLowerCase()
            .startsWith("image/")
    ) {
        throw new Error(
            "O endereço não retornou uma imagem."
        );
    }

    const blob =
        await resposta.blob();

    if (!blob.size) {
        throw new Error(
            "A imagem está vazia."
        );
    }

    const objectUrl =
        URL.createObjectURL(blob);

    const imagem =
        new Image();

    imagem.decoding = "async";

    try {

        await new Promise(
            (resolve, reject) => {

                const timeout =
                    setTimeout(
                        () => {
                            reject(
                                new Error(
                                    "Tempo esgotado ao carregar a imagem."
                                )
                            );
                        },
                        15000
                    );

                imagem.onload = () => {

                    clearTimeout(
                        timeout
                    );

                    resolve();
                };

                imagem.onerror = () => {

                    clearTimeout(
                        timeout
                    );

                    reject(
                        new Error(
                            "A imagem não pôde ser carregada."
                        )
                    );
                };

                imagem.src =
                    objectUrl;
            }
        );

        if (
            !imagem.naturalWidth ||
            !imagem.naturalHeight
        ) {
            throw new Error(
                "Imagem sem dimensões válidas."
            );
        }

        return {
            imagem,
            liberar: () =>
                URL.revokeObjectURL(
                    objectUrl
                )
        };

    } catch (erro) {

        URL.revokeObjectURL(
            objectUrl
        );

        throw erro;
    }
}


// ============================================================
// CARREGANDO / ERRO
// ============================================================

function mostrarCarregando() {

    if (!listaFrases) {
        return;
    }

    listaFrases.innerHTML = `
        <div
            class="carregando"
            style="
                grid-column:1/-1;
                text-align:center;
                padding:50px 20px;
            "
        >
            ⏳ Carregando frases...
        </div>
    `;
}


function mostrarErro(mensagem) {

    if (!listaFrases) {
        return;
    }

    listaFrases.innerHTML = `
        <div
            class="erro"
            style="
                grid-column:1/-1;
                text-align:center;
                padding:30px 20px;
            "
        >
            ❌ ${escaparHtml(mensagem)}
        </div>
    `;
}


// ============================================================
// FRASE DO DIA
// ============================================================

function fraseDoDia() {

    if (
        !fraseDiaElemento ||
        frases.length === 0
    ) {
        return;
    }

    const indice =
        Math.floor(
            Math.random() *
            frases.length
        );

    const frase =
        frases[indice];

    const texto =
        obterTextoFrase(frase);

    const autor =
        obterAutorFrase(frase);

    fraseDiaElemento.textContent =
        `"${texto}" — ${autor}`;
}


// ============================================================
// CONTADOR GLOBAL
// ============================================================

async function contarVisitaGlobal() {

    const contador =
        document.getElementById(
            "contadorGlobal"
        );

    const chave =
        "visita_global_registrada";

    try {

        const ref =
            doc(
                db,
                "estatisticas",
                "global"
            );

        const jaRegistrou =
            sessionStorage.getItem(
                chave
            ) === "true";

        const total =
            await runTransaction(
                db,
                async transacao => {

                    const resultado =
                        await transacao.get(
                            ref
                        );

                    const atual =
                        Number(
                            resultado.data()
                                ?.visitas || 0
                        );

                    if (jaRegistrou) {
                        return atual;
                    }

                    const novoTotal =
                        atual + 1;

                    /*
                     * set com merge funciona
                     * mesmo se o documento ainda
                     * não existir.
                     */

                    transacao.set(
                        ref,
                        {
                            visitas:
                                novoTotal
                        },
                        {
                            merge: true
                        }
                    );

                    return novoTotal;
                }
            );

        if (!jaRegistrou) {
            sessionStorage.setItem(
                chave,
                "true"
            );
        }

        if (contador) {

            contador.textContent =
                Number(total)
                    .toLocaleString(
                        "pt-BR"
                    );
        }

    } catch (erro) {

        console.error(
            "Erro no contador global:",
            erro
        );
    }
}


// ============================================================
// CARREGAR CATEGORIAS
// ============================================================

async function carregarCategorias() {

    categorias = {};

    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "categorias"
                )
            );

        snapshot.forEach(
            docSnap => {

                const dados =
                    docSnap.data();

                const nome =
                    sanitizarTexto(
                        dados.nome || ""
                    );

                const imagem =
                    String(
                        dados.imagem ||
                        ""
                    ).trim();

                if (
                    nome &&
                    imagem
                ) {

                    categorias[
                        normalizarCategoria(
                            nome
                        )
                    ] = imagem;
                }
            }
        );

        console.log(
            "Categorias carregadas:",
            Object.keys(categorias).length
        );

    } catch (erro) {

        console.warn(
            "Não foi possível carregar categorias:",
            erro
        );
    }
}


// ============================================================
// CARREGAR TODAS AS FRASES
// ============================================================

async function carregarTodasAsFrases() {

    frases = [];

    /*
     * IMPORTANTE:
     *
     * Aqui não usamos limit(24),
     * startAfter ou paginação.
     *
     * O Firestore retorna toda a coleção
     * "frases".
     */

    const snapshot =
        await getDocs(
            collection(
                db,
                "frases"
            )
        );

    snapshot.forEach(
        docSnap => {

            const dados =
                docSnap.data();

            const texto =
                obterTextoFrase(
                    dados
                );

            /*
             * Ignora somente documentos
             * que realmente não tenham texto.
             */

            if (!texto) {
                return;
            }

            frases.push({
                id: docSnap.id,
                ...dados,
                texto
            });
        }
    );

    /*
     * Ordena de forma estável pelo texto.
     * Se quiser manter exatamente a ordem
     * do Firestore, basta remover este sort.
     */

    frases.sort(
        (a, b) =>
            String(a.texto)
                .localeCompare(
                    String(b.texto),
                    "pt-BR"
                )
    );

    console.log(
        `✅ ${frases.length} frases carregadas do Firestore.`
    );
}


// ============================================================
// MOSTRAR CATEGORIAS
// ============================================================

function mostrarCategorias() {

    if (!listaCategorias) {
        return;
    }

    listaCategorias.innerHTML = "";

    /*
     * Descobre categorias diretamente
     * das frases, mesmo que a coleção
     * "categorias" esteja incompleta.
     */

    const mapaCategorias =
        new Map();

    frases.forEach(
        frase => {

            const nome =
                obterCategoriaFrase(
                    frase
                );

            if (!nome) {
                return;
            }

            const chave =
                normalizarCategoria(
                    nome
                );

            if (!mapaCategorias.has(chave)) {

                mapaCategorias.set(
                    chave,
                    nome
                );
            }
        }
    );

    /*
     * Botão Todas
     */

    const todas =
        document.createElement(
            "button"
        );

    todas.type = "button";

    todas.className =
        "categoriaBtn" +
        (
            !categoriaSelecionada
                ? " ativo"
                : ""
        );

    todas.textContent =
        "📚 Todas";

    todas.addEventListener(
        "click",
        () => {

            categoriaSelecionada =
                "";

            mostrarCategorias();

            atualizarListaComFiltros();

            document
                .getElementById(
                    "todas-as-frases"
                )
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
        }
    );

    listaCategorias.appendChild(
        todas
    );

    /*
     * Categorias
     */

    Array.from(
        mapaCategorias.entries()
    )
        .sort(
            (a, b) =>
                a[1].localeCompare(
                    b[1],
                    "pt-BR"
                )
        )
        .forEach(
            ([chave, nome]) => {

                const botao =
                    document.createElement(
                        "button"
                    );

                botao.type = "button";

                botao.className =
                    "categoriaBtn" +
                    (
                        categoriaSelecionada ===
                        chave
                            ? " ativo"
                            : ""
                    );

                botao.textContent =
                    nome;

                botao.addEventListener(
                    "click",
                    () => {

                        categoriaSelecionada =
                            chave;

                        mostrarCategorias();

                        atualizarListaComFiltros();

                        document
                            .getElementById(
                                "todas-as-frases"
                            )
                            ?.scrollIntoView({
                                behavior:
                                    "smooth",
                                block:
                                    "start"
                            });
                    }
                );

                listaCategorias.appendChild(
                    botao
                );
            }
        );
}


// ============================================================
// FILTROS
// ============================================================

function obterFiltros() {

    return {

        texto:
            pesquisa
                ?.value
                ?.trim() || "",

        autor:
            pesquisaAutor
                ?.value
                ?.trim() || "",

        categoria:
            categoriaSelecionada || ""
    };
}


function aplicarFiltros() {

    if (!frasesCarregadas) {
        return;
    }

    mostrarFrases(
        listaFrases,
        obterFiltros()
    );
}


function configurarPesquisas() {

    if (pesquisa) {

        pesquisa.addEventListener(
            "input",
            () => {

                clearTimeout(
                    temporizadorBusca
                );

                temporizadorBusca =
                    setTimeout(
                        aplicarFiltros,
                        200
                    );
            }
        );
    }

    if (pesquisaAutor) {

        pesquisaAutor.addEventListener(
            "input",
            () => {

                clearTimeout(
                    temporizadorBusca
                );

                temporizadorBusca =
                    setTimeout(
                        aplicarFiltros,
                        200
                    );
            }
        );
    }
}


// ============================================================
// STATUS DA PESQUISA
// ============================================================

function atualizarStatusPesquisa(
    quantidade,
    filtros
) {

    const status =
        document.getElementById(
            "statusPesquisa"
        );

    if (!status) {
        return;
    }

    const texto =
        String(
            filtros?.texto || ""
        ).trim();

    const autor =
        String(
            filtros?.autor || ""
        ).trim();

    const categoria =
        String(
            filtros?.categoria || ""
        ).trim();

    const ativa =
        Boolean(
            texto ||
            autor ||
            categoria
        );

    if (!ativa) {

        status.hidden = true;
        status.textContent = "";

        return;
    }

    status.hidden = false;

    let descricao = "";

    if (autor) {

        descricao =
            ` por autor "${autor}"`;

    } else if (texto) {

        descricao =
            ` para "${texto}"`;

    } else if (categoria) {

        const categoriaOriginal =
            frases.find(
                f =>
                    normalizarCategoria(
                        obterCategoriaFrase(f)
                    ) === categoria
            );

        descricao =
            ` em "${categoriaOriginal
                ? obterCategoriaFrase(
                    categoriaOriginal
                )
                : categoria}"`;
    }

    status.textContent =
        quantidade === 1
            ? `1 frase encontrada${descricao}.`
            : `${quantidade} frases encontradas${descricao}.`;
}


// ============================================================
// MOSTRAR FRASES
// ============================================================

function mostrarFrases(
    lista,
    filtros = {}
) {

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    const textoBusca =
        normalizarParaBusca(
            filtros.texto || ""
        );

    const autorBusca =
        normalizarParaBusca(
            filtros.autor || ""
        );

    const categoriaBusca =
        normalizarCategoria(
            filtros.categoria || ""
        );

    const resultados =
        frases.filter(
            frase => {

                const texto =
                    normalizarParaBusca(
                        obterTextoFrase(
                            frase
                        )
                    );

                const autor =
                    normalizarParaBusca(
                        obterAutorFrase(
                            frase
                        )
                    );

                const categoria =
                    normalizarCategoria(
                        obterCategoriaFrase(
                            frase
                        )
                    );

                const correspondeTexto =
                    !textoBusca ||
                    texto.includes(
                        textoBusca
                    ) ||
                    categoria.includes(
                        textoBusca
                    ) ||
                    autor.includes(
                        textoBusca
                    );

                const correspondeAutor =
                    !autorBusca ||
                    autor.includes(
                        autorBusca
                    );

                const correspondeCategoria =
                    !categoriaBusca ||
                    categoria ===
                    categoriaBusca;

                return (
                    correspondeTexto &&
                    correspondeAutor &&
                    correspondeCategoria
                );
            }
        );

    atualizarStatusPesquisa(
        resultados.length,
        filtros
    );

    if (
        resultados.length === 0
    ) {

        lista.innerHTML = `
            <div
                class="semResultado"
                style="
                    grid-column:1/-1;
                    text-align:center;
                    padding:50px 20px;
                "
            >
                😔 Nenhuma frase encontrada.
                <br>
                Tente outra palavra,
                categoria ou autor.
            </div>
        `;

        return;
    }

    /*
     * Cria todos os cards.
     */

    resultados.forEach(
        frase => {

            lista.appendChild(
                criarCardFrase(
                    frase
                )
            );
        }
    );
}


// ============================================================
// CRIAR CARD DA FRASE
// ============================================================

function criarCardFrase(frase) {

    const texto =
        obterTextoFrase(frase);

    const autor =
        obterAutorFrase(frase);

    const categoria =
        obterCategoriaFrase(frase);

    const imagem =
        obterImagemDaFrase(
            frase
        );

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "cardFrase";


    // ========================================================
    // ÁREA DA IMAGEM
    // ========================================================

    const imagemArea =
        document.createElement(
            "div"
        );

    imagemArea.className =
        "imagemFrase";


    const img =
        document.createElement(
            "img"
        );

    img.alt =
        "Frase de Messias";

    img.loading =
        "lazy";

    img.decoding =
        "async";

    img.src =
        imagem;


    /*
     * Fallback de imagem.
     */

    img.addEventListener(
        "error",
        () => {

            if (
                img.dataset.fallback
            ) {
                return;
            }

            img.dataset.fallback =
                "true";

            img.src =
                `https://picsum.photos/seed/${encodeURIComponent(
                    frase.id || "messias"
                )}/800/600`;
        }
    );


    // ========================================================
    // OVERLAY
    // ========================================================

    const overlay =
        document.createElement(
            "div"
        );

    overlay.className =
        "overlay";


    // Categoria

    if (categoria) {

        const badge =
            document.createElement(
                "span"
            );

        badge.className =
            "badgeCategoria";

        badge.textContent =
            categoria;

        overlay.appendChild(
            badge
        );
    }


    // Texto

    const textoElemento =
        document.createElement(
            "p"
        );

    textoElemento.className =
        "textoFrase";

    textoElemento.textContent =
        `"${texto}"`;


    // Autor

    const autorElemento =
        document.createElement(
            "p"
        );

    autorElemento.className =
        "autorFrase";

    autorElemento.textContent =
        `— ${autor}`;


    // Marca

    const marca =
        document.createElement(
            "div"
        );

    marca.className =
        "marca";

    marca.textContent =
        "📖 Frases de Messias";


    overlay.append(
        textoElemento,
        autorElemento,
        marca
    );


    imagemArea.append(
        img,
        overlay
    );


    // ========================================================
    // BOTÕES
    // ========================================================

    const botoes =
        document.createElement(
            "div"
        );

    botoes.className =
        "botoes";


    // Favorito

    const btnFavorito =
        document.createElement(
            "button"
        );

    btnFavorito.type =
        "button";

    btnFavorito.className =
        "btnAcao btnFavorito";

    btnFavorito.title =
        "Favoritar";

    atualizarBotaoFavorito(
        btnFavorito,
        frase.id
    );


    // Copiar

    const btnCopiar =
        document.createElement(
            "button"
        );

    btnCopiar.type =
        "button";

    btnCopiar.className =
        "btnAcao btnCopiar";

    btnCopiar.title =
        "Copiar frase";

    btnCopiar.textContent =
        "📋 Copiar";


    // Vídeo

    const btnVideo =
        document.createElement(
            "button"
        );

    btnVideo.type =
        "button";

    btnVideo.className =
        "btnAcao btnEditor";

    btnVideo.title =
        "Criar vídeo";

    btnVideo.textContent =
        "🎬 Vídeo";


    // Baixar

    const btnBaixar =
        document.createElement(
            "button"
        );

    btnBaixar.type =
        "button";

    btnBaixar.className =
        "btnAcao btnBaixarImagem";

    btnBaixar.title =
        "Baixar imagem";

    btnBaixar.textContent =
        "🖼️ Baixar";


    botoes.append(
        btnFavorito,
        btnCopiar,
        btnVideo,
        btnBaixar
    );


    // ========================================================
    // EVENTOS
    // ========================================================

    btnFavorito.addEventListener(
        "click",
        () => {

            alternarFavorito(
                frase.id,
                btnFavorito
            );
        }
    );


    btnCopiar.addEventListener(
        "click",
        () => {

            copiarFrase(
                texto,
                autor,
                btnCopiar
            );
        }
    );


    btnVideo.addEventListener(
        "click",
        () => {

            abrirEditorVideo(
                texto,
                autor
            );
        }
    );


    btnBaixar.addEventListener(
        "click",
        async () => {

            const textoOriginal =
                btnBaixar.textContent;

            btnBaixar.disabled =
                true;

            btnBaixar.textContent =
                "⏳ Gerando...";

            try {

                await baixarCardComoImagem(
                    frase,
                    imagem,
                    btnBaixar
                );

            } catch (erro) {

                console.error(
                    "Erro ao baixar imagem:",
                    erro
                );

                alert(
                    "Não foi possível gerar a imagem agora."
                );

            } finally {

                btnBaixar.disabled =
                    false;

                btnBaixar.textContent =
                    textoOriginal;
            }
        }
    );


    card.append(
        imagemArea,
        botoes
    );

    return card;
}


// ============================================================
// FAVORITOS
// ============================================================

function atualizarBotaoFavorito(
    botao,
    id
) {

    const ativo =
        favoritos.includes(id);

    botao.textContent =
        ativo
            ? "❤️"
            : "🤍";

    botao.classList.toggle(
        "favoritoAtivo",
        ativo
    );
}


function alternarFavorito(
    id,
    botao
) {

    if (!id) {
        return;
    }

    const indice =
        favoritos.indexOf(id);

    if (indice >= 0) {

        favoritos.splice(
            indice,
            1
        );

    } else {

        favoritos.push(id);
    }

    localStorage.setItem(
        "favoritos",
        JSON.stringify(
            favoritos
        )
    );

    if (botao) {

        atualizarBotaoFavorito(
            botao,
            id
        );
    }
}


// ============================================================
// COPIAR FRASE
// ============================================================

async function copiarFrase(
    texto,
    autor,
    botao
) {

    const conteudo =
        `"${texto}" — ${autor}`;

    try {

        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {

            await navigator.clipboard.writeText(
                conteudo
            );

        } else {

            const area =
                document.createElement(
                    "textarea"
                );

            area.value =
                conteudo;

            area.style.position =
                "fixed";

            area.style.left =
                "-9999px";

            document.body.appendChild(
                area
            );

            area.focus();

            area.select();

            document.execCommand(
                "copy"
            );

            area.remove();
        }

        if (botao) {

            const original =
                botao.textContent;

            botao.textContent =
                "✅ Copiado!";

            setTimeout(
                () => {

                    if (
                        document.body.contains(
                            botao
                        )
                    ) {
                        botao.textContent =
                            original;
                    }
                },
                1500
            );
        }

    } catch (erro) {

        console.error(
            "Erro ao copiar:",
            erro
        );

        alert(
            "Não foi possível copiar a frase."
        );
    }
}


// ============================================================
// ABRIR EDITOR DE VÍDEO
// ============================================================

function abrirEditorVideo(
    texto,
    autor = "Messias"
) {

    const frase =
        encodeURIComponent(
            texto
        );

    const autorCod =
        encodeURIComponent(
            autor
        );

    window.location.href =
        `editor.html?frase=${frase}&autor=${autorCod}`;
}


// ============================================================
// TEXTO NO CANVAS
// ============================================================

function quebrarTextoCanvas(
    ctx,
    texto,
    larguraMaxima
) {

    const palavras =
        String(texto)
            .split(/\s+/);

    const linhas = [];

    let linhaAtual =
        "";

    for (
        const palavra of palavras
    ) {

        const teste =
            linhaAtual
                ? `${linhaAtual} ${palavra}`
                : palavra;

        const largura =
            ctx.measureText(
                teste
            ).width;

        if (
            largura >
                larguraMaxima &&
            linhaAtual
        ) {

            linhas.push(
                linhaAtual
            );

            linhaAtual =
                palavra;

        } else {

            linhaAtual =
                teste;
        }
    }

    if (linhaAtual) {

        linhas.push(
            linhaAtual
        );
    }

    return linhas;
}


// ============================================================
// DESENHAR IMAGEM DE FALLBACK
// ============================================================

function desenharFundoFallback(
    ctx,
    largura,
    altura
) {

    const gradiente =
        ctx.createLinearGradient(
            0,
            0,
            largura,
            altura
        );

    gradiente.addColorStop(
        0,
        "#2563eb"
    );

    gradiente.addColorStop(
        0.55,
        "#1e3a8a"
    );

    gradiente.addColorStop(
        1,
        "#111827"
    );

    ctx.fillStyle =
        gradiente;

    ctx.fillRect(
        0,
        0,
        largura,
        altura
    );
}


// ============================================================
// DESENHAR IMAGEM DE FUNDO
// ============================================================

function desenharImagemCover(
    ctx,
    imagem,
    largura,
    altura
) {

    const proporcaoDestino =
        largura / altura;

    const proporcaoImagem =
        imagem.naturalWidth /
        imagem.naturalHeight;

    let sx = 0;
    let sy = 0;
    let sw =
        imagem.naturalWidth;
    let sh =
        imagem.naturalHeight;

    if (
        proporcaoImagem >
        proporcaoDestino
    ) {

        sw =
            imagem.naturalHeight *
            proporcaoDestino;

        sx =
            (imagem.naturalWidth -
                sw) /
            2;

    } else {

        sh =
            imagem.naturalWidth /
            proporcaoDestino;

        sy =
            (imagem.naturalHeight -
                sh) /
            2;
    }

    ctx.drawImage(
        imagem,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        largura,
        altura
    );
}


// ============================================================
// BAIXAR CARD COMO IMAGEM
// ============================================================

async function baixarCardComoImagem(
    frase,
    imagemUrl,
    botao
) {

    const largura =
        TAMANHO_DOWNLOAD.largura;

    const altura =
        TAMANHO_DOWNLOAD.altura;

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width =
        largura;

    canvas.height =
        altura;

    const ctx =
        canvas.getContext(
            "2d"
        );

    if (!ctx) {
        throw new Error(
            "Canvas não disponível."
        );
    }

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "middle";


    // ========================================================
    // IMAGEM DE FUNDO
    // ========================================================

    let recursoImagem =
        null;

    try {

        const proxy =
            urlParaProxyImagem(
                imagemUrl
            );

        if (proxy) {

            recursoImagem =
                await carregarImagemParaCanvas(
                    proxy
                );

            desenharImagemCover(
                ctx,
                recursoImagem.imagem,
                largura,
                altura
            );
        } else {

            desenharFundoFallback(
                ctx,
                largura,
                altura
            );
        }

    } catch (erro) {

        console.warn(
            "Usando fundo alternativo:",
            erro
        );

        desenharFundoFallback(
            ctx,
            largura,
            altura
        );
    }


    // ========================================================
    // OVERLAY ESCURO
    // ========================================================

    const gradiente =
        ctx.createLinearGradient(
            0,
            0,
            0,
            altura
        );

    gradiente.addColorStop(
        0,
        "rgba(0,0,0,0.20)"
    );

    gradiente.addColorStop(
        0.45,
        "rgba(0,0,0,0.35)"
    );

    gradiente.addColorStop(
        0.72,
        "rgba(0,0,0,0.68)"
    );

    gradiente.addColorStop(
        1,
        "rgba(0,0,0,0.90)"
    );

    ctx.fillStyle =
        gradiente;

    ctx.fillRect(
        0,
        0,
        largura,
        altura
    );


    // ========================================================
    // CATEGORIA
    // ========================================================

    const categoria =
        obterCategoriaFrase(
            frase
        );

    if (categoria) {

        ctx.font =
            "700 28px Arial";

        const larguraTexto =
            ctx.measureText(
                categoria
            ).width;

        const larguraBadge =
            larguraTexto + 55;

        const alturaBadge =
            54;

        const x =
            50;

        const y =
            50;

        ctx.fillStyle =
            "rgba(0,0,0,0.55)";

        ctx.beginPath();

        ctx.roundRect(
            x,
            y,
            larguraBadge,
            alturaBadge,
            27
        );

        ctx.fill();

        ctx.strokeStyle =
            "rgba(255,255,255,0.35)";

        ctx.lineWidth =
            2;

        ctx.stroke();

        ctx.fillStyle =
            "#ffffff";

        ctx.textAlign =
            "left";

        ctx.fillText(
            categoria,
            x + 27,
            y + 35
        );

        ctx.textAlign =
            "center";
    }


    // ========================================================
    // FRASE
    // ========================================================

    const texto =
        obterTextoFrase(
            frase
        );

    const textoCompleto =
        `"${texto}"`;

    let tamanhoFonte =
        64;

    const larguraMaxima =
        900;

    let linhas;

    do {

        ctx.font =
            `800 ${tamanhoFonte}px Arial`;

        linhas =
            quebrarTextoCanvas(
                ctx,
                textoCompleto,
                larguraMaxima
            );

        if (
            linhas.length <= 7
        ) {
            break;
        }

        tamanhoFonte -= 4;

    } while (
        tamanhoFonte >= 36
    );


    const alturaLinha =
        tamanhoFonte * 1.35;

    const alturaTexto =
        linhas.length *
        alturaLinha;

    const centroY =
        altura * 0.50;

    const inicioY =
        centroY -
        alturaTexto / 2;


    // sombra

    ctx.shadowColor =
        "rgba(0,0,0,0.75)";

    ctx.shadowBlur =
        12;

    ctx.shadowOffsetY =
        4;

    ctx.fillStyle =
        "#ffffff";

    linhas.forEach(
        (linha, indice) => {

            ctx.fillText(
                linha,
                largura / 2,
                inicioY +
                indice *
                alturaLinha +
                alturaLinha / 2
            );
        }
    );


    // remove sombra

    ctx.shadowColor =
        "transparent";

    ctx.shadowBlur =
        0;

    ctx.shadowOffsetY =
        0;


    // ========================================================
    // AUTOR
    // ========================================================

    const autor =
        obterAutorFrase(
            frase
        );

    ctx.font =
        "italic 700 38px Arial";

    ctx.fillStyle =
        "rgba(255,255,255,0.96)";

    ctx.fillText(
        `— ${autor}`,
        largura / 2,
        inicioY +
        alturaTexto +
        75
    );


    // ========================================================
    // MARCA
    // ========================================================

    ctx.textAlign =
        "left";

    ctx.font =
        "700 28px Arial";

    ctx.fillStyle =
        "rgba(255,255,255,0.92)";

    ctx.fillText(
        "📖 Frases de Messias",
        55,
        altura - 65
    );


    ctx.textAlign =
        "center";


    // Libera imagem

    if (
        recursoImagem &&
        recursoImagem.liberar
    ) {

        recursoImagem.liberar();
    }


    // ========================================================
    // GERAR PNG
    // ========================================================

    const blob =
        await new Promise(
            (resolve, reject) => {

                canvas.toBlob(
                    resultado => {

                        if (
                            resultado
                        ) {

                            resolve(
                                resultado
                            );

                        } else {

                            reject(
                                new Error(
                                    "Não foi possível criar o PNG."
                                )
                            );
                        }
                    },
                    "image/png",
                    1
                );
            }
        );


    // ========================================================
    // NOME DO ARQUIVO
    // ========================================================

    const nomeArquivo =
        (
            normalizarParaBusca(
                texto
            )
                .replace(
                    /[^a-z0-9]+/g,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    ""
                )
                .slice(
                    0,
                    50
                ) ||
            "frase-de-messias"
        ) +
        ".png";


    // ========================================================
    // COMPARTILHAR OU BAIXAR
    // ========================================================

    const arquivo =
        new File(
            [blob],
            nomeArquivo,
            {
                type:
                    "image/png"
            }
        );


    /*
     * No celular, tenta compartilhar
     * se o navegador permitir.
     *
     * Caso contrário, faz download.
     */

    if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
            files: [arquivo]
        })
    ) {

        try {

            await navigator.share({
                files: [arquivo],
                title:
                    "Frases de Messias",
                text:
                    `"${texto}" — ${autor}`
            });

            return;

        } catch (erro) {

            /*
             * Se o usuário cancelar o
             * compartilhamento, não mostra erro.
             */

            if (
                erro?.name ===
                "AbortError"
            ) {
                return;
            }
        }
    }


    // Download normal

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            "a"
        );

    link.href =
        url;

    link.download =
        nomeArquivo;

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    setTimeout(
        () => {
            URL.revokeObjectURL(
                url
            );
        },
        1000
    );
}


// ============================================================
// PRÉVIA DA COMUNIDADE
// ============================================================

function dataDaPublicacaoSocial(
    valor
) {

    if (
        valor &&
        typeof valor.toDate ===
        "function"
    ) {
        return valor.toDate();
    }

    if (
        valor &&
        typeof valor.seconds ===
        "number"
    ) {

        return new Date(
            valor.seconds * 1000
        );
    }

    if (
        valor instanceof Date
    ) {
        return valor;
    }

    return null;
}


function criarCartaoPreviaComunidade(
    publicacao
) {

    const link =
        document.createElement(
            "a"
        );

    link.className =
        "cartao-previa-comunidade";

    link.href =
        "comunidade.html";

    link.setAttribute(
        "aria-label",
        "Ver publicação de " +
        (
            publicacao.autorNome ||
            "membro da comunidade"
        )
    );


    const cabecalho =
        document.createElement(
            "div"
        );

    cabecalho.className =
        "meta-previa-comunidade";


    const autor =
        document.createElement(
            "strong"
        );

    autor.textContent =
        publicacao.autorNome ||
        "Membro da comunidade";


    const categoria =
        document.createElement(
            "span"
        );

    categoria.textContent =
        publicacao.categoria ||
        "Comunidade";


    cabecalho.append(
        autor,
        categoria
    );


    const texto =
        document.createElement(
            "blockquote"
        );

    const conteudo =
        String(
            publicacao.texto ||
            ""
        ).trim();

    texto.textContent =
        `"${conteudo.length > 170
            ? conteudo.slice(
                0,
                170
            ).trimEnd() + "…"
            : conteudo}"`;


    const rodape =
        document.createElement(
            "span"
        );

    rodape.className =
        "link-cartao-previa";


    const data =
        dataDaPublicacaoSocial(
            publicacao.publicadoEm ||
            publicacao.criadoEm
        );


    const dataFormatada =
        data
            ? data.toLocaleDateString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            )
            : "Na Rede Social";


    rodape.textContent =
        `${dataFormatada} · Ver publicação →`;


    link.append(
        cabecalho,
        texto,
        rodape
    );

    return link;
}


async function carregarPreviaComunidade() {

    const lista =
        document.getElementById(
            "listaPublicacoesComunidade"
        );

    if (!lista) {
        return;
    }

    try {

        const resultado =
            await getDocs(
                query(
                    collection(
                        db,
                        "comunidadePublicacoes"
                    ),
                    where(
                        "status",
                        "==",
                        "publicado"
                    ),
                    limit(12)
                )
            );


        const publicacoes =
            resultado.docs
                .map(
                    item => ({
                        id:
                            item.id,
                        ...item.data()
                    })
                )
                .sort(
                    (
                        primeira,
                        segunda
                    ) => {

                        const dataPrimeira =
                            dataDaPublicacaoSocial(
                                primeira.publicadoEm ||
                                primeira.criadoEm
                            )?.getTime() ||
                            0;

                        const dataSegunda =
                            dataDaPublicacaoSocial(
                                segunda.publicadoEm ||
                                segunda.criadoEm
                            )?.getTime() ||
                            0;

                        return (
                            dataSegunda -
                            dataPrimeira
                        );
                    }
                )
                .slice(
                    0,
                    3
                );


        lista.replaceChildren();


        if (
            !publicacoes.length
        ) {

            const estado =
                document.createElement(
                    "p"
                );

            estado.className =
                "estado-previa-comunidade";

            estado.textContent =
                "A Comunidade está começando. Seja uma das primeiras pessoas a compartilhar uma frase inspiradora.";

            lista.appendChild(
                estado
            );

            return;
        }


        publicacoes.forEach(
            publicacao => {

                lista.appendChild(
                    criarCartaoPreviaComunidade(
                        publicacao
                    )
                );
            }
        );

    } catch (erro) {

        console.error(
            "Erro na comunidade:",
            erro
        );

        lista.replaceChildren();

        const estado =
            document.createElement(
                "p"
            );

        estado.className =
            "estado-previa-comunidade";

        estado.textContent =
            "As publicações recentes não puderam ser carregadas agora.";

        lista.appendChild(
            estado
        );
    }
}


// ============================================================
// MODO ESCURO
// ============================================================

function configurarTema() {

    const botao =
        document.getElementById(
            "temaBtn"
        );

    const temaSalvo =
        localStorage.getItem(
            "tema"
        );


    if (
        temaSalvo === "dark"
    ) {

        document.body.classList.add(
            "dark"
        );
    }


    if (!botao) {
        return;
    }


    atualizarIconeTema(
        botao
    );


    botao.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark"
            );

            const escuro =
                document.body.classList.contains(
                    "dark"
                );

            localStorage.setItem(
                "tema",
                escuro
                    ? "dark"
                    : "light"
            );

            atualizarIconeTema(
                botao
            );
        }
    );
}


function atualizarIconeTema(
    botao
) {

    const escuro =
        document.body.classList.contains(
            "dark"
        );

    botao.textContent =
        escuro
            ? "☀️"
            : "🌙";

    botao.setAttribute(
        "aria-label",
        escuro
            ? "Ativar modo claro"
            : "Ativar modo escuro"
    );
}


// ============================================================
// EXPOR FUNÇÕES PARA OUTROS ARQUIVOS
// ============================================================

window.copiarFrase =
    copiarFrase;

window.alternarFavorito =
    alternarFavorito;

window.abrirEditorVideo =
    abrirEditorVideo;

window.baixarCardComoImagem =
    baixarCardComoImagem;

window.mostrarFrases =
    mostrarFrases;


// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function iniciarSite() {

    console.log(
        "🚀 Iniciando Frases de Messias..."
    );

    mostrarCarregando();


    try {

        /*
         * Carrega categorias e frases.
         */

        await carregarCategorias();

        await carregarTodasAsFrases();


        /*
         * Verificação importante.
         */

        if (
            !frases.length
        ) {

            frasesCarregadas =
                false;

            mostrarErro(
                "Nenhuma frase foi encontrada na coleção \"frases\" do Firestore."
            );

            return;
        }


        frasesCarregadas =
            true;


        console.log(
            `✅ Total de frases disponíveis: ${frases.length}`
        );


        /*
         * Exibe frase do dia.
         */

        fraseDoDia();


        /*
         * Exibe categorias.
         */

        mostrarCategorias();


        /*
         * Exibe todas as frases.
         */

        mostrarFrases(
            listaFrases,
            obterFiltros()
        );


        /*
         * Configura pesquisa.
         */

        configurarPesquisas();


        /*
         * Tema.
         */

        configurarTema();


        /*
         * Contador.
         */

        contarVisitaGlobal();


        /*
         * Comunidade.
         */

        carregarPreviaComunidade();


    } catch (erro) {

        console.error(
            "❌ ERRO PRINCIPAL DO SITE:",
            erro
        );

        mostrarErro(
            "Não foi possível carregar as frases. Abra o console do navegador para ver o erro."
        );
    }
}


// ============================================================
// INICIAR QUANDO O HTML ESTIVER PRONTO
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        iniciarSite
    );

} else {

    iniciarSite();
}
