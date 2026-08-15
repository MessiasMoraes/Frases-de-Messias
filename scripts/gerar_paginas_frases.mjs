import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dominio = 'https://frasesdemessias.com.br';
const dataAtualizacao = '2026-08-15';
const categorias = {
  'Amizade': { slug: 'amizade', icone: '🤝', descricao: 'Frases de amizade para valorizar pessoas especiais, celebrar vínculos sinceros e compartilhar carinho.' },
  'Amor': { slug: 'amor', icone: '❤️', descricao: 'Frases de amor para declarar sentimentos, inspirar relacionamentos e compartilhar afeto.' },
  'Boa Noite': { slug: 'boa-noite', icone: '🌙', descricao: 'Frases de boa noite para desejar descanso, paz, fé e sonhos tranquilos.' },
  'Bom Dia': { slug: 'bom-dia', icone: '🌞', descricao: 'Frases de bom dia para começar a manhã com esperança, gratidão e inspiração.' },
  'Esperança': { slug: 'esperanca', icone: '🌱', descricao: 'Frases de esperança para fortalecer a confiança em dias melhores e renovar a fé.' },
  'Família': { slug: 'familia', icone: '🏡', descricao: 'Frases de família para celebrar união, cuidado, amor e momentos especiais.' },
  'Fé': { slug: 'fe', icone: '🙏', descricao: 'Frases de fé em Deus para inspirar confiança, coragem e serenidade todos os dias.' },
  'Gratidão': { slug: 'gratidao', icone: '✨', descricao: 'Frases de gratidão para reconhecer bênçãos, cultivar alegria e compartilhar boas mensagens.' },
  'Motivação': { slug: 'motivacao', icone: '💪', descricao: 'Frases de motivação para superar desafios, acreditar no seu potencial e seguir em frente.' },
  'Reflexão': { slug: 'reflexao', icone: '💡', descricao: 'Frases de reflexão para pensar sobre a vida, fazer escolhas e encontrar novos caminhos.' },
  'Sucesso': { slug: 'sucesso', icone: '🚀', descricao: 'Frases de sucesso para estimular foco, persistência, coragem e realização de sonhos.' },
  'Vida': { slug: 'vida', icone: '🍃', descricao: 'Frases sobre a vida para inspirar momentos, escolhas, aprendizados e recomeços.' }
};

const analytics = `
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-3TZ1W3722P"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-3TZ1W3722P');
  </script>`;

const escaparHtml = (valor) => String(valor)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const slugificar = (valor) => String(valor)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-+/g, '-');

function caminhoFrase(frase) {
  return `frases/${slugificar(frase.texto).slice(0, 90)}.html`;
}

function navegacao() {
  return `
      <nav aria-label="Navegação principal">
        <a href="../index.html">🏠 Início</a>
        <a href="../categorias.html">📂 Categorias</a>
        <a href="../frases-importantes.html">⭐ Frases em destaque</a>
        <a href="../comunidade.html">💬 Comunidade</a>
        <a href="../contato.html">📞 Contato</a>
      </nav>`;
}

function navegacaoRaiz() {
  return `
      <nav aria-label="Navegação principal">
        <a href="index.html">🏠 Início</a>
        <a href="categorias.html">📂 Categorias</a>
        <a href="frases-importantes.html">⭐ Frases em destaque</a>
        <a href="comunidade.html">💬 Comunidade</a>
        <a href="contato.html">📞 Contato</a>
      </nav>`;
}

function reflexaoCategoria(categoria) {
  const textos = {
    'Amizade': 'Uma amizade sincera oferece acolhimento nos dias leves e presença quando o caminho fica difícil. Compartilhe esta mensagem com alguém que torna a sua vida mais especial.',
    'Amor': 'O amor se revela no cuidado diário, no respeito e nas pequenas atitudes. Esta mensagem é uma forma simples de lembrar alguém do valor de um vínculo verdadeiro.',
    'Boa Noite': 'Ao final do dia, uma mensagem tranquila pode levar serenidade a quem você ama. Compartilhe esta frase como um desejo de descanso, paz e um novo amanhecer.',
    'Bom Dia': 'Uma palavra de esperança pela manhã pode transformar o começo do dia. Use esta frase para levar leveza, gratidão e bons pensamentos a alguém especial.',
    'Esperança': 'Em tempos de incerteza, a esperança ajuda a manter os olhos voltados para novos caminhos. Esta mensagem convida a seguir em frente com confiança nos dias melhores.',
    'Família': 'Os laços familiares se fortalecem com atenção, presença e carinho. Esta frase pode ser compartilhada para celebrar quem caminha ao seu lado em todos os momentos.',
    'Fé': 'A fé oferece coragem para atravessar os dias difíceis e serenidade para continuar. Compartilhe esta frase quando quiser enviar uma mensagem de confiança e cuidado.',
    'Gratidão': 'Reconhecer as pequenas bênçãos transforma a maneira de olhar para a vida. Esta mensagem é um convite para agradecer e valorizar o que já existe no presente.',
    'Motivação': 'Todo objetivo começa com um passo possível no presente. Esta frase pode inspirar alguém a manter a constância, acreditar no próprio potencial e não desistir.',
    'Reflexão': 'Refletir é abrir espaço para escolhas mais conscientes e novos aprendizados. Compartilhe esta mensagem quando quiser convidar alguém a olhar a vida com calma e profundidade.',
    'Sucesso': 'O sucesso é construído com foco, persistência e decisões diárias. Esta frase pode acompanhar quem está trabalhando por um sonho ou recomeçando um projeto.',
    'Vida': 'A vida reúne aprendizados, recomeços e encontros que merecem atenção. Esta mensagem é um convite para valorizar o caminho e tornar cada momento mais significativo.'
  };
  return textos[categoria] || 'Compartilhe esta mensagem para levar inspiração e bons pensamentos a alguém especial.';
}

function botaoTema() {
  return `
  <button id="temaBtn" type="button" aria-pressed="false">🌙 Modo Escuro</button>
  <script>
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
  </script>`;
}

function paginaFrase(frase, indice, todas) {
  const categoria = categorias[frase.categoria];
  const caminho = caminhoFrase(frase);
  const url = `${dominio}/${caminho}`;
  const tituloBase = `“${frase.texto}”`;
  const titulo = `${tituloBase} | Frase de ${frase.categoria} | Frases de Messias`;
  const descricao = `${frase.texto} — ${frase.autor}. ${categoria.descricao}`.slice(0, 158);
  const relacionadas = todas.filter((item) => item.categoria === frase.categoria && item.texto !== frase.texto).slice(0, 2);
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: titulo,
        description: descricao,
        inLanguage: 'pt-BR',
        dateModified: dataAtualizacao,
        isPartOf: { '@type': 'WebSite', name: 'Frases de Messias', url: `${dominio}/` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: { '@id': `${url}#frase` }
      },
      {
        '@type': 'Quotation',
        '@id': `${url}#frase`,
        text: frase.texto,
        author: { '@type': 'Person', name: frase.autor },
        inLanguage: 'pt-BR',
        isPartOf: { '@type': 'CollectionPage', name: `Frases de ${frase.categoria}`, url: `${dominio}/frases-de-${categoria.slug}.html` }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${dominio}/` },
          { '@type': 'ListItem', position: 2, name: 'Categorias', item: `${dominio}/categorias.html` },
          { '@type': 'ListItem', position: 3, name: `Frases de ${frase.categoria}`, item: `${dominio}/frases-de-${categoria.slug}.html` },
          { '@type': 'ListItem', position: 4, name: `Frase: ${frase.texto}`, item: url }
        ]
      }
    ]
  };

  const relacionadasHtml = relacionadas.map((item) => `
            <li><a href="${escaparHtml(caminhoFrase(item).replace('frases/', ''))}">${escaparHtml(item.texto)}</a></li>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escaparHtml(titulo)}</title>
  <meta name="description" content="${escaparHtml(descricao)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${escaparHtml(tituloBase)}">
  <meta property="og:description" content="${escaparHtml(descricao)}">
  <meta property="og:site_name" content="Frases de Messias">
  <meta property="og:image" content="${dominio}/imagens/1785461694182.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escaparHtml(tituloBase)}">
  <meta name="twitter:description" content="${escaparHtml(descricao)}">
  <meta name="twitter:image" content="${dominio}/imagens/1785461694182.png">
  <link rel="manifest" href="../manifest.json">
  <meta name="theme-color" content="#4A90E2">
  <link rel="stylesheet" href="../style.css?v=20260815-frases-v2">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>${analytics}
</head>
<body class="pagina-frase">
  <header>
    <div class="container">
      <p class="titulo-site">📖 Frases de Messias</p>${navegacao()}
    </div>
  </header>
  <main>
    <article class="frase-artigo" data-frase-id="${indice}">
      <p class="breadcrumb"><a href="../index.html">Início</a> <span aria-hidden="true">›</span> <a href="../categorias.html">Categorias</a> <span aria-hidden="true">›</span> <a href="../frases-de-${categoria.slug}.html">${escaparHtml(frase.categoria)}</a> <span aria-hidden="true">›</span> Frase</p>
      <p class="etiqueta-categoria">${categoria.icone} Frase de ${escaparHtml(frase.categoria)}</p>
      <h1>${escaparHtml(frase.texto)}</h1>
      <blockquote>“${escaparHtml(frase.texto)}”</blockquote>
      <p class="autor-frase">— ${escaparHtml(frase.autor)}</p>
      <div class="acoes-frase-individual" aria-label="Ações da frase">
        <button type="button" class="botao-copiar" data-texto="${escaparHtml(frase.texto)}" data-autor="${escaparHtml(frase.autor)}">Copiar frase</button>
        <button type="button" class="botao-compartilhar" data-texto="${escaparHtml(frase.texto)}">Compartilhar</button>
      </div>
      <section class="contexto-frase" aria-labelledby="contexto-${indice}">
        <h3 id="contexto-${indice}">Sobre esta frase de ${escaparHtml(frase.categoria)}</h3>
        <p>${escaparHtml(reflexaoCategoria(frase.categoria))}</p>
        <p>Explore outras mensagens na categoria <a href="../frases-de-${categoria.slug}.html">Frases de ${escaparHtml(frase.categoria)}</a> e encontre palavras para diferentes momentos.</p>
      </section>
      <section class="frases-relacionadas" aria-labelledby="relacionadas-${indice}">
        <h3 id="relacionadas-${indice}">Outras frases de ${escaparHtml(frase.categoria)}</h3>
        <ul>${relacionadasHtml}
        </ul>
      </section>
    </article>
  </main>
  <footer>
    <p>© 2026 Frases de Messias</p>
    <p><a href="../frases-importantes.html">Frases em destaque</a> · <a href="../categorias.html">Todas as categorias</a> · <a href="../contato.html">Contato</a></p>
  </footer>${botaoTema()}
  <script>
    document.querySelector('.botao-copiar').addEventListener('click', async (event) => {
      const botao = event.currentTarget;
      const texto = botao.dataset.texto + ' — ' + botao.dataset.autor;
      try {
        await navigator.clipboard.writeText(texto);
        botao.textContent = 'Frase copiada!';
      } catch {
        const area = document.createElement('textarea');
        area.value = texto;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
        botao.textContent = 'Frase copiada!';
      }
      setTimeout(() => { botao.textContent = 'Copiar frase'; }, 1800);
    });
    document.querySelector('.botao-compartilhar').addEventListener('click', async (event) => {
      const texto = '“' + event.currentTarget.dataset.texto + '” — ${escaparHtml(frase.autor)}';
      if (navigator.share) {
        await navigator.share({ title: 'Frases de Messias', text: texto, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(texto + ' ' + window.location.href);
        event.currentTarget.textContent = 'Link copiado!';
        setTimeout(() => { event.currentTarget.textContent = 'Compartilhar'; }, 1800);
      }
    });
  </script>
</body>
</html>
`;
}

function paginaCentral(frases) {
  const url = `${dominio}/frases-importantes.html`;
  const cards = frases.map((frase) => {
    const categoria = categorias[frase.categoria];
    return `
        <article class="card-frase-destaque">
          <p class="etiqueta-categoria">${categoria.icone} ${escaparHtml(frase.categoria)}</p>
          <h3><a href="${escaparHtml(caminhoFrase(frase))}">${escaparHtml(frase.texto)}</a></h3>
          <p class="autor-frase">— ${escaparHtml(frase.autor)}</p>
          <a class="link-ver-frase" href="${escaparHtml(caminhoFrase(frase))}">Ler e compartilhar →</a>
        </article>`;
  }).join('');
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Frases em destaque | Frases de Messias',
    description: 'Seleção de frases importantes de motivação, fé, amor, esperança, gratidão e reflexão para ler e compartilhar.',
    url,
    inLanguage: 'pt-BR',
    isPartOf: { '@type': 'WebSite', name: 'Frases de Messias', url: `${dominio}/` }
  };
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Frases em Destaque para Compartilhar | Frases de Messias</title>
  <meta name="description" content="Seleção de frases importantes de motivação, fé, amor, esperança, gratidão e reflexão para ler e compartilhar.">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="Frases em Destaque | Frases de Messias">
  <meta property="og:description" content="Encontre frases selecionadas para inspirar e compartilhar.">
  <meta property="og:image" content="${dominio}/imagens/1785461694182.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#4A90E2">
  <link rel="stylesheet" href="style.css?v=20260815-frases-v2">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>${analytics}
</head>
<body class="pagina-frases-destaque">
  <header><div class="container"><p class="titulo-site">📖 Frases de Messias</p>${navegacaoRaiz()}</div></header>
  <main>
    <section class="hero categoria-hero">
      <p class="breadcrumb"><a href="index.html">Início</a> <span aria-hidden="true">›</span> Frases em destaque</p>
      <h1>⭐ Frases importantes para inspirar e compartilhar</h1>
      <p>Uma seleção especial de mensagens de motivação, fé, amor, esperança e reflexão para diferentes momentos do seu dia.</p>
    </section>
    <section class="lista-frases-destaque" aria-labelledby="tituloDestaques">
      <h2 id="tituloDestaques">Frases selecionadas</h2>
      <div class="grid-frases-destaque">${cards}
      </div>
    </section>
  </main>
  <footer><p>© 2026 Frases de Messias</p><p><a href="categorias.html">Todas as categorias</a> · <a href="contato.html">Contato</a></p></footer>${botaoTema()}
</body>
</html>`;
}

function sitemapComFrases(sitemapAtual, frases) {
  const semEntradasAntigas = sitemapAtual
    .replace(/\s*<url>\s*<loc>https:\/\/frasesdemessias\.com\.br\/frases-importantes\.html<\/loc>[\s\S]*?<\/url>/g, '')
    .replace(/\s*<url>\s*<loc>https:\/\/frasesdemessias\.com\.br\/frases\/[^<]+<\/loc>[\s\S]*?<\/url>/g, '');
  const novasEntradas = [
    '  <url>\n    <loc>https://frasesdemessias.com.br/frases-importantes.html</loc>\n    <lastmod>2026-08-15</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>',
    ...frases.map((frase) => `  <url>\n    <loc>${dominio}/${caminhoFrase(frase)}</loc>\n    <lastmod>${dataAtualizacao}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`)
  ].join('\n');
  return semEntradasAntigas.replace('</urlset>', `${novasEntradas}\n</urlset>`);
}

const frases = JSON.parse(await readFile(resolve(raiz, 'frases-destaque.json'), 'utf8'));
await mkdir(resolve(raiz, 'frases'), { recursive: true });
for (const [indice, frase] of frases.entries()) {
  await writeFile(resolve(raiz, caminhoFrase(frase)), paginaFrase(frase, indice + 1, frases), 'utf8');
}
await writeFile(resolve(raiz, 'frases-importantes.html'), paginaCentral(frases), 'utf8');
const sitemapAtual = await readFile(resolve(raiz, 'sitemap.xml'), 'utf8');
await writeFile(resolve(raiz, 'sitemap.xml'), sitemapComFrases(sitemapAtual, frases), 'utf8');
console.log(JSON.stringify({ paginasIndividuais: frases.length, paginaCentral: '/frases-importantes.html', sitemapAtualizado: true }, null, 2));
