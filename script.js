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
            orderBy(documentId()),
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


// ============================================================
// OBTER IMAGEM DA FRASE
// ============================================================

function obterImagemDaFrase(
    frase
) {

    const imagemIndividual =
        String(
            frase.imagem || ""
        ).trim();

    if (imagemIndividual) {

        return normalizarUrlImagem(
            imagemIndividual
        );
    }

    const categoria =
        categorias[
            normalizarCategoria(
                frase.categoria || ""
            )
        ];

    if (
        categoria &&
        categoria.imagem
    ) {

        return normalizarUrlImagem(
            categoria.imagem
        );
    }

    /*
     * Imagem alternativa.
     */
    return (
        "https://images.unsplash.com/" +
        "photo-1499750310107-5fef28a66643" +
        "?auto=format&fit=crop&w=1200&q=85"
    );
}


// ============================================================
// CRIAR CARD PROFISSIONAL
// ============================================================

function criarCardFrase(
    frase,
    lista
) {

    const categoria =
        sanitizarTexto(
            frase.categoria || ""
        );

    const autor =
        sanitizarTexto(
            frase.autor ||
            "Messias"
        );

    const texto =
        String(
            frase.texto || ""
        ).trim();

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

    card.dataset.id =
        frase.id;

    /*
     * A FRASE FICA SOBRE A IMAGEM.
     * Isso corrige o problema de as imagens
     * aparecerem sem o texto.
     */
    card.innerHTML = `

        <div class="imagemFrase">

            <img
                src="${escaparHTML(imagem)}"
                alt="${escaparHTML(
                    texto
                )}"
                loading="lazy"
                decoding="async"
            >

            <div class="fundoEscuroImagem"></div>

            <div class="conteudoImagem">

                ${
                    categoria
                        ? `
                    <span class="categoriaImagem">
                        ${escaparHTML(
                            categoria
                        )}
                    </span>
                    `
                        : ""
                }

                <div class="textoImagem">
                    “${escaparHTML(
                        texto
                    )}”
                </div>

                <div class="autorImagem">
                    — ${escaparHTML(
                        autor
                    )}
                </div>

                <div class="marcaImagem">
                    📖 Frases de Messias
                </div>

            </div>

        </div>

        <div class="acoesFrase">

            <button
                type="button"
                class="btnAcao btnCopiar"
            >
                📋 Copiar
            </button>

            <button
                type="button"
                class="btnAcao btnFavorito"
            >
                ${
                    favoritos.includes(
                        frase.id
                    )
                        ? "❤️"
                        : "🤍"
                }
            </button>

            <button
                type="button"
                class="btnAcao btnEditor"
            >
                🎬 Vídeo
            </button>

            <button
                type="button"
                class="btnAcao btnBaixar"
            >
                🖼️ Baixar
            </button>

        </div>
    `;

    /*
     * Fallback da imagem.
     */
    const img =
        card.querySelector(
            "img"
        );

    img.addEventListener(
        "error",
        () => {

            img.src =
                "https://images.unsplash.com/" +
                "photo-1499750310107-5fef28a66643" +
                "?auto=format&fit=crop&w=1200&q=85";
        },
        { once: true }
    );


    // COPIAR
    card
        .querySelector(
            ".btnCopiar"
        )
        .addEventListener(
            "click",
            () =>
                copiarFrase(
                    texto,
                    autor
                )
        );


    // FAVORITO
    card
        .querySelector(
            ".btnFavorito"
        )
        .addEventListener(
            "click",
            event =>
                alternarFavorito(
                    frase.id,
                    event.currentTarget
                )
        );


    // VÍDEO
    card
        .querySelector(
            ".btnEditor"
        )
        .addEventListener(
            "click",
            () =>
                abrirEditorVideo(
                    texto,
                    autor
                )
        );


    // DOWNLOAD
    card
        .querySelector(
            ".btnBaixar"
        )
        .addEventListener(
            "click",
            event =>
                baixarCardComoImagem(
                    frase,
                    imagem,
                    event.currentTarget
                )
        );


    lista.appendChild(
        card
    );
}


// ============================================================
// COPIAR FRASE
// ============================================================

async function copiarFrase(
    texto,
    autor = "Messias"
) {

    const conteudo =
        `"${texto}" — ${autor}`;

    try {

        await navigator.clipboard.writeText(
            conteudo
        );

        mostrarAviso(
            "✅ Frase copiada!"
        );

    } catch (erro) {

        const area =
            document.createElement(
                "textarea"
            );

        area.value =
            conteudo;

        document.body.appendChild(
            area
        );

        area.select();

        document.execCommand(
            "copy"
        );

        area.remove();

        mostrarAviso(
            "✅ Frase copiada!"
        );
    }
}


// ============================================================
// FAVORITOS
// ============================================================

function alternarFavorito(
    id,
    botao
) {

    if (!id) return;

    if (
        favoritos.includes(id)
    ) {

        favoritos =
            favoritos.filter(
                item =>
                    item !== id
            );

        botao.textContent =
            "🤍";

        mostrarAviso(
            "Removida dos favoritos"
        );

    } else {

        favoritos.push(id);

        botao.textContent =
            "❤️";

        mostrarAviso(
            "❤️ Adicionada aos favoritos!"
        );
    }

    localStorage.setItem(
        "favoritos",
        JSON.stringify(
            favoritos
        )
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
// DOWNLOAD DA IMAGEM PROFISSIONAL
// ============================================================

async function baixarCardComoImagem(
    frase,
    imagemUrl,
    botao
) {

    const texto =
        String(
            frase.texto || ""
        ).trim();

    const autor =
        String(
            frase.autor ||
            "Messias"
        ).trim();

    const categoria =
        String(
            frase.categoria ||
            ""
        ).trim();

    const textoOriginal =
        botao?.textContent ||
        "🖼️ Baixar";

    if (botao) {

        botao.disabled =
            true;

        botao.textContent =
            "⏳ Criando...";
    }

    try {

        const urlImagem =
            urlParaProxyImagem(
                imagemUrl
            ) || imagemUrl;

        const resposta =
            await fetch(
                urlImagem,
                {
                    cache:
                        "no-store"
                }
            );

        if (!resposta.ok) {

            throw new Error(
                "Não foi possível carregar a imagem."
            );
        }

        const blob =
            await resposta.blob();

        const objectUrl =
            URL.createObjectURL(
                blob
            );

        const imagem =
            await carregarImagem(
                objectUrl
            );

        URL.revokeObjectURL(
            objectUrl
        );

        const canvas =
            document.createElement(
                "canvas"
            );

        /*
         * Formato profissional para Instagram,
         * WhatsApp e redes sociais.
         *
         * 1080 x 1350 = proporção 4:5.
         */
        canvas.width =
            1080;

        canvas.height =
            1350;

        const ctx =
            canvas.getContext(
                "2d"
            );

        // ------------------------------------------------
        // FUNDO
        // ------------------------------------------------

        desenharImagemCortada(
            ctx,
            imagem,
            0,
            0,
            1080,
            1350
        );

        // ------------------------------------------------
        // GRADIENTE
        // ------------------------------------------------

        const gradiente =
            ctx.createLinearGradient(
                0,
                0,
                0,
                1350
            );

        gradiente.addColorStop(
            0,
            "rgba(0,0,0,0.25)"
        );

        gradiente.addColorStop(
            0.45,
            "rgba(0,0,0,0.40)"
        );

        gradiente.addColorStop(
            1,
            "rgba(0,0,0,0.88)"
        );

        ctx.fillStyle =
            gradiente;

        ctx.fillRect(
            0,
            0,
            1080,
            1350
        );

        // ------------------------------------------------
        // MARCA
        // ------------------------------------------------

        ctx.textAlign =
            "center";

        ctx.fillStyle =
            "#ffffff";

        ctx.font =
            "bold 38px Arial";

        ctx.fillText(
            "📖 FRASES DE MESSIAS",
            540,
            90
        );

        // ------------------------------------------------
        // CATEGORIA
        // ------------------------------------------------

        if (categoria) {

            ctx.font =
                "bold 28px Arial";

            ctx.fillStyle =
                "#ffffff";

            ctx.fillText(
                categoria.toUpperCase(),
                540,
                190
            );
        }

        // ------------------------------------------------
        // FRASE
        // ------------------------------------------------

        ctx.fillStyle =
            "#ffffff";

        ctx.font =
            "bold 55px Georgia";

        const linhas =
            quebrarTexto(
                ctx,
                `“${texto}”`,
                850
            );

        const alturaLinha =
            72;

        const alturaTexto =
            linhas.length *
            alturaLinha;

        let y =
            675 -
            alturaTexto / 2;

        linhas.forEach(
            linha => {

                ctx.fillText(
                    linha,
                    540,
                    y
                );

                y +=
                    alturaLinha;
            }
        );

        // ------------------------------------------------
        // AUTOR
        // ------------------------------------------------

        ctx.font =
            "italic 34px Georgia";

        ctx.fillStyle =
            "#f5f5f5";

        ctx.fillText(
            `— ${autor}`,
            540,
            y + 50
        );

        // ------------------------------------------------
        // LINHA DECORATIVA
        // ------------------------------------------------

        ctx.beginPath();

        ctx.moveTo(
            350,
            1130
        );

        ctx.lineTo(
            730,
            1130
        );

        ctx.strokeStyle =
            "rgba(255,255,255,0.7)";

        ctx.lineWidth =
            2;

        ctx.stroke();

        // ------------------------------------------------
        // RODAPÉ
        // ------------------------------------------------

        ctx.font =
            "26px Arial";

        ctx.fillStyle =
            "#ffffff";

        ctx.fillText(
            "Inspiração para todos os momentos",
            540,
            1190
        );

        ctx.font =
            "bold 24px Arial";

        ctx.fillText(
            "frasesdemessias.com.br",
            540,
            1250
        );

        // ------------------------------------------------
        // DOWNLOAD
        // ------------------------------------------------

        const link =
            document.createElement(
                "a"
            );

        link.download =
            `frases-de-messias-${frase.id || Date.now()}.jpg`;

        link.href =
            canvas.toDataURL(
                "image/jpeg",
                0.95
            );

        link.click();

        mostrarAviso(
            "🖼️ Imagem criada com sucesso!"
        );

    } catch (erro) {

        console.error(
            "Erro ao criar imagem:",
            erro
        );

        mostrarAviso(
            "❌ Não foi possível criar a imagem."
        );

    } finally {

        if (botao) {

            botao.disabled =
                false;

            botao.textContent =
                textoOriginal;
        }
    }
}


// ============================================================
// CARREGAR IMAGEM
// ============================================================

function carregarImagem(
    url
) {

    return new Promise(
        (resolve, reject) => {

            const imagem =
                new Image();

            imagem.crossOrigin =
                "anonymous";

            imagem.onload =
                () =>
                    resolve(
                        imagem
                    );

            imagem.onerror =
                () =>
                    reject(
                        new Error(
                            "Imagem não carregada."
                        )
                    );

            imagem.src =
                url;
        }
    );
}


// ============================================================
// DESENHAR IMAGEM CORTADA
// ============================================================

function desenharImagemCortada(
    ctx,
    imagem,
    x,
    y,
    largura,
    altura
) {

    const proporcaoCanvas =
        largura /
        altura;

    const proporcaoImagem =
        imagem.width /
        imagem.height;

    let sx = 0;
    let sy = 0;
    let sw = imagem.width;
    let sh = imagem.height;

    if (
        proporcaoImagem >
        proporcaoCanvas
    ) {

        sw =
            imagem.height *
            proporcaoCanvas;

        sx =
            (
                imagem.width -
                sw
            ) / 2;

    } else {

        sh =
            imagem.width /
            proporcaoCanvas;

        sy =
            (
                imagem.height -
                sh
            ) / 2;
    }

    ctx.drawImage(
        imagem,
        sx,
        sy,
        sw,
        sh,
        x,
        y,
        largura,
        altura
    );
}


// ============================================================
// QUEBRAR TEXTO PARA A IMAGEM
// ============================================================

function quebrarTexto(
    ctx,
    texto,
    larguraMaxima
) {

    const palavras =
        texto.split(
            " "
        );

    const linhas = [];

    let linhaAtual =
        "";

    palavras.forEach(
        palavra => {

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
                larguraMaxima
            ) {

                if (linhaAtual) {

                    linhas.push(
                        linhaAtual
                    );
                }

                linhaAtual =
                    palavra;

            } else {

                linhaAtual =
                    teste;
            }
        }
    );

    if (linhaAtual) {

        linhas.push(
            linhaAtual
        );
    }

    return linhas;
}


// ============================================================
// AVISO
// ============================================================

function mostrarAviso(
    mensagem
) {

    let aviso =
        document.getElementById(
            "avisoFrasesMessias"
        );

    if (!aviso) {

        aviso =
            document.createElement(
                "div"
            );

        aviso.id =
            "avisoFrasesMessias";

        aviso.style.cssText = `
            position:fixed;
            left:50%;
            bottom:30px;
            transform:translateX(-50%);
            z-index:99999;
            background:#111827;
            color:#fff;
            padding:14px 22px;
            border-radius:30px;
            font-weight:bold;
            box-shadow:0 10px 30px rgba(0,0,0,.3);
            transition:.3s;
        `;

        document.body.appendChild(
            aviso
        );
    }

    aviso.textContent =
        mensagem;

    aviso.style.opacity =
        "1";

    clearTimeout(
        aviso._timer
    );

    aviso._timer =
        setTimeout(
            () => {

                aviso.style.opacity =
                    "0";

            },
            2500
        );
}


// ============================================================
// PRÉVIA DA COMUNIDADE
// ============================================================

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
        `“${
            conteudo.length > 170
                ? conteudo
                    .slice(
                        0,
                        170
                    )
                    .trimEnd() +
                    "…"
                : conteudo
        }”`;

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
                .map(
                    item => ({
                        id:
                            item.id,
                        ...item.data()
                    })
                )
                .sort(
                    (a, b) => {

                        const dataA =
                            dataDaPublicacaoSocial(
                                a.publicadoEm ||
                                a.criadoEm
                            )?.getTime() ||
                            0;

                        const dataB =
                            dataDaPublicacaoSocial(
                                b.publicadoEm ||
                                b.criadoEm
                            )?.getTime() ||
                            0;

                        return dataB -
                            dataA;
                    }
                )
                .slice(
                    0,
                    3
                );

        lista.replaceChildren();

        if (!publicacoes.length) {

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
            publicacao =>
                lista.appendChild(
                    criarCartaoPreviaComunidade(
                        publicacao
                    )
                )
        );

    } catch (erro) {

        console.error(
            "Erro na prévia da comunidade:",
            erro
        );
    }
}


// ============================================================
// PESQUISA
// ============================================================

function configurarPesquisa() {

    const pesquisa =
        document.getElementById(
            "pesquisa"
        );

    const pesquisaAutor =
        document.getElementById(
            "pesquisaAutor"
        );

    function executarBusca() {

        clearTimeout(
            temporizadorBusca
        );

        temporizadorBusca =
            setTimeout(
                () => {

                    if (!frasesCarregadas) {
                        return;
                    }

                    mostrarFrases(
                        document.getElementById(
                            "listaFrases"
                        ),
                        filtrosAtuais()
                    );

                },
                180
            );
    }

    if (pesquisa) {

        pesquisa.addEventListener(
            "input",
            executarBusca
        );
    }

    if (pesquisaAutor) {

        pesquisaAutor.addEventListener(
            "input",
            executarBusca
        );
    }
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const lista =
            document.getElementById(
                "listaFrases"
            );

        const fraseDiaElemento =
            document.getElementById(
                "fraseDia"
            );

        const listaCategorias =
            document.getElementById(
                "listaCategorias"
            );

        configurarPesquisa();

        await carregarFrases(
            lista,
            fraseDiaElemento,
            listaCategorias
        );

        await carregarPreviaComunidade();

    }
);
