const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const dominio = 'https://frasesdemessias.com.br';
const imagemSocial = `${dominio}/imagens/1785461694182.png`;

const colecoes = JSON.parse(fs.readFileSync(path.join(raiz, 'dados', 'colecoes-editoriais.json'), 'utf8'));

const escapar = (valor = '') => String(valor)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const nav = `
      <nav aria-label="Navegação principal">
        <a href="index.html">🏠 Início</a>
        <a href="categorias.html">📂 Categorias</a>
        <a href="colecoes.html">✨ Coleções</a>
        <a href="frases-importantes.html">⭐ Frases em destaque</a>
        <a href="comunidade.html">💬 Comunidade</a>
        <a href="favoritos.html">❤️ Favoritos</a>
        <a href="sobre.html">ℹ️ Sobre</a>
        <a href="contato.html">📞 Contato</a>
      </nav>`;

function dadosEstruturados(colecao) {
  return JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${colecao.titulo} | Frases de Messias`,
      description: colecao.descricao,
      url: `${dominio}/${colecao.arquivo}`,
      inLanguage: 'pt-BR',
      isPartOf: { '@type': 'WebSite', name: 'Frases de Messias', url: `${dominio}/` }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${dominio}/` },
        { '@type': 'ListItem', position: 2, name: 'Coleções', item: `${dominio}/colecoes.html` },
        { '@type': 'ListItem', position: 3, name: colecao.tituloCurto, item: `${dominio}/${colecao.arquivo}` }
      ]
    }
  ]).replace(/</g, '\\u003c');
}

function htmlColecao(colecao) {
  const cards = colecao.frases.map(([texto, tema], indice) => `
        <article class="card-frase-colecao" data-frase-card data-texto="${escapar(texto)}" data-tema="${escapar(tema)}">
          <p class="etiqueta-colecao">${escapar(tema)}</p>
          <blockquote>“${escapar(texto)}”</blockquote>
          <p class="autor-frase">— Messias</p>
          <div class="acoes-colecao" aria-label="Ações da frase">
            <button type="button" data-copiar-frase="${escapar(texto)}">Copiar</button>
            <button type="button" data-compartilhar-frase="${escapar(texto)}" data-titulo="${escapar(colecao.tituloCurto)}">Compartilhar</button>
            <button type="button" class="btn-baixar-colecao" data-alternar-download aria-expanded="false">📥 Baixar</button>
          </div>
          <div class="opcoes-download-colecao" data-opcoes-download hidden aria-label="Formatos disponíveis para baixar">
            <p>Escolha o formato:</p>
            <div>
              <button type="button" data-baixar-imagem="story">📱 Imagem Story</button>
              <button type="button" data-baixar-imagem="feed">🖼️ Imagem Feed</button>
              <button type="button" class="btn-video-colecao" data-baixar-video="story">🎬 Vídeo Story</button>
              <button type="button" class="btn-video-colecao" data-baixar-video="feed">🎬 Vídeo Feed</button>
            </div>
          </div>
        </article>`).join('');
  const relacionados = colecao.relacionados.map(([nome, url]) => `<a class="btn-colecao-relacionada" href="${url}">${nome}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapar(colecao.titulo)} | Frases de Messias</title>
  <meta name="description" content="${escapar(colecao.descricao)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${dominio}/${colecao.arquivo}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${dominio}/${colecao.arquivo}">
  <meta property="og:title" content="${escapar(colecao.titulo)} | Frases de Messias">
  <meta property="og:description" content="${escapar(colecao.descricao)}">
  <meta property="og:image" content="${imagemSocial}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapar(colecao.titulo)} | Frases de Messias">
  <meta name="twitter:description" content="${escapar(colecao.descricao)}">
  <meta name="twitter:image" content="${imagemSocial}">
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#4A90E2">
  <link rel="stylesheet" href="style.css?v=20260818-colecoes-midia-v1">
  <script type="application/ld+json">${dadosEstruturados(colecao)}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-3TZ1W3722P"></script>
  <script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-3TZ1W3722P');</script>
</head>
<body class="pagina-colecao" data-colecao="${colecao.slug}">
  <header><div class="container"><p class="titulo-site">📖 Frases de Messias</p>${nav}</div></header>
  <main>
    <section class="hero colecao-hero">
      <p class="breadcrumb"><a href="index.html">Início</a> <span aria-hidden="true">›</span> <a href="colecoes.html">Coleções</a> <span aria-hidden="true">›</span> ${escapar(colecao.tituloCurto)}</p>
      <p class="selo-colecao">COLEÇÃO ESPECIAL</p>
      <h1>${colecao.icone} ${escapar(colecao.titulo)}</h1>
      <p>${escapar(colecao.resumo)}</p>
      <label class="sr-only" for="buscaColecao">Pesquisar nesta coleção</label>
      <input id="buscaColecao" class="busca-colecao" type="search" placeholder="Pesquisar nesta coleção..." autocomplete="off">
    </section>
    <section class="introducao-colecao" aria-labelledby="tituloIntroducao">
      <h2 id="tituloIntroducao">Mensagens para compartilhar com significado</h2>
      <p>${escapar(colecao.introducao[0])}</p>
      <p>${escapar(colecao.introducao[1])}</p>
    </section>
    <section class="secao-frases-colecao" aria-labelledby="tituloFrases">
      <div class="cabecalho-secao-colecao"><div><p class="selo-colecao">SELEÇÃO ORIGINAL</p><h2 id="tituloFrases">${escapar(colecao.tituloCurto)}</h2></div><p id="contadorColecao" aria-live="polite">${colecao.frases.length} frases para você</p></div>
      <div id="listaFrasesColecao" class="grid-frases-colecao">${cards}
      </div>
      <p id="semResultadoColecao" class="semResultado" hidden>Nenhuma frase encontrada. Tente outra palavra.</p>
    </section>
    <section class="colecoes-relacionadas" aria-labelledby="tituloRelacionadas">
      <h2 id="tituloRelacionadas">Continue explorando</h2>
      <p>Encontre mais mensagens para cada momento do seu dia.</p>
      <div class="botoes-colecoes-relacionadas">${relacionados}<a class="btn-colecao-relacionada" href="colecoes.html">✨ Ver todas as coleções</a></div>
    </section>
  </main>
  <footer><p>© 2026 Frases de Messias</p><p><a href="index.html">Início</a> · <a href="colecoes.html">Coleções</a> · <a href="contato.html">Contato</a></p></footer>
  <button id="temaBtn" type="button" aria-pressed="false">🌙 Modo Escuro</button>
  <script type="module" src="colecoes.js?v=20260818-midia-v1"></script>
</body>
</html>`;
}

function cardColecao(colecao) {
  return `
        <a class="card-colecao" href="${colecao.arquivo}">
          <span class="card-colecao-icone" aria-hidden="true">${colecao.icone}</span>
          <span class="card-colecao-conteudo"><strong>${escapar(colecao.tituloCurto)}</strong><small>${escapar(colecao.resumo)}</small></span>
          <span class="card-colecao-seta" aria-hidden="true">→</span>
        </a>`;
}

function htmlHub() {
  const cards = colecoes.map(cardColecao).join('');
  const schema = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Coleções de Frases | Frases de Messias',
    description: 'Coleções especiais de frases para WhatsApp, status, gratidão, família, trabalho, paz e muitos outros momentos.',
    url: `${dominio}/colecoes.html`, inLanguage: 'pt-BR',
    isPartOf: { '@type': 'WebSite', name: 'Frases de Messias', url: `${dominio}/` }
  }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="pt-BR"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coleções de Frases para Compartilhar | Frases de Messias</title>
  <meta name="description" content="Encontre coleções de frases para WhatsApp, status, aniversário, gratidão, família, trabalho, paz e muito mais.">
  <meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${dominio}/colecoes.html">
  <meta property="og:type" content="website"><meta property="og:url" content="${dominio}/colecoes.html"><meta property="og:title" content="Coleções de Frases | Frases de Messias"><meta property="og:description" content="Mensagens selecionadas para compartilhar em diferentes momentos."><meta property="og:image" content="${imagemSocial}">
  <meta name="twitter:card" content="summary_large_image"><link rel="manifest" href="manifest.json"><meta name="theme-color" content="#4A90E2"><link rel="stylesheet" href="style.css?v=20260817-colecoes-v2">
  <script type="application/ld+json">${schema}</script><script async src="https://www.googletagmanager.com/gtag/js?id=G-3TZ1W3722P"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3TZ1W3722P');</script>
</head><body class="pagina-colecoes">
  <header><div class="container"><p class="titulo-site">📖 Frases de Messias</p>${nav}</div></header>
  <main>
    <section class="hero colecao-hero"><p class="breadcrumb"><a href="index.html">Início</a> <span aria-hidden="true">›</span> Coleções</p><p class="selo-colecao">MENSAGENS PARA CADA MOMENTO</p><h1>✨ Coleções de frases para inspirar e compartilhar</h1><p>Escolha uma coleção especial, encontre a mensagem que combina com o seu momento e compartilhe palavras que fazem bem.</p></section>
    <section class="colecoes-listagem" aria-labelledby="tituloColecoes"><h2 id="tituloColecoes">Encontre a coleção certa</h2><div class="grid-colecoes">${cards}</div></section>
    <section class="colecoes-relacionadas"><h2>Quer explorar por tema?</h2><p>Veja também todas as categorias de fé, amor, motivação, reflexão, bom dia e muito mais.</p><div class="botoes-colecoes-relacionadas"><a class="btn-colecao-relacionada" href="categorias.html">📂 Ver todas as categorias</a><a class="btn-colecao-relacionada" href="frases-importantes.html">⭐ Frases em destaque</a></div></section>
  </main>
  <footer><p>© 2026 Frases de Messias</p><p><a href="index.html">Início</a> · <a href="categorias.html">Categorias</a> · <a href="contato.html">Contato</a></p></footer><button id="temaBtn" type="button" aria-pressed="false">🌙 Modo Escuro</button><script type="module" src="colecoes.js?v=20260817-v2"></script>
</body></html>`;
}

for (const colecao of colecoes) fs.writeFileSync(path.join(raiz, colecao.arquivo), htmlColecao(colecao));
fs.writeFileSync(path.join(raiz, 'colecoes.html'), htmlHub());
fs.writeFileSync(path.join(raiz, 'dados', 'colecoes-editoriais.json'), `${JSON.stringify(colecoes, null, 2)}\n`);

const indexPath = path.join(raiz, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
if (!index.includes('colecoes.html')) {
  index = index.replace('      <a href="categorias.html">📂 Categorias</a>', '      <a href="categorias.html">📂 Categorias</a>\n      <a href="colecoes.html">✨ Coleções</a>');
  const vitrineColecoes = `    <a class="btn-categoria" href="frases-de-vida.html">🍃 Vida</a>\n  </div>\n</section>\n\n<section class="colecoes-destaque" aria-labelledby="tituloColecoesDestaque">\n  <div class="cabecalho-colecoes-destaque"><div><p class="selo-colecao">MENSAGENS PARA COMPARTILHAR</p><h2 id="tituloColecoesDestaque">✨ Coleções especiais</h2></div><a href="colecoes.html">Ver todas →</a></div>\n  <p>Frases prontas para status, WhatsApp, aniversário, família, trabalho, paz e outros momentos importantes.</p>\n  <div class="grid-colecoes grid-colecoes-inicial">${colecoes.slice(0, 4).map(cardColecao).join('')}\n  </div>\n</section>`;
  index = index.replace('    <a class="btn-categoria" href="frases-de-vida.html">🍃 Vida</a>\n  </div>\n</section>', vitrineColecoes);
  index = index.replace('  <p class="rodape-canal-telegram">', '  <p><a href="colecoes.html">✨ Explorar coleções especiais</a></p>\n  <p class="rodape-canal-telegram">');
  index = index.replace('style.css?v=20260815-frases-v2', 'style.css?v=20260817-colecoes-v2');
  fs.writeFileSync(indexPath, index);
}

const categoriasPath = path.join(raiz, 'categorias.html');
let categorias = fs.readFileSync(categoriasPath, 'utf8');
if (!categorias.includes('colecoes.html')) {
  categorias = categorias.replace('        <a href="categorias.html">📂 Categorias</a>', '        <a href="categorias.html">📂 Categorias</a>\n        <a href="colecoes.html">✨ Coleções</a>');
  const vitrineCategorias = `    </section>\n    <section class="colecoes-listagem categorias-com-colecoes" aria-labelledby="tituloColecoesEspeciais">\n      <h2 id="tituloColecoesEspeciais">✨ Coleções especiais para compartilhar</h2>\n      <p>Encontre mensagens prontas para situações e formatos específicos.</p>\n      <div class="grid-colecoes">${colecoes.map(cardColecao).join('')}\n      </div>\n    </section>\n  </main>`;
  categorias = categorias.replace('    </section>\n  </main>', vitrineCategorias);
  categorias = categorias.replace('style.css?v=20260815-frases-v2', 'style.css?v=20260817-colecoes-v2');
  categorias = categorias.replace('<p><a href="index.html">Início</a> · <a href="contato.html">Contato</a></p>', '<p><a href="index.html">Início</a> · <a href="colecoes.html">Coleções</a> · <a href="contato.html">Contato</a></p>');
  fs.writeFileSync(categoriasPath, categorias);
}

for (const nome of fs.readdirSync(raiz)) {
  if (!nome.endsWith('.html') || ['index.html', 'categorias.html', 'colecoes.html', ...colecoes.map((item) => item.arquivo)].includes(nome)) continue;
  const arquivo = path.join(raiz, nome);
  let conteudo = fs.readFileSync(arquivo, 'utf8');
  if (conteudo.includes('href="colecoes.html"') || !conteudo.includes('href="categorias.html"')) continue;
  conteudo = conteudo.replace(/(<a href="categorias\.html">[^<]*<\/a>)/, '$1\n        <a href="colecoes.html">✨ Coleções</a>');
  fs.writeFileSync(arquivo, conteudo);
}

console.log(`Criadas ${colecoes.length} coleções e a página central colecoes.html.`);
console.log('Navegação integrada na página inicial, categorias e páginas públicas com menu de categorias.');
