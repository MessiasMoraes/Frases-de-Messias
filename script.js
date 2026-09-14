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


// ============================================================
// ESTADO
// ============================================================

let frases = [];

let categorias = {};

let favoritos =
    JSON.parse(localStorage.getItem("favoritos") || "[]");

let categoriaSelecionada = "";

let frasesCarregadas = false;

let temporizadorBusca = null;


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function mostrarCarregando(lista) {

    if (!lista) return;

    lista.innerHTML = `
        <div class="loading"
             style="
                text-align:center;
                padding:40px 20px;
                font-weight:700;
             ">
            ⏳ Carregando frases...
        </div>
    `;
}


function mostrarErro(lista, mensagem) {

    if (!lista) return;

    lista.innerHTML = "";

    const erro = document.createElement("div");

    erro.className = "erro";

    erro.style.cssText = `
        text-align:center;
        padding:40px 20px;
        color:#ef4444;
        font-weight:700;
    `;

    erro.textContent = mensagem;

    lista.appendChild(erro);
}


// ============================================================
// LIMPEZA DE TEXTO
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


function termosRelevantesDaBusca(texto = "") {

    const palavrasIgnoradas = new Set([
        "a",
        "as",
        "o",
        "os",
        "um",
        "uma",
        "de",
        "da",
        "das",
        "do",
        "dos",
        "e",
        "em",
        "para",
        "por",
        "com",
        "sobre",
        "frase",
        "frases",
        "mensagem",
        "mensagens",
        "pensamento",
        "pensamentos"
    ]);

    return normalizarParaBusca(texto)
        .split(/[^a-z0-9]+/)
        .filter(
            palavra =>
                palavra &&
                !palavrasIgnoradas.has(palavra)
        );
}


// ============================================================
// URL DA IMAGEM
// ============================================================

function normalizarUrlImagem(url = "") {

    const valor = String(url || "").trim();

    if (!valor) return "";

    try {

        const origem =
            new URL(
                valor,
                window.location.href
            );

        // Corrige imagens antigas do GitHub Pages
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
            valor
        );

        return "";
    }
}


function urlParaProxyImagem(url = "") {

    const valor =
        String(url || "").trim();

    if (!valor) return "";

    try {

        const origem =
            new URL(
                valor,
                window.location.href
            );

        // Imagem do próprio site
        if (
            origem.origin ===
            window.location.origin
        ) {
            return origem.href;
        }

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
            `${proxyBase}/api/image?url=` +
            encodeURIComponent(origem.href)
        );

    } catch (erro) {

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

    const tipo =
        resposta.headers.get(
            "content-type"
        ) || "";

    if (
        !resposta.ok ||
        !tipo.toLowerCase().startsWith("image/")
    ) {

        throw new Error(
            "A imagem não pôde ser carregada."
        );
    }

    const blob =
        await resposta.blob();

    if (!blob.size) {

        throw new Error(
            "A imagem retornou vazia."
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
                        () => reject(
                            new Error(
                                "Tempo esgotado ao carregar a imagem."
                            )
                        ),
                        12000
                    );

                imagem.onload = () => {

                    clearTimeout(timeout);

                    resolve();
                };

                imagem.onerror = () => {

                    clearTimeout(timeout);

                    reject(
                        new Error(
                            "Não foi possível decodificar a imagem."
                        )
                    );
                };

                imagem.src = objectUrl;
            }
        );

        if (
            !imagem.naturalWidth ||
            !imagem.naturalHeight
        ) {

            throw new Error(
                "Dimensões da imagem inválidas."
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
// FRASE DO DIA
// ============================================================

function fraseDoDia(elemento) {

    if (
        !elemento ||
        !frases.length
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

    elemento.textContent =
        `"${String(frase.texto || "").trim()}" — ${String(frase.autor || "Messias").trim()}`;
}


// ============================================================
// CONTADOR GLOBAL
// ============================================================

async function contarVisitaGlobal() {

    const chave =
        "visita_global_registrada";

    const contador =
        document.getElementById(
            "contadorGlobal"
        );

    try {

        const referencia =
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
                            referencia
                        );

                    const dados =
                        resultado.exists()
                            ? resultado.data()
                            : {};

                    const atual =
                        Number(
                            dados.visitas || 0
                        );

                    if (!jaRegistrou) {

                        // Funciona mesmo se o documento
                        // ainda não existir.
                        transacao.set(
                            referencia,
                            {
                                visitas: atual + 1
                            },
                            {
                                merge: true
                            }
                        );

                        return atual + 1;
                    }

                    return atual;
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
// COMUNIDADE
// ============================================================

function dataDaPublicacaoSocial(valor) {

    if (
        valor &&
        typeof valor.toDate === "function"
    ) {

        return valor.toDate();
    }

    if (
        valor &&
        typeof valor.seconds === "number"
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
        document.createElement("a");

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
        document.createElement("div");

    cabecalho.className =
        "meta-previa-comunidade";


    const autor =
        document.createElement("strong");

    autor.textContent =
        publicacao.autorNome ||
        "Membro da comunidade";


    const categoria =
        document.createElement("span");

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
            publicacao.texto || ""
        ).trim();

    texto.textContent =
        `"${conteudo.length > 170
            ? conteudo.slice(0, 170).trimEnd() + "…"
            : conteudo}"`;


    const rodape =
        document.createElement("span");

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

    if (!lista) return;

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
                .map(item => ({
                    id: item.id,
                    ...item.data()
                }))
                .sort(
                    (a, b) => {

                        const dataA =
                            dataDaPublicacaoSocial(
                                a.publicadoEm ||
                                a.criadoEm
                            )?.getTime() || 0;

                        const dataB =
                            dataDaPublicacaoSocial(
                                b.publicadoEm ||
                                b.criadoEm
                            )?.getTime() || 0;

                        return dataB - dataA;
                    }
                )
                .slice(0, 3);


        lista.replaceChildren();


        if (!publicacoes.length) {

            const estado =
                document.createElement("p");

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
            "Erro na prévia da comunidade:",
            erro
        );

        lista.replaceChildren();

        const estado =
            document.createElement("p");

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
// CARREGAR CATEGORIAS
// ============================================================

async function carregarCategorias() {

    categorias = {};

    try {

        const consulta =
            await getDocs(
                collection(
                    db,
                    "categorias"
                )
            );


        consulta.forEach(
            docSnap => {

                const dados =
                    docSnap.data();

                const nome =
                    sanitizarTexto(
                        dados.nome || ""
                    );

                const imagem =
                    sanitizarTexto(
                        dados.imagem || ""
                    );

                if (nome) {

                    // Guarda usando nome normalizado
                    // para evitar problemas com Fé/fé.
                    categorias[
                        normalizarCategoria(nome)
                    ] = imagem;
                }
            }
        );

    } catch (erro) {

        console.warn(
            "Não foi possível carregar a coleção categorias:",
            erro
        );
    }
}


// ============================================================
// CARREGAR TODAS AS FRASES
// ============================================================

async function carregarTodasAsFrases() {

    const consulta =
        await getDocs(
            collection(
                db,
                "frases"
            )
        );


    frases =
        consulta.docs.map(
            docSnap => ({

                id: docSnap.id,

                ...docSnap.data()
            })
        );


    // Remove registros inválidos
    frases =
        frases.filter(
            frase =>
                String(
                    frase.texto || ""
                ).trim() !== ""
        );


    console.log(
        "================================"
    );

    console.log(
        "FRASES CARREGADAS:",
        frases.length
    );

    console.log(
        "================================"
    );


    return frases;
}


// ============================================================
// CARREGAR FRASES
// ============================================================

async function carregarFrases(
    lista,
    fraseDiaElemento,
    listaCategorias,
    pesquisa
) {

    mostrarCarregando(
        lista
    );

    frases =
        [];

    categorias =
        {};

    frasesCarregadas =
        false;


    try {

        // Contador não bloqueia
        // o carregamento das frases.
        contarVisitaGlobal();

        // Categorias
        await carregarCategorias();

        // TODAS as frases
        await carregarTodasAsFrases();


    } catch (erro) {

        console.error(
            "ERRO AO CARREGAR FIREBASE:",
            erro
        );

        mostrarErro(
            lista,
            "Erro ao carregar as frases. Verifique a conexão com o Firebase."
        );

        return;
    }


    if (!frases.length) {

        mostrarErro(
            lista,
            "Nenhuma frase cadastrada no momento."
        );

        return;
    }


    frasesCarregadas =
        true;


    // Frase do dia
    fraseDoDia(
        fraseDiaElemento
    );


    // Categorias
    mostrarCategorias(
        listaCategorias,
        pesquisa,
        lista
    );


    // Frases
    mostrarFrases(
        lista,
        filtrosAtuais()
    );


    console.log(
        `✅ ${frases.length} frases exibidas no site.`
    );
}


// ============================================================
// EDITOR DE VÍDEO
// ============================================================

function abrirEditorVideo(
    texto,
    autor = "Messias"
) {

    const frase =
        encodeURIComponent(
            String(texto || "")
        );

    const autorCod =
        encodeURIComponent(
            String(autor || "Messias")
        );


    window.location.href =
        `editor.html?frase=${frase}&autor=${autorCod}`;
}


// ============================================================
// FILTROS
// ============================================================

function filtrosAtuais() {

    return {

        texto:
            document.getElementById(
                "pesquisa"
            )?.value || "",

        autor:
            document.getElementById(
                "pesquisaAutor"
            )?.value || "",

        categoria:
            categoriaSelecionada
    };
}


function rolarParaResultados() {

    document
        .getElementById(
            "todas-as-frases"
        )
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
}


// ============================================================
// STATUS DA BUSCA
// ============================================================

function atualizarStatusPesquisa(
    quantidade,
    filtros
) {

    const status =
        document.getElementById(
         
