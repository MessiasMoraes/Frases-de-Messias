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
