import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const diretorioRaiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const categorias = [
  { nome: 'Amizade', slug: 'amizade', icone: '🤝', descricao: 'Frases de amizade para valorizar pessoas especiais, celebrar vínculos sinceros e compartilhar carinho.' },
  { nome: 'Amor', slug: 'amor', icone: '❤️', descricao: 'Frases de amor para declarar sentimentos, inspirar relacionamentos e compartilhar afeto.' },
  { nome: 'Boa Noite', slug: 'boa-noite', icone: '🌙', descricao: 'Frases de boa noite para desejar descanso, paz, fé e sonhos tranquilos.' },
  { nome: 'Bom Dia', slug: 'bom-dia', icone: '🌞', descricao: 'Frases de bom dia para começar a manhã com esperança, gratidão e inspiração.' },
  { nome: 'Esperança', slug: 'esperanca', icone: '🌱', descricao: 'Frases de esperança para fortalecer a confiança em dias melhores e renovar a fé.' },
  { nome: 'Família', slug: 'familia', icone: '🏡', descricao: 'Frases de família para celebrar união, cuidado, amor e momentos especiais.' },
  { nome: 'Fé', slug: 'fe', icone: '🙏', descricao: 'Frases de fé em Deus para inspirar confiança, coragem e serenidade todos os dias.' },
  { nome: 'Gratidão', slug: 'gratidao', icone: '✨', descricao: 'Frases de gratidão para reconhecer bênçãos, cultivar alegria e compartilhar boas mensagens.' },
  { nome: 'Motivação', slug: 'motivacao', icone: '💪', descricao: 'Frases de motivação para superar desafios, acreditar no seu potencial e seguir em frente.' },
  { nome: 'Reflexão', slug: 'reflexao', icone: '💡', descricao: 'Frases de reflexão para pensar sobre a vida, fazer escolhas e encontrar novos caminhos.' },
  { nome: 'Sucesso', slug: 'sucesso', icone: '🚀', descricao: 'Frases de sucesso para estimular foco, persistência, coragem e realização de sonhos.' },
  { nome: 'Vida', slug: 'vida', icone: '🍃', descricao: 'Frases sobre a vida para inspirar momentos, escolhas, aprendizados e recomeços.' }
];

const dominio = 'https://frasesdemessias.com.br';
const analytics = `
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-3TZ1W3722P"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-3TZ1W3722P');
  </script>`;

function escaparAtributo(valor) {
  return String(valor).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function navegacao() {
  return `
      <nav aria-label="Navegação principal">
        <a href="index.html">🏠 Início</a>
        <a href="categorias.html">📂 Categorias</a>
        <a href="frases-importantes.html">⭐ Frases em destaque</a>
        <a href="comunidade.html">💬 Comunidade</a>
        <a href="favoritos.html">❤️ Favoritos</a>
        <a href="sobre.html">ℹ️ Sobre</a>
        <a href="contato.html">📞 Contato</a>
      </nav>`;
}

function paginaCategoria(categoria) {
  const url = `${dominio}/frases-de-${categoria.slug}.html`;
  const titulo = `Frases de ${categoria.nome} | Frases de Messias`;
  const descricao = categoria.descricao;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Frases de ${categoria.nome}`,
    description: descricao,
    url,
    inLanguage: 'pt-BR',
    isPartOf: { '@type': 'WebSite', name: 'Frases de Messias', url: `${dominio}/` },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${dominio}/` },
        { '@type': 'ListItem', position: 2, name: 'Categorias', item: `${dominio}/categorias.html` },
        { '@type': 'ListItem', position: 3, name: `Frases de ${categoria.nome}`, item: url }
      ]
    }
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escaparAtributo(titulo)}</title>
  <meta name="description" content="${escaparAtributo(descricao)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${escaparAtributo(titulo)}">
  <meta property="og:description" content="${escaparAtributo(descricao)}">
  <meta property="og:image" content="${dominio}/imagens/1785461694182.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escaparAtributo(titulo)}">
  <meta name="twitter:description" content="${escaparAtributo(descricao)}">
  <meta name="twitter:image" content="${dominio}/imagens/1785461694182.png">
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#4A90E2">
  <link rel="stylesheet" href="style.css?v=20260815-frases-v2">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>${analytics}
</head>
<body data-categoria="${escaparAtributo(categoria.nome)}">
  <header>
    <div class="container">
      <h1>📖 Frases de Messias</h1>${navegacao()}
    </div>
  </header>
  <main>
    <section class="hero categoria-hero">
      <p class="breadcrumb"><a href="index.html">Início</a> <span aria-hidden="true">›</span> <a href="categorias.html">Categorias</a> <span aria-hidden="true">›</span> ${categoria.nome}</p>
      <h2>${categoria.icone} Frases de ${categoria.nome}</h2>
      <p>${descricao}</p>
      <label class="sr-only" for="buscaCategoria">Pesquisar em frases de ${categoria.nome}</label>
      <input type="search" id="buscaCategoria" class="busca-categoria" placeholder="Pesquisar frases de ${categoria.nome.toLowerCase()}..." autocomplete="off">
    </section>
    <section class="categorias categoria-links" aria-labelledby="outrasCategoriasTitulo">
      <h2 id="outrasCategoriasTitulo">Explore outras categorias</h2>
      <div class="grid-botoes">
        <a class="btn-categoria" href="frases-importantes.html">⭐ Frases em destaque</a>
        <a class="btn-categoria" href="categorias.html">Ver todas as categorias</a>
        <a class="btn-categoria" href="index.html">Ver todas as frases</a>
      </div>
    </section>
    <section class="frases-categoria" aria-labelledby="tituloListaCategoria">
      <div class="cabecalho-lista-categoria">
        <h2 id="tituloListaCategoria">Frases de ${categoria.nome}</h2>
        <p id="contadorFrases" aria-live="polite"></p>
      </div>
      <div id="listaFrasesCategoria"></div>
    </section>
  </main>
  <footer>
    <p>© 2026 Frases de Messias</p>
    <p><a href="categorias.html">Todas as categorias</a> · <a href="contato.html">Contato</a></p>
  </footer>
  <button id="temaBtn" type="button" aria-pressed="false">🌙 Modo Escuro</button>
  <script type="module" src="categoria.js?v=20260815-categorias-download-video-v3"></script>
</body>
</html>
`;
}

function paginaCentral() {
  const url = `${dominio}/categorias.html`;
  const cards = categorias.map((categoria) => `
        <a class="card-categoria-pagina" href="frases-de-${categoria.slug}.html">
          <span class="card-categoria-icone" aria-hidden="true">${categoria.icone}</span>
          <span class="card-categoria-conteudo"><strong>Frases de ${categoria.nome}</strong><small>${categoria.descricao}</small></span>
          <span class="card-categoria-seta" aria-hidden="true">→</span>
        </a>`).join('');
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Categorias de Frases | Frases de Messias',
    description: 'Encontre frases de motivação, fé, amor, amizade, reflexão, gratidão, bom dia, boa noite e mais.',
    url,
    inLanguage: 'pt-BR',
    isPartOf: { '@type': 'WebSite', name: 'Frases de Messias', url: `${dominio}/` }
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Categorias de Frases | Frases de Messias</title>
  <meta name="description" content="Encontre frases de motivação, fé, amor, amizade, reflexão, gratidão, bom dia, boa noite e mais.">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="Categorias de Frases | Frases de Messias">
  <meta property="og:description" content="Escolha uma categoria e encontre mensagens para inspirar, compartilhar e transformar o seu dia.">
  <meta property="og:image" content="${dominio}/imagens/1785461694182.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#4A90E2">
  <link rel="stylesheet" href="style.css?v=20260815-frases-v2">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>${analytics}
</head>
<body>
  <header>
    <div class="container">
      <h1>📖 Frases de Messias</h1>${navegacao()}
    </div>
  </header>
  <main>
    <section class="hero categoria-hero">
      <p class="breadcrumb"><a href="index.html">Início</a> <span aria-hidden="true">›</span> Categorias</p>
      <h2>📂 Categorias de frases</h2>
      <p>Escolha um tema e encontre mensagens para inspirar, compartilhar e tornar o seu dia mais especial.</p>
    </section>
    <section class="categorias pagina-categorias" aria-labelledby="tituloCategorias">
      <h2 id="tituloCategorias">Encontre a frase certa para cada momento</h2>
      <div class="grid-categorias-paginas">${cards}
      </div>
    </section>
  </main>
  <footer>
    <p>© 2026 Frases de Messias</p>
    <p><a href="index.html">Início</a> · <a href="contato.html">Contato</a></p>
  </footer>
  <button id="temaBtn" type="button" aria-pressed="false">🌙 Modo Escuro</button>
  <script type="module">
    const botaoTema = document.getElementById('temaBtn');
    const aplicarTema = (escuro) => {
      document.body.classList.toggle('dark', escuro);
      botaoTema.textContent = escuro ? '☀️ Modo Claro' : '🌙 Modo Escuro';
      botaoTema.setAttribute('aria-pressed', String(escuro));
    };
    aplicarTema(localStorage.getItem('tema') === 'dark');
    botaoTema.addEventListener('click', () => {
      const escuro = !document.body.classList.contains('dark');
      localStorage.setItem('tema', escuro ? 'dark' : 'light');
      aplicarTema(escuro);
    });
  </script>
</body>
</html>
`;
}

await mkdir(diretorioRaiz, { recursive: true });
await writeFile(resolve(diretorioRaiz, 'categorias.html'), paginaCentral(), 'utf8');
for (const categoria of categorias) {
  await writeFile(resolve(diretorioRaiz, `frases-de-${categoria.slug}.html`), paginaCategoria(categoria), 'utf8');
}

console.log(JSON.stringify({ paginasCriadas: categorias.length + 1, categorias: categorias.map(({ nome, slug }) => ({ nome, url: `/frases-de-${slug}.html` })) }, null, 2));
