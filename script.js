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
    FieldPath // 👈 Corrigido: import do FieldPath
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const TAMANHO_LOTE_FRASES = 100;

const ORIGEM_PROXY_IMAGEM =
    "https://frasesdemessiascombr.vercel.app";

let frases = [];
let categorias = {};

let favoritos =
    JSON.parse(localStorage.getItem("favoritos") || "[]");

let categoriaSelecionada = "";

let frasesCarregadas = false;

let temporizadorBusca = null;

let ultimoDocumentoFrases = null;

let haMaisFrases = true;

let carregandoMaisFrases = false;


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function mostrarCarregando(lista) {

    if (!lista) return;

    lista.innerHTML = `
        <div class="loading"
             style="
                text-align:center;
                padding:40px;
                font-weight:bold;
             ">
            ⏳ Carregando frases...
        </div>
    `;
}


function mostrarErro(lista, mensagem) {

    if (!lista) return;

    lista.innerHTML = `
        <div class="erro"
             style="
                text-align:center;
                padding:40px;
                color:#ef4444;
                font-weight:bold;
             ">
            ${mensagem}
        </div>
    `;
}


function sanitizarTexto(texto = "") {

    return String(texto)
        .replace(
            /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu,
            ""
        )
        .trim();
}


function normalizarParaBusca(texto = "") {

    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}


function normalizarCategoria(texto = "") {

    return normalizarParaBusca(
        sanitizarTexto(
            String(texto).replace(/[-_]+/g, " ")
        )
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
// URL DAS IMAGENS
// ============================================================

function normalizarUrlImagem(url = "") {

    const valor = String(url || "").trim();

    if (!valor) return "";

    try {

        const origem = new URL(
            valor,
            window.location.href
        );

        if (
            origem.hostname ===
                "messiasmoraes.github.io" &&
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

        return valor;
    }
}


function urlParaProxyImagem(url = "") {

    const valor = String(url || "").trim();

    if (!valor) return "";

    try {

        const origem = new URL(
            valor,
            window.location.href
        );

        if (
            origem.origin ===
            window.location.origin
        ) {

            return origem.href;
        }

        if (origem.protocol !== "https:") {
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
// DATA DA PUBLICAÇÃO
// ============================================================

function dataDaPublicacaoSocial(valor) {

    if (valor?.toDate) {
        return valor.toDate();
    }

    if (valor?.seconds) {
        return new Date(
            valor.seconds * 1000
        );
    }

    return valor instanceof Date
        ? valor
        : null;
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
        `"${frase.texto}" — ${frase.autor || "Messias"}`;
}


// ============================================================
// CONTADOR DE VISITAS
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

                    const atual =
                        Number(
                            resultado.data()?.visitas ||
                            0
                        );

                    if (!jaRegistrou) {

                        transacao.update(
                            referencia,
                            {
                                visitas:
                                    atual + 1
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
                    .toLocaleString("pt-BR");
        }

    } catch (erro) {

        console.error(
            "Erro ao contar visita:",
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

        const consulta =
            await getDocs(
                collection(
                    db,
                    "categorias"
                )
            );

        consulta.forEach(docSnap => {

            const dados =
                docSnap.data();

            const nome =
                sanitizarTexto(
                    dados.nome || ""
                );

            if (nome) {

                categorias[
                    normalizarCategoria(nome)
                ] = {
                    nome,
                    imagem:
                        dados.imagem || ""
                };
            }
        });

    } catch (erro) {

        console.error(
            "Erro ao carregar categorias:",
            erro
        );
    }
}


// ============================================================
// CARREGAR FRASES DO FIREBASE
// ============================================================

async function carregarProximoLoteDeFrases() {

    if (
        !haMaisFrases ||
        carregandoMaisFrases
    ) {
        return 0;
    }

    carregandoMaisFrases = true;

    try {

        const restricoes = [
            orderBy(FieldPath.documentId()), // 👈 Corrigido: uso correto do FieldPath.documentId()
            limit(TAMANHO_LOTE_FRASES)
        ];

        if (ultimoDocumentoFrases) {

            restricoes.push(
                startAfter(
                    ultimoDocumentoFrases
                )
            );
        }

        const consulta =
            await getDocs(
                query(
                    collection(
                        db,
                        "frases"
                    ),
                    ...restricoes
                )
            );

        consulta.forEach(docSnap => {

            frases.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        if (consulta.docs.length) {

            ultimoDocumentoFrases =
                consulta.docs[
                    consulta.docs.length - 1
                ];
        }

        haMaisFrases =
            consulta.size ===
            TAMANHO_LOTE_FRASES;

        return consulta.size;

    } finally {

        carregandoMaisFrases = false;
    }
}


// ============================================================
// CARREGAR TODO O ACERVO
// ============================================================

async function carregarTodasAsFrases() {

    while (haMaisFrases) {

        const quantidade =
            await carregarProximoLoteDeFrases();

        if (!quantidade) {
            break;
        }
    }

    return frases.length;
}


// ============================================================
// CARREGAMENTO PRINCIPAL
// ============================================================

async function carregarFrases(
    lista,
    fraseDiaElemento,
    listaCategorias
) {

    mostrarCarregando(lista);

    frases = [];

    ultimoDocumentoFrases = null;

    haMaisFrases = true;

    carregandoMaisFrases = false;

    frasesCarregadas = false;

    try {

        await carregarCategorias();

        await contarVisitaGlobal();

        /*
         * CARREGA O PRIMEIRO LOTE
         * rapidamente para mostrar o site.
         */
        await carregarProximoLoteDeFrases();

    } catch (erro) {

        console.error(
            "Erro no Firebase:",
            erro
        );

        mostrarErro(
            lista,
            "Erro ao conectar ao banco de dados."
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

    frasesCarregadas = true;

    fraseDoDia(
        fraseDiaElemento
    );

    mostrarCategorias(
        listaCategorias,
        lista
    );

    mostrarFrases(
        lista,
        filtrosAtuais()
    );

    /*
     * Depois que a primeira tela aparece,
     * continua carregando o restante do acervo
     * automaticamente.
     */
    setTimeout(async () => {

        try {

            await carregarTodasAsFrases();

            mostrarFrases(
                lista,
                filtrosAtuais()
            );

        } catch (erro) {

            console.error(
                "Erro ao carregar restante do acervo:",
                erro
            );
        }

    }, 300);
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

    if (!status) return;

    const texto =
        String(
            filtros.texto || ""
        ).trim();

    const autor =
        String(
            filtros.autor || ""
        ).trim();

    const categoria =
        String(
            filtros.categoria || ""
        ).trim();

    const ativa =
        Boolean(
            texto ||
            autor ||
            categoria
        );

    if (!ativa) {

        status.hidden = true;

        status.replaceChildren();

        return;
    }

    status.hidden = false;

    status.replaceChildren();

    const mensagem =
        document.createElement(
            "span"
        );

    let descricao = "";

    if (autor) {

        descricao =
            ` por autor "${autor}"`;

    } else if (texto) {

        descricao =
            ` para "${texto}"`;

    } else {

        descricao =
            ` em "${categoria}"`;
    }

    mensagem.textContent =
        quantidade === 1
            ? `1 frase encontrada${descricao}.`
            : `${quantidade} frases encontradas${descricao}.`;

    status.appendChild(
        mensagem
    );
}


// ============================================================
// CATEGORIAS
// ============================================================

function mostrarCategorias(
    listaCategorias,
    lista
) {

    if (!listaCategorias) return;

    listaCategorias.innerHTML = "";

    const todas =
        document.createElement(
            "button"
        );

    todas.type = "button";

    todas.className =
        "categoriaBtn ativo";

    todas.textContent =
        "✨ Todas";

    todas.addEventListener(
        "click",
        () => {

            categoriaSelecionada =
                "";

            document
                .querySelectorAll(
                    ".categoriaBtn"
                )
                .forEach(
                    botao =>
                        botao.classList.remove(
                            "ativo"
                        )
                );

            todas.classList.add(
                "ativo"
            );

            mostrarFrases(
                lista,
                filtrosAtuais()
            );
        }
    );

    listaCategorias.appendChild(
        todas
    );

    const nomes = Object.values(
        categorias
    )
        .map(item => item.nome)
        .filter(Boolean)
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "pt-BR"
                )
        );

    nomes.forEach(nome => {

        const botao =
            document.createElement(
                "button"
            );

        botao.type = "button";

        botao.className =
            "categoriaBtn";

        botao.textContent =
            nome;

        botao.addEventListener(
            "click",
            () => {

                categoriaSelecionada =
                    nome;

                document
                    .querySelectorAll(
                        ".categoriaBtn"
                    )
                    .forEach(
                        item =>
                            item.classList.remove(
                                "ativo"
                            )
                    );

                botao.classList.add(
                    "ativo"
                );

                mostrarFrases(
                    lista,
                    filtrosAtuais()
                );
            }
        );

        listaCategorias.appendChild(
            botao
        );
    });
}


// ============================================================
// MOSTRAR FRASES
// ============================================================

function mostrarFrases(
    lista,
    filtro = {}
) {

    if (!lista) return;

    lista.innerHTML = "";

    const filtros =
        typeof filtro === "string"
            ? {
                texto: filtro,
                autor: "",
                categoria: ""
            }
            : (
                filtro || {}
            );

    const textoLimpo =
        normalizarParaBusca(
            String(
                filtros.texto || ""
            ).trim()
        );

    const termosBusca =
        termosRelevantesDaBusca(
            filtros.texto || ""
        );

    const autorLimpo =
        normalizarParaBusca(
            String(
                filtros.autor || ""
            ).trim()
        );

    const categoriaLimpa =
        normalizarCategoria(
            filtros.categoria || ""
        );

    const resultado =
        frases.filter(frase => {

            const texto =
                normalizarParaBusca(
                    frase.texto || ""
                );

            const autor =
                normalizarParaBusca(
                    frase.autor ||
                    "Messias"
                );

            const categoria =
                normalizarCategoria(
                    frase.categoria || ""
                );

            const pesquisavel =
                `${texto} ${autor} ${categoria}`;

            const correspondeTexto =
                !textoLimpo ||
                pesquisavel.includes(
                    textoLimpo
                ) ||
                (
                    termosBusca.length &&
                    termosBusca.every(
                        termo =>
                            pesquisavel.includes(
                                termo
                            )
                    )
                );

            const correspondeAutor =
                !autorLimpo ||
                autor.includes(
                    autorLimpo
                );

            const correspondeCategoria =
                !categoriaLimpa ||
                categoria ===
                    categoriaLimpa;

            return (
                correspondeTexto &&
                correspondeAutor &&
                correspondeCategoria
            );
        });

    atualizarStatusPesquisa(
        resultado.length,
        filtros
    );

    if (!resultado.length) {

        lista.innerHTML = `
            <div class="semResultado"
                 style="
                    text-align:center;
                    padding:40px;
                    grid-column:1/-1;
                 ">

                😔 Nenhuma frase encontrada.

            </div>
        `;

        return;
    }

    resultado.forEach(
        frase =>
            criarCardFrase(
                frase,
                lista
            )
    );
}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escaparHTML(valor = "") {

    return String(valor)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}
