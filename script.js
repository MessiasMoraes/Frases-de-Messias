/* =========================================================
   FRASES DE MESSIAS — STYLE.CSS
   Compatível com o script.js enviado
   ========================================================= */

/* =========================================================
   1. RESET
   ========================================================= */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Helvetica,
        Arial,
        sans-serif;

    background: #f5f7fb;
    color: #172033;
    line-height: 1.6;
    min-height: 100vh;

    transition:
        background-color .3s ease,
        color .3s ease;
}

body,
header,
.cardFrase,
.botoes,
.estatistica,
.cartao-previa-comunidade,
.modalConteudo,
input,
select,
textarea {
    transition:
        background-color .3s ease,
        color .3s ease,
        border-color .3s ease,
        box-shadow .3s ease;
}

img {
    max-width: 100%;
    display: block;
}

button,
input,
select,
textarea {
    font: inherit;
}

button {
    cursor: pointer;
}

button:disabled {
    cursor: not-allowed;
    opacity: .65;
}

a {
    color: inherit;
    text-decoration: none;
}


/* =========================================================
   2. CONTAINER
   ========================================================= */

.container {
    width: min(1180px, calc(100% - 32px));
    margin: 0 auto;
}


/* =========================================================
   3. HEADER
   ========================================================= */

header {
    position: sticky;
    top: 0;
    z-index: 1000;

    background: rgba(255, 255, 255, .96);

    border-bottom: 1px solid #e7eaf0;

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
}

header .container {
    min-height: 72px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 18px;
}

.logo,
header h1 {
    color: #2563eb;
    font-weight: 800;
    letter-spacing: -.5px;
}

header h1 {
    font-size: 1.3rem;
    white-space: nowrap;
}


/* =========================================================
   4. NAVEGAÇÃO
   ========================================================= */

nav {
    display: flex;
    align-items: center;
    justify-content: center;

    gap: 5px;
    flex-wrap: wrap;
}

nav a {
    padding: 9px 12px;

    border-radius: 10px;

    color: #4b5563;

    font-size: .9rem;
    font-weight: 650;

    transition: .2s ease;
}

nav a:hover {
    color: #2563eb;
    background: #eff6ff;
}


/* =========================================================
   5. TEMA
   ========================================================= */

#temaBtn {
    min-width: 42px;
    height: 42px;

    padding: 0 11px;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    border: 1px solid #dce2ea;
    border-radius: 12px;

    background: #fff;
    color: #263244;

    font-size: 1.05rem;

    transition: .2s ease;
}

#temaBtn:hover {
    transform: translateY(-2px);
    border-color: #2563eb;
}


/* =========================================================
   6. HERO
   ========================================================= */

.hero {
    position: relative;

    overflow: hidden;

    padding: 70px 24px;

    text-align: center;

    background:
        radial-gradient(
            circle at 20% 20%,
            rgba(37, 99, 235, .15),
            transparent 35%
        ),
        radial-gradient(
            circle at 80% 80%,
            rgba(124, 58, 237, .13),
            transparent 35%
        ),
        #fff;

    border-bottom: 1px solid #e8ebf1;
}

.hero h2 {
    position: relative;
    z-index: 2;

    margin-bottom: 18px;

    color: #111827;

    font-size: clamp(2rem, 5vw, 3.5rem);
    line-height: 1.1;

    font-weight: 900;
    letter-spacing: -1.5px;
}

.hero p {
    position: relative;
    z-index: 2;

    max-width: 720px;

    margin: auto;

    color: #5b6472;

    font-size: 1.05rem;
}


/* =========================================================
   7. FRASE DO DIA
   ========================================================= */

#fraseDia,
#fraseDoDia {
    margin: 30px auto;
}

.fraseDia {
    position: relative;

    max-width: 850px;

    margin: 30px auto;

    padding: 34px;

    overflow: hidden;

    border-radius: 24px;

    background:
        linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
        );

    color: #fff;

    box-shadow:
        0 18px 45px rgba(37, 99, 235, .22);
}

.fraseDia::before {
    content: "“";

    position: absolute;

    top: -35px;
    left: 20px;

    color: rgba(255,255,255,.12);

    font-size: 160px;
    line-height: 1;
}

.fraseDia p {
    position: relative;
    z-index: 2;

    color: #fff;

    font-size: clamp(1.25rem, 3vw, 2rem);

    font-weight: 700;
}


/* =========================================================
   8. BUSCA
   ========================================================= */

.areaBusca {
    margin: 30px auto;
}

#pesquisa,
#pesquisaAutor {
    width: 100%;

    min-height: 48px;

    padding: 13px 17px;

    border: 1px solid #dce2ea;
    border-radius: 14px;

    outline: none;

    background: #fff;
    color: #172033;
}

#pesquisa:focus,
#pesquisaAutor:focus {
    border-color: #2563eb;

    box-shadow:
        0 0 0 4px rgba(37,99,235,.10);
}

#statusPesquisa {
    margin-top: 10px;

    color: #697386;

    font-size: .9rem;
}

.btn-ver-resultados {
    margin-left: 8px;

    padding: 6px 12px;

    border: none;
    border-radius: 8px;

    background: #eff6ff;
    color: #2563eb;

    font-size: .85rem;
    font-weight: 700;
}

.btn-ver-resultados:hover {
    background: #2563eb;
    color: #fff;
}


/* =========================================================
   9. CATEGORIAS
   ========================================================= */

#listaCategorias {
    display: flex;
    flex-wrap: wrap;

    justify-content: center;

    gap: 10px;

    margin: 25px 0 35px;
}

.categoria,
.categoriaBtn,
#listaCategorias button {
    padding: 9px 15px;

    border: 1px solid #dce3ed;
    border-radius: 999px;

    background: #fff;
    color: #374151;

    font-size: .9rem;
    font-weight: 700;

    transition: .2s ease;
}

.categoria:hover,
.categoriaBtn:hover,
#listaCategorias button:hover {
    transform: translateY(-2px);

    border-color: #2563eb;

    background: #eff6ff;

    color: #2563eb;
}

.categoria.ativo,
.categoriaBtn.ativo,
#listaCategorias button.ativo,
#listaCategorias button.categoriaAtiva {
    border-color: #2563eb;

    background: #2563eb;

    color: #fff;
}


/* =========================================================
   10. TÍTULOS
   ========================================================= */

.secaoTitulo {
    margin: 45px 0 22px;

    text-align: center;
}

.secaoTitulo h2 {
    color: #172033;

    font-size: clamp(1.6rem, 4vw, 2.2rem);

    font-weight: 850;
}

.secaoTitulo p {
    margin-top: 6px;

    color: #6b7280;
}


/* =========================================================
   11. GRID DE FRASES
   ========================================================= */

#listaFrases {
    display: grid;

    grid-template-columns:
        repeat(
            auto-fill,
            minmax(300px, 1fr)
        );

    gap: 26px;

    width: 100%;

    padding-bottom: 40px;
}


/* =========================================================
   12. CARD
   ========================================================= */

.cardFrase {
    position: relative;

    width: 100%;

    overflow: hidden;

    border: 1px solid #e7eaf0;
    border-radius: 22px;

    background: #fff;

    box-shadow:
        0 8px 25px rgba(15,23,42,.07);
}

.cardFrase:hover {
    transform: translateY(-6px);

    border-color:
        rgba(37,99,235,.25);

    box-shadow:
        0 20px 45px rgba(15,23,42,.13);
}


/* =========================================================
   13. IMAGEM DA FRASE
   ========================================================= */

.imagemFrase {
    position: relative;

    display: block;

    width: 100%;

    aspect-ratio: 4 / 3;

    min-height: 300px;

    overflow: hidden;

    background:
        linear-gradient(
            135deg,
            #111827,
            #334155
        );
}

.imagemFrase img {
    position: absolute;

    inset: 0;

    width: 100%;
    height: 100%;

    max-width: none;

    object-fit: cover;

    object-position: center;

    transition:
        transform .7s ease,
        filter .5s ease;
}

.cardFrase:hover
.imagemFrase img {
    transform: scale(1.06);
}


/* =========================================================
   14. GRADIENTE SOBRE IMAGEM
   ========================================================= */

.imagemFrase::after {
    content: "";

    position: absolute;

    inset: 0;

    z-index: 1;

    pointer-events: none;

    background:
        linear-gradient(
            to bottom,
            rgba(0,0,0,.12) 0%,
            rgba(0,0,0,.18) 25%,
            rgba(0,0,0,.48) 55%,
            rgba(0,0,0,.88) 100%
        );
}


/* =========================================================
   15. OVERLAY
   ========================================================= */

.imagemFrase .overlay {
    position: absolute;

    inset: 0;

    z-index: 3;

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    padding: 55px 25px 65px;

    text-align: center;

    color: #fff;

    pointer-events: none;
}


/* =========================================================
   16. BADGE
   ========================================================= */

.imagemFrase .badgeCategoria {
    position: absolute;

    top: 17px;
    left: 17px;

    z-index: 5;

    padding: 6px 12px;

    border: 1px solid rgba(255,255,255,.28);
    border-radius: 999px;

    background:
        rgba(0,0,0,.55);

    color: #fff;

    font-size: .72rem;
    font-weight: 800;

    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}


/* =========================================================
   17. TEXTO DA FRASE SOBRE A IMAGEM
   ========================================================= */

.imagemFrase .textoFrase {
    width: 100%;
    max-width: 94%;

    margin: 0 auto;

    color: #fff;

    font-size:
        clamp(
            1.05rem,
            2.4vw,
            1.42rem
        );

    line-height: 1.42;

    font-weight: 800;

    text-align: center;

    text-shadow:
        0 2px 5px rgba(0,0,0,.85),
        0 4px 15px rgba(0,0,0,.5);

    display: -webkit-box;

    -webkit-box-orient: vertical;

    -webkit-line-clamp: 7;

    overflow: hidden;
}


/* =========================================================
   18. AUTOR
   ========================================================= */

.imagemFrase .autorFrase {
    margin-top: 15px;

    color: #fff;

    font-size: .95rem;

    font-weight: 700;

    text-shadow:
        0 2px 6px rgba(0,0,0,.8);
}


/* =========================================================
   19. MARCA
   ========================================================= */

.imagemFrase .marca {
    position: absolute;

    left: 20px;
    bottom: 17px;

    color: rgba(255,255,255,.95);

    font-size: .76rem;

    font-weight: 700;

    text-shadow:
        0 2px 6px rgba(0,0,0,.85);
}


/* =========================================================
   20. BOTÕES DO CARD
   ========================================================= */

.botoes {
    display: grid;

    grid-template-columns:
        repeat(4, 1fr);

    gap: 8px;

    padding: 13px;

    background: #fff;
}

.botoes button {
    min-height: 42px;

    padding: 7px 5px;

    border: 1px solid #e0e5ec;
    border-radius: 11px;

    background: #f8fafc;
    color: #334155;

    font-size: .8rem;
    font-weight: 700;

    transition: .2s ease;
}

.botoes button:hover {
    transform: translateY(-2px);

    border-color: #2563eb;

    background: #eff6ff;

    color: #2563eb;
}

.botoes button:active {
    transform: scale(.97);
}


/* =========================================================
   21. FAVORITO
   ========================================================= */

.btnFavorito.favoritoAtivo,
.favoritoAtivo {
    border-color: #fecaca !important;

    background: #fff1f2 !important;

    color: #dc2626 !important;
}


/* =========================================================
   22. BOTÕES PRINCIPAIS
   ========================================================= */

.btnPrincipal,
.btnCarregarMais {
    display: inline-flex;

    align-items: center;
    justify-content: center;

    gap: 8px;

    min-height: 46px;

    padding: 11px 20px;

    border: none;
    border-radius: 12px;

    background: #2563eb;

    color: #fff;

    font-weight: 800;

    box-shadow:
        0 7px 18px
        rgba(37,99,235,.22);

    transition: .2s ease;
}

.btnPrincipal:hover,
.btnCarregarMais:hover {
    transform: translateY(-2px);

    background: #1d4ed8;
}


/* =========================================================
   23. CARREGAR MAIS
   ========================================================= */

.carregarMaisContainer {
    display: flex;

    justify-content: center;

    padding: 10px 0 50px;
}

#carregarMais {
    display: none;
}


/* =========================================================
   24. ESTATÍSTICAS
   ========================================================= */

.estatisticas {
    display: grid;

    grid-template-columns:
        repeat(3, 1fr);

    gap: 16px;

    margin: 35px 0;
}

.estatistica {
    padding: 24px 18px;

    text-align: center;

    border: 1px solid #e7eaf0;
    border-radius: 18px;

    background: #fff;

    box-shadow:
        0 7px 20px rgba(15,23,42,.05);
}

.estatistica strong {
    display: block;

    color: #2563eb;

    font-size: 2rem;

    line-height: 1.1;
}

.estatistica span {
    display: block;

    margin-top: 6px;

    color: #687386;

    font-size: .9rem;
}


/* =========================================================
   25. CONTADOR GLOBAL
   ========================================================= */

#contadorGlobal {
    display: inline-flex;

    align-items: center;
    justify-content: center;

    gap: 7px;

    padding: 8px 14px;

    border-radius: 999px;

    background: #eff6ff;

    color: #2563eb;

    font-size: .85rem;

    font-weight: 800;
}


/* =========================================================
   26. COMUNIDADE
   ========================================================= */

#listaPublicacoesComunidade {
    display: grid;

    grid-template-columns:
        repeat(
            auto-fill,
            minmax(260px, 1fr)
        );

    gap: 20px;

    margin: 25px 0 50px;
}

.cartao-previa-comunidade {
    display: block;

    overflow: hidden;

    border: 1px solid #e7eaf0;
    border-radius: 18px;

    background: #fff;

    box-shadow:
        0 8px 22px rgba(15,23,42,.06);

    transition: .3s ease;
}

.cartao-previa-comunidade:hover {
    transform: translateY(-4px);

    box-shadow:
        0 14px 30px rgba(15,23,42,.12);
}

.meta-previa-comunidade {
    display: flex;

    align-items: center;
    justify-content: space-between;

    gap: 10px;

    padding: 16px 16px 8px;
}

.meta-previa-comunidade strong {
    color: #111827;

    font-size: .95rem;
}

.meta-previa-comunidade span {
    padding: 3px 10px;

    border-radius: 999px;

    background: #f3f4f6;

    color: #6b7280;

    font-size: .8rem;
}

.cartao-previa-comunidade blockquote {
    margin: 0;

    padding: 0 16px 12px;

    border: none;

    color: #374151;

    font-size: .95rem;

    line-height: 1.5;
}

.link-cartao-previa {
    display: block;

    padding: 12px 16px 16px;

    border-top: 1px solid #f3f4f6;

    color: #2563eb;

    font-size: .85rem;

    font-weight: 700;
}

.estado-previa-comunidade {
    grid-column: 1 / -1;

    padding: 40px 20px;

    text-align: center;

    color: #6b7280;

    font-style: italic;
}


/* =========================================================
   27. MODAL
   ========================================================= */

.modal {
    position: fixed;

    inset: 0;

    z-index: 3000;

    display: none;

    align-items: center;
    justify-content: center;

    padding: 20px;

    background: rgba(15,23,42,.72);

    backdrop-filter: blur(7px);
    -webkit-backdrop-filter: blur(7px);
}

.modal.ativo,
.modal.aberto {
    display: flex;
}

.modalConteudo {
    position: relative;

    width: min(700px, 100%);

    max-height: 90vh;

    overflow-y: auto;

    padding: 28px;

    border-radius: 22px;

    background: #fff;

    box-shadow:
        0 30px 80px rgba(0,0,0,.25);
}

.fecharModal {
    position: absolute;

    top: 14px;
    right: 14px;

    width: 38px;
    height: 38px;

    border: none;
    border-radius: 50%;

    background: #f1f5f9;
    color: #334155;

    font-size: 1.3rem;
}


/* =========================================================
   28. FORMULÁRIOS
   ========================================================= */

input,
select,
textarea {
    width: 100%;

    padding: 12px 14px;

    border: 1px solid #dce2ea;
    border-radius: 12px;

    outline: none;

    background: #fff;
    color: #172033;
}

input:focus,
select:focus,
textarea:focus {
    border-color: #2563eb;

    box-shadow:
        0 0 0 4px rgba(37,99,235,.10);
}

textarea {
    min-height: 130px;

    resize: vertical;
}


/* =========================================================
   29. ESTADOS
   ========================================================= */

.estadoVazio,
.semResultado,
.semResultados,
.carregando,
.loading {
    grid-column: 1 / -1;

    padding: 50px 20px;

    text-align: center;

    border: 1px dashed #d6dce5;
    border-radius: 18px;

    background: #fff;

    color: #697386;
}

.erro {
    grid-column: 1 / -1;

    padding: 20px;

    border: 1px solid #fecaca;
    border-radius: 14px;

    background: #fef2f2;

    color: #b91c1c;

    text-align: center;
}


/* =========================================================
   30. EDITOR DE VÍDEO / COMPATIBILIDADE
   ========================================================= */

.editorVideo {
    position: relative;

    width: 100%;

    overflow: hidden;

    border-radius: 20px;
}

.cinemaOverlay {
    position: absolute;

    inset: 0;

    z-index: 5;

    pointer-events: none;
}

.efeitoKenBurns {
    animation:
        kenBurns 12s ease-in-out infinite alternate;
}

@keyframes kenBurns {
    from {
        transform: scale(1);
    }

    to {
        transform: scale(1.08);
    }
}


/* =========================================================
   31. CARD DE EXPORTAÇÃO
   ========================================================= */

#cardExportacao {
    position: fixed;

    left: -99999px;
    top: 0;

    width: 1080px;
    height: 1350px;

    overflow: hidden;

    background: #111827;
}

.fundoEscuro {
    position: absolute;

    inset: 0;

    background:
        linear-gradient(
            135deg,
            #111827,
            #1e293b
        );
}

.conteudoExportacao {
    position: relative;

    z-index: 2;

    height: 100%;

    padding: 80px;

    display: flex;

    flex-direction: column;

    justify-content: center;

    align-items: center;

    text-align: center;

    color: #fff;
}


/* =========================================================
   32. MODO ESCURO
   ========================================================= */

body.dark {
    background: #0b1120;

    color: #e5e7eb;
}

body.dark header {
    background: rgba(15,23,42,.96);

    border-color: #1e293b;
}

body.dark header h1,
body.dark .logo {
    color: #60a5fa;
}

body.dark nav a {
    color: #cbd5e1;
}

body.dark nav a:hover {
    background: #172554;

    color: #60a5fa;
}

body.dark #temaBtn {
    border-color: #334155;

    background: #1e293b;

    color: #f8fafc;
}

body.dark .hero {
    background:
        radial-gradient(
            circle at 20% 20%,
            rgba(37,99,235,.18),
            transparent 35%
        ),
        radial-gradient(
            circle at 80% 80%,
            rgba(124,58,237,.16),
            transparent 35%
        ),
        #0f172a;

    border-color: #1e293b;
}

body.dark .hero h2 {
    color: #f8fafc;
}

body.dark .hero p {
    color: #94a3b8;
}

body.dark #pesquisa,
body.dark #pesquisaAutor,
body.dark input,
body.dark select,
body.dark textarea {
    border-color: #334155;

    background: #111827;

    color: #f8fafc;
}

body.dark #statusPesquisa {
    color: #94a3b8;
}

body.dark .categoria,
body.dark .categoriaBtn,
body.dark #listaCategorias button {
    border-color: #334155;

    background: #111827;

    color: #cbd5e1;
}

body.dark .categoria:hover,
body.dark .categoriaBtn:hover,
body.dark #listaCategorias button:hover {
    border-color: #3b82f6;

    background: #172554;

    color: #60a5fa;
}

body.dark .secaoTitulo h2 {
    color: #f8fafc;
}

body.dark .secaoTitulo p {
    color: #94a3b8;
}

body.dark .cardFrase {
    border-color: #263449;

    background: #111827;

    box-shadow:
        0 10px 30px rgba(0,0,0,.25);
}

body.dark .botoes {
    background: #111827;

    border-top: 1px solid #1e293b;
}

body.dark .botoes button {
    border-color: #334155;

    background: #1e293b;

    color: #cbd5e1;
}

body.dark .botoes button:hover {
    border-color: #3b82f6;

    background: #172554;

    color: #60a5fa;
}

body.dark .estatistica {
    border-color: #263449;

    background: #111827;
}

body.dark .estatistica span {
    color: #94a3b8;
}

body.dark #contadorGlobal {
    background: #172554;

    color: #60a5fa;
}

body.dark .cartao-previa-comunidade {
    border-color: #263449;

    background: #111827;
}

body.dark .meta-previa-comunidade strong {
    color: #f8fafc;
}

body.dark .meta-previa-comunidade span {
    background: #1e293b;

    color: #94a3b8;
}

body.dark .cartao-previa-comunidade blockquote {
    color: #cbd5e1;
}

body.dark .link-cartao-previa {
    border-color: #1e293b;

    color: #60a5fa;
}

body.dark .estado-previa-comunidade {
    color: #94a3b8;
}

body.dark .estadoVazio,
body.dark .semResultado,
body.dark .semResultados,
body.dark .carregando,
body.dark .loading {
    border-color: #334155;

    background: #111827;

    color: #94a3b8;
}

body.dark .modalConteudo {
    background: #111827;

    color: #e5e7eb;
}

body.dark .fecharModal {
    background: #1e293b;

    color: #e2e8f0;
}


/* =========================================================
   33. RESPONSIVIDADE — TABLET
   ========================================================= */

@media (max-width: 900px) {

    header .container {
        min-height: auto;

        padding-top: 12px;
        padding-bottom: 12px;

        flex-wrap: wrap;
    }

    header h1 {
        font-size: 1.15rem;
    }

    nav {
        order: 3;

        width: 100%;

        padding-bottom: 4px;
    }

    #listaFrases {
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            );

        gap: 18px;
    }

    .imagemFrase {
        min-height: 270px;
    }

    .estatisticas {
        grid-template-columns:
            repeat(3, 1fr);
    }
}


/* =========================================================
   34. RESPONSIVIDADE — CELULAR
   ========================================================= */

@media (max-width: 600px) {

    .container {
        width: min(
            100% - 20px,
            1180px
        );
    }

    header .container {
        gap: 10px;
    }

    header h1 {
        font-size: 1rem;

        max-width: calc(100% - 55px);

        overflow: hidden;

        text-overflow: ellipsis;
    }

    nav {
        justify-content: flex-start;

        overflow-x: auto;

        flex-wrap: nowrap;

        width: 100%;

        padding-bottom: 5px;

        scrollbar-width: none;
    }

    nav::-webkit-scrollbar {
        display: none;
    }

    nav a {
        flex: 0 0 auto;

        padding: 8px 10px;

        font-size: .82rem;
    }

    .hero {
        padding: 48px 16px;
    }

    .hero h2 {
        font-size: 2rem;
    }

    .hero p {
        font-size: .95rem;
    }

    .fraseDia {
        padding: 27px 20px;

        border-radius: 19px;
    }

    #listaFrases {
        grid-template-columns: 1fr;

        gap: 20px;
    }

    .cardFrase {
        border-radius: 19px;
    }

    .imagemFrase {
        aspect-ratio: 4 / 3;

        min-height: 285px;
    }

    .imagemFrase .overlay {
        padding:
            50px
            18px
            58px;
    }

    .imagemFrase .textoFrase {
        max-width: 96%;

        font-size:
            clamp(
                1.05rem,
                5vw,
                1.35rem
            );

        line-height: 1.4;

        -webkit-line-clamp: 8;
    }

    .imagemFrase .autorFrase {
        font-size: .88rem;
    }

    .imagemFrase .marca {
        left: 15px;
        bottom: 13px;

        font-size: .68rem;
    }

    .imagemFrase .badgeCategoria {
        top: 13px;
        left: 13px;

        font-size: .68rem;
    }

    .botoes {
        grid-template-columns:
            repeat(2, 1fr);

        gap: 7px;

        padding: 10px;
    }

    .botoes button {
        min-height: 43px;

        font-size: .78rem;
    }

    .estatisticas {
        grid-template-columns: 1fr;

        gap: 10px;
    }

    .estatistica {
        padding: 18px;
    }

    #listaPublicacoesComunidade {
        grid-template-columns: 1fr;

        gap: 15px;
    }

    .modal {
        padding: 10px;
    }

    .modalConteudo {
        padding: 22px 17px;

        border-radius: 18px;
    }
}


/* =========================================================
   35. CELULARES MUITO PEQUENOS
   ========================================================= */

@media (max-width: 380px) {

    .container {
        width: calc(100% - 14px);
    }

    header h1 {
        font-size: .92rem;
    }

    nav a {
        padding: 7px 8px;

        font-size: .76rem;
    }

    #temaBtn {
        min-width: 38px;
        height: 38px;
    }

    .imagemFrase {
        min-height: 260px;
    }

    .imagemFrase .textoFrase {
        font-size: 1rem;
    }

    .botoes button {
        font-size: .73rem;
    }
}


/* =========================================================
   36. ACESSIBILIDADE
   ========================================================= */

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
    outline: 3px solid rgba(37,99,235,.35);

    outline-offset: 2px;
}


/* =========================================================
   37. REDUÇÃO DE MOVIMENTO
   ========================================================= */

@media (prefers-reduced-motion: reduce) {

    html {
        scroll-behavior: auto;
    }

    *,
    *::before,
    *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .01ms !important;
    }
}
