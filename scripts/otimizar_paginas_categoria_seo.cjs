const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const origem = 'https://frasesdemessias.com.br';

const paginas = {
  'frases-de-fe.html': {
    categoria: 'Fé',
    slug: 'frases-de-fe.html',
    titulo: 'Frases de Fé e Esperança para Inspirar o Dia | Frases de Messias',
    descricao: 'Encontre frases de fé e esperança em Deus para renovar a confiança, compartilhar no WhatsApp e começar cada dia com paz e serenidade.',
    h1: 'Frases de Fé e Esperança para Inspirar o Dia',
    resumo: 'Mensagens de fé em Deus para renovar a esperança, encontrar serenidade e compartilhar palavras que fortalecem o coração.',
    seoTitulo: 'Mensagens de fé para renovar a esperança',
    paragrafos: [
      'Em dias de desafio ou de gratidão, uma frase de fé pode ser um convite para respirar, confiar e seguir adiante. Nesta coleção, reunimos mensagens sobre Deus, esperança, coragem e paz para acompanhar diferentes momentos da sua caminhada.',
      'Escolha uma mensagem que converse com o seu dia, copie para enviar no WhatsApp ou compartilhe nas redes sociais. As frases também podem servir de inspiração para uma reflexão pessoal, uma legenda ou um gesto de carinho com quem precisa de uma palavra de conforto.'
    ],
    relacionados: [
      ['frases-de-esperanca.html', 'Frases de Esperança'],
      ['frases-de-gratidao.html', 'Frases de Gratidão'],
      ['frases-de-bom-dia.html', 'Frases de Bom Dia']
    ],
    socialImage: '/imagens/1785461694182.png'
  },
  'frases-de-amor.html': {
    categoria: 'Amor',
    slug: 'frases-de-amor.html',
    titulo: 'Frases de Amor para Compartilhar Sentimentos | Frases de Messias',
    descricao: 'Descubra frases de amor para declarar sentimentos, homenagear alguém especial e compartilhar carinho no WhatsApp e nas redes sociais.',
    h1: 'Frases de Amor para Compartilhar Sentimentos',
    resumo: 'Mensagens de amor para transformar sentimentos em palavras, celebrar vínculos e demonstrar carinho a pessoas especiais.',
    seoTitulo: 'Mensagens de amor para momentos especiais',
    paragrafos: [
      'O amor aparece nos pequenos gestos, nas lembranças e nas palavras escolhidas com cuidado. Esta seleção reúne frases de amor para expressar afeto, valorizar uma relação e criar uma mensagem especial para quem faz parte da sua história.',
      'Use estas mensagens como inspiração para uma declaração, uma legenda, um cartão ou uma conversa sincera. Você pode copiar a frase que mais combina com o momento e enviar para namorado, namorada, família, amigos ou qualquer pessoa querida.'
    ],
    relacionados: [
      ['frases-de-amizade.html', 'Frases de Amizade'],
      ['frases-de-familia.html', 'Frases de Família'],
      ['frases-de-gratidao.html', 'Frases de Gratidão']
    ],
    socialImage: '/imagens/1785461694182.png'
  },
  'frases-de-motivacao.html': {
    categoria: 'Motivação',
    slug: 'frases-de-motivacao.html',
    titulo: 'Frases de Motivação para Superar Desafios | Frases de Messias',
    descricao: 'Leia frases de motivação para superar desafios, acreditar no seu potencial e encontrar inspiração para seguir em frente todos os dias.',
    h1: 'Frases de Motivação para Superar Desafios',
    resumo: 'Mensagens de motivação para recuperar o foco, fortalecer a determinação e seguir em frente com mais confiança.',
    seoTitulo: 'Mensagens para manter o foco e seguir em frente',
    paragrafos: [
      'Há dias em que um novo ponto de vista ajuda a recuperar o ritmo. Nesta página, você encontra frases de motivação sobre persistência, coragem, sonhos e recomeços para lembrar que cada passo consciente pode aproximar você dos seus objetivos.',
      'Salve as mensagens que mais inspiram você ou compartilhe uma delas com alguém que esteja enfrentando uma fase difícil. Uma frase curta pode abrir espaço para uma pausa, uma nova atitude e mais confiança para continuar.'
    ],
    relacionados: [
      ['frases-de-sucesso.html', 'Frases de Sucesso'],
      ['frases-de-vida.html', 'Frases de Vida'],
      ['frases-de-reflexao.html', 'Frases de Reflexão']
    ],
    socialImage: '/imagens/1785461694182.png'
  },
  'frases-de-bom-dia.html': {
    categoria: 'Bom Dia',
    slug: 'frases-de-bom-dia.html',
    titulo: 'Frases de Bom Dia para Começar com Alegria | Frases de Messias',
    descricao: 'Encontre frases de bom dia com fé, alegria e gratidão para enviar no WhatsApp, desejar uma manhã especial e inspirar quem você ama.',
    h1: 'Frases de Bom Dia para Começar com Alegria',
    resumo: 'Mensagens de bom dia com fé, gratidão e bons desejos para transformar o começo da manhã em um gesto de carinho.',
    seoTitulo: 'Mensagens de bom dia para compartilhar carinho',
    paragrafos: [
      'Começar a manhã com uma palavra positiva é uma forma simples de demonstrar presença e desejar coisas boas. Esta coleção traz frases de bom dia com alegria, fé, gratidão e esperança para acompanhar o primeiro momento do dia.',
      'Escolha uma mensagem para enviar no WhatsApp, publicar nos seus stories ou usar como legenda. São palavras para desejar uma manhã leve e lembrar pessoas especiais de que elas estão no seu pensamento.'
    ],
    relacionados: [
      ['frases-de-fe.html', 'Frases de Fé'],
      ['frases-de-gratidao.html', 'Frases de Gratidão'],
      ['frases-de-motivacao.html', 'Frases de Motivação']
    ],
    socialImage: '/imagens/1785461694182.png'
  },
  'frases-de-boa-noite.html': {
    categoria: 'Boa Noite',
    slug: 'frases-de-boa-noite.html',
    titulo: 'Frases de Boa Noite com Paz e Carinho | Frases de Messias',
    descricao: 'Veja frases de boa noite com paz, fé e carinho para desejar descanso, enviar no WhatsApp e encerrar o dia com uma mensagem especial.',
    h1: 'Frases de Boa Noite com Paz e Carinho',
    resumo: 'Mensagens de boa noite para desejar descanso, paz e sonhos tranquilos a quem é importante para você.',
    seoTitulo: 'Mensagens de boa noite para encerrar o dia em paz',
    paragrafos: [
      'Ao fim do dia, uma mensagem de boa noite pode transformar o silêncio em cuidado. Aqui você encontra frases com paz, fé, serenidade e carinho para desejar descanso a amigos, família e pessoas especiais.',
      'Copie a frase que mais combina com o momento e compartilhe no WhatsApp, nas redes sociais ou em uma mensagem particular. Um desejo sincero de boa noite é uma maneira delicada de encerrar o dia e manter os vínculos por perto.'
    ],
    relacionados: [
      ['frases-de-fe.html', 'Frases de Fé'],
      ['frases-de-esperanca.html', 'Frases de Esperança'],
      ['frases-de-reflexao.html', 'Frases de Reflexão']
    ],
    socialImage: '/imagens/1785461694182.png'
  }
};

function escaparHtml(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function criarJsonLd(dados) {
  const url = `${origem}/${dados.slug}`;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: dados.h1,
        description: dados.descricao,
        inLanguage: 'pt-BR',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${origem}/#website`,
          name: 'Frases de Messias',
          url: `${origem}/`
        },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        about: { '@type': 'Thing', name: `Frases de ${dados.categoria}` }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${origem}/` },
          { '@type': 'ListItem', position: 2, name: 'Categorias', item: `${origem}/categorias.html` },
          { '@type': 'ListItem', position: 3, name: `Frases de ${dados.categoria}`, item: url }
        ]
      }
    ]
  });
}

function cabecalhoSeo(dados) {
  const url = `${origem}/${dados.slug}`;
  const imagem = `${origem}${dados.socialImage}`;
  return `  <title>${escaparHtml(dados.titulo)}</title>
  <meta name="description" content="${escaparHtml(dados.descricao)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Frases de Messias">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${escaparHtml(dados.titulo)}">
  <meta property="og:description" content="${escaparHtml(dados.descricao)}">
  <meta property="og:image" content="${imagem}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escaparHtml(dados.titulo)}">
  <meta name="twitter:description" content="${escaparHtml(dados.descricao)}">
  <meta name="twitter:image" content="${imagem}">
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#4A90E2">
  <link rel="stylesheet" href="style.css?v=20260817-categorias-seo-v1">
  <script type="application/ld+json">${criarJsonLd(dados)}</script>`;
}

function criarIntroducao(dados) {
  return `    <section class="categoria-conteudo" aria-labelledby="introducao-${dados.slug.replace('.html', '')}">
      <h2 id="introducao-${dados.slug.replace('.html', '')}">${escaparHtml(dados.seoTitulo)}</h2>
      <p>${escaparHtml(dados.paragrafos[0])}</p>
      <p>${escaparHtml(dados.paragrafos[1])}</p>
    </section>`;
}

function criarLinksRelacionados(dados) {
  const links = dados.relacionados.map(([href, rotulo]) => `        <a class="btn-categoria" href="${href}">${escaparHtml(rotulo)}</a>`).join('\n');
  return `    <section class="categorias categoria-links" aria-labelledby="outrasCategoriasTitulo">
      <h2 id="outrasCategoriasTitulo">Explore categorias relacionadas</h2>
      <p class="texto-categorias-relacionadas">Encontre mais mensagens para diferentes momentos e pessoas especiais.</p>
      <div class="grid-botoes">
${links}
        <a class="btn-categoria" href="categorias.html">Ver todas as categorias</a>
        <a class="btn-categoria" href="frases-importantes.html">Frases em destaque</a>
      </div>
    </section>`;
}

for (const [arquivo, dados] of Object.entries(paginas)) {
  const caminho = path.join(raiz, arquivo);
  let html = fs.readFileSync(caminho, 'utf8');

  html = html.replace(/  <title>[\s\S]*?<script type="application\/ld\+json">[\s\S]*?<\/script>/, cabecalhoSeo(dados));
  html = html.replace(/<body data-categoria="[^"]+">/, `<body class="pagina-categoria" data-categoria="${dados.categoria}">`);
  html = html.replace(/<h1>📖 Frases de Messias<\/h1>/, '<p class="titulo-site">📖 Frases de Messias</p>');
  html = html.replace(/(<p class="breadcrumb">[\s\S]*?<\/p>\s*)<h2>[^<]+<\/h2>\s*<p>[^<]+<\/p>/, `$1<h1>${escaparHtml(dados.h1)}</h1>\n      <p>${escaparHtml(dados.resumo)}</p>`);
  html = html.replace(/    <section class="categorias categoria-links"[\s\S]*?\n    <\/section>/, criarLinksRelacionados(dados));
  html = html.replace(/(    <\/section>\n)(    <section class="categorias categoria-links")/, `$1${criarIntroducao(dados)}\n$2`);

  if (!html.includes('class="categoria-conteudo"')) {
    throw new Error(`Não foi possível inserir a introdução editorial em ${arquivo}.`);
  }
  if (!html.includes(`<h1>${dados.h1}</h1>`)) {
    throw new Error(`Não foi possível inserir o H1 em ${arquivo}.`);
  }
  if (!html.includes('"@type":"BreadcrumbList"')) {
    throw new Error(`Não foi possível inserir o BreadcrumbList em ${arquivo}.`);
  }

  fs.writeFileSync(caminho, html);
  console.log(`Otimizada: ${arquivo}`);
}
