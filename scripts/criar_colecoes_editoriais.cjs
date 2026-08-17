const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const dominio = 'https://frasesdemessias.com.br';
const imagemSocial = `${dominio}/imagens/1785461694182.png`;

const colecoes = [
  {
    arquivo: 'frases-para-whatsapp.html',
    slug: 'frases-para-whatsapp',
    icone: '📱',
    titulo: 'Frases para WhatsApp para copiar e compartilhar',
    tituloCurto: 'Frases para WhatsApp',
    descricao: 'Frases para WhatsApp de fé, carinho, motivação e gratidão para copiar, enviar e compartilhar com pessoas especiais.',
    resumo: 'Mensagens prontas para tornar uma conversa mais carinhosa, motivadora e cheia de significado.',
    introducao: [
      'Uma mensagem simples pode transformar uma conversa. Nesta seleção de frases para WhatsApp, você encontra palavras de fé, carinho, gratidão e motivação para enviar a alguém especial ou publicar no seu status.',
      'Escolha uma mensagem que combine com o momento, copie com um toque e compartilhe. São textos curtos, originais e pensados para levar presença, afeto e inspiração para o dia de quem recebe.'
    ],
    relacionados: [
      ['🌞 Frases de Bom Dia', 'frases-de-bom-dia.html'],
      ['🙏 Frases de Fé', 'frases-de-fe.html'],
      ['✨ Frases de Gratidão', 'frases-de-gratidao.html']
    ],
    frases: [
      ['Que a sua conversa hoje seja leve, sincera e cheia de boas energias.', 'Carinho'],
      ['Passei para lembrar que você é importante e merece um dia bonito.', 'Carinho'],
      ['Que Deus cuide de cada detalhe do seu caminho e da sua casa.', 'Fé'],
      ['Mesmo de longe, envio um abraço cheio de paz para você.', 'Amizade'],
      ['Acredite: dias melhores também começam com uma boa mensagem.', 'Motivação'],
      ['Que não falte gratidão pelo que já chegou e esperança pelo que virá.', 'Gratidão'],
      ['Você merece pessoas que tragam calma, verdade e alegria para a sua vida.', 'Reflexão'],
      ['Um novo dia é sempre uma nova oportunidade de espalhar o bem.', 'Motivação'],
      ['Que a sua noite seja tranquila e o seu coração fique em paz.', 'Boa Noite'],
      ['Envio esta mensagem para dizer: conte comigo quando precisar.', 'Amizade']
    ]
  },
  {
    arquivo: 'frases-para-status.html',
    slug: 'frases-para-status',
    icone: '💬',
    titulo: 'Frases para Status: curtas, bonitas e marcantes',
    tituloCurto: 'Frases para Status',
    descricao: 'Frases para status curtas e marcantes de fé, amor, motivação e reflexão para compartilhar no WhatsApp, Instagram e redes sociais.',
    resumo: 'Frases curtas para expressar seus sentimentos e dar um significado especial ao seu status.',
    introducao: [
      'O status é um pequeno espaço para mostrar o que você sente, acredita ou deseja levar para o seu dia. Aqui estão frases curtas para status que unem fé, motivação, amor-próprio e reflexão.',
      'Use estas mensagens no WhatsApp, Instagram ou onde quiser se expressar. Escolha a que tem a sua voz, copie e compartilhe uma ideia capaz de inspirar quem acompanha você.'
    ],
    relacionados: [
      ['📷 Frases para Fotos', 'frases-para-fotos.html'],
      ['💪 Frases de Motivação', 'frases-de-motivacao.html'],
      ['💡 Frases de Reflexão', 'frases-de-reflexao.html']
    ],
    frases: [
      ['Hoje escolho caminhar com leveza e coragem.', 'Motivação'],
      ['Paz na alma, fé no coração e gratidão no olhar.', 'Fé'],
      ['Nem todo silêncio é vazio; às vezes ele é resposta.', 'Reflexão'],
      ['Meu tempo tem valor, minha paz tem prioridade.', 'Amor-próprio'],
      ['Que eu tenha coragem para recomeçar sempre que for preciso.', 'Motivação'],
      ['Onde existe esperança, existe caminho.', 'Esperança'],
      ['Ser feliz também é aprender a valorizar o agora.', 'Reflexão'],
      ['Deus na frente, medo nenhum me domina.', 'Fé'],
      ['Leve no coração apenas o que faz florescer.', 'Vida'],
      ['A minha melhor versão começa com uma escolha diária.', 'Motivação']
    ]
  },
  {
    arquivo: 'frases-de-aniversario.html',
    slug: 'frases-de-aniversario',
    icone: '🎂',
    titulo: 'Frases de Aniversário para desejar um dia especial',
    tituloCurto: 'Frases de Aniversário',
    descricao: 'Frases de aniversário bonitas e originais para desejar saúde, paz, alegria e novas conquistas a pessoas especiais.',
    resumo: 'Mensagens de aniversário para celebrar a vida com carinho, gratidão e bons desejos.',
    introducao: [
      'Celebrar o aniversário de alguém é reconhecer a beleza de mais um ano de vida. Nesta coleção, você encontra frases de aniversário originais para enviar a amigos, familiares, colegas ou pessoas queridas.',
      'Escolha uma mensagem de carinho, acrescente o nome da pessoa e torne a data ainda mais especial. Palavras sinceras ficam na memória e ajudam a transformar uma simples felicitação em um gesto de afeto.'
    ],
    relacionados: [
      ['🤝 Frases de Amizade', 'frases-de-amizade.html'],
      ['🏡 Frases de Família', 'frases-de-familia.html'],
      ['✨ Frases de Gratidão', 'frases-de-gratidao.html']
    ],
    frases: [
      ['Feliz aniversário! Que este novo ciclo traga paz, saúde e motivos sinceros para sorrir.', 'Aniversário'],
      ['Que a vida renove seus sonhos e multiplique as suas alegrias. Parabéns pelo seu dia!', 'Aniversário'],
      ['Hoje celebramos a sua história, a sua luz e tudo de bonito que você espalha.', 'Aniversário'],
      ['Que Deus abençoe seu novo ano com proteção, amor e caminhos abertos.', 'Aniversário'],
      ['Parabéns! Que nunca faltem coragem para sonhar e pessoas especiais para caminhar ao seu lado.', 'Aniversário'],
      ['Mais um ano de vida, mais experiências, mais aprendizado e mais razões para agradecer.', 'Aniversário'],
      ['Que o seu aniversário seja leve, alegre e cercado pelo carinho de quem ama você.', 'Aniversário'],
      ['Desejo que os seus dias sejam guiados por esperança e que os seus planos encontrem bons caminhos.', 'Aniversário'],
      ['Que cada desejo do seu coração encontre tempo, força e fé para florescer.', 'Aniversário'],
      ['Feliz nova etapa! A sua presença faz diferença na vida de muita gente.', 'Aniversário']
    ]
  },
  {
    arquivo: 'frases-de-saudade.html',
    slug: 'frases-de-saudade',
    icone: '🌧️',
    titulo: 'Frases de Saudade para expressar o que o coração sente',
    tituloCurto: 'Frases de Saudade',
    descricao: 'Frases de saudade para expressar carinho, distância, lembranças e a falta que pessoas especiais fazem no coração.',
    resumo: 'Mensagens delicadas para transformar a saudade em uma lembrança cheia de carinho.',
    introducao: [
      'A saudade é uma forma de o coração lembrar daquilo que teve valor. Nesta página, reunimos frases de saudade para expressar com delicadeza a falta de alguém, de um abraço, de um lugar ou de um momento vivido.',
      'Você pode enviar estas mensagens a quem está longe ou guardar uma delas como reflexão. Falar sobre saudade com carinho é também valorizar os vínculos e as lembranças que continuam presentes dentro de nós.'
    ],
    relacionados: [
      ['❤️ Frases de Amor', 'frases-de-amor.html'],
      ['🤝 Frases de Amizade', 'frases-de-amizade.html'],
      ['💡 Frases de Reflexão', 'frases-de-reflexao.html']
    ],
    frases: [
      ['Saudade é o carinho procurando um jeito de atravessar a distância.', 'Saudade'],
      ['Tem pessoas que continuam perto mesmo quando a vida coloca muitos caminhos entre nós.', 'Saudade'],
      ['A falta que você faz mostra o espaço bonito que ocupa no meu coração.', 'Saudade'],
      ['Algumas lembranças não passam; elas aprendem a morar na alma.', 'Saudade'],
      ['Quando a saudade aperta, o coração relembra os momentos que mais fizeram bem.', 'Saudade'],
      ['A distância muda a rotina, mas não apaga o afeto verdadeiro.', 'Saudade'],
      ['Sinto saudade não apenas do que vivemos, mas da paz que a sua presença trazia.', 'Saudade'],
      ['Que a lembrança dos bons momentos seja sempre mais forte do que a distância.', 'Saudade'],
      ['Há abraços que a memória continua sentindo mesmo depois de muito tempo.', 'Saudade'],
      ['A saudade também é prova de que existiu algo sincero para lembrar.', 'Saudade']
    ]
  },
  {
    arquivo: 'frases-de-deus.html',
    slug: 'frases-de-deus',
    icone: '🙏',
    titulo: 'Frases de Deus para fortalecer a fé e a esperança',
    tituloCurto: 'Frases de Deus',
    descricao: 'Frases de Deus com mensagens de fé, confiança, proteção e esperança para fortalecer o coração todos os dias.',
    resumo: 'Mensagens de fé para lembrar que Deus acompanha cada passo da caminhada.',
    introducao: [
      'Em dias tranquilos ou desafiadores, uma mensagem de fé pode ajudar a renovar o coração. Nesta coleção de frases de Deus, você encontra palavras originais sobre confiança, proteção, esperança e recomeço.',
      'Leia com calma, compartilhe com alguém que precisa de força e use estas mensagens como um lembrete de que a caminhada pode ser mais leve quando é guiada por fé, paciência e amor.'
    ],
    relacionados: [
      ['🙏 Frases de Fé', 'frases-de-fe.html'],
      ['🌱 Frases de Esperança', 'frases-de-esperanca.html'],
      ['✨ Frases de Gratidão', 'frases-de-gratidao.html']
    ],
    frases: [
      ['Deus conhece os caminhos que você ainda não consegue enxergar.', 'Fé'],
      ['Quando a fé conduz os passos, até a espera encontra sentido.', 'Fé'],
      ['Entregue o que pesa ao coração e siga com a certeza de que Deus cuida de você.', 'Fé'],
      ['Deus não se atrasa: Ele prepara o tempo certo para cada resposta.', 'Fé'],
      ['Que a presença de Deus seja a sua paz nos dias de incerteza.', 'Fé'],
      ['Há força em quem ora, esperança em quem confia e luz em quem persevera.', 'Fé'],
      ['Deus transforma o medo em coragem quando o coração decide confiar.', 'Fé'],
      ['Mesmo em silêncio, Deus trabalha em favor de quem não perde a esperança.', 'Fé'],
      ['Que hoje você reconheça os pequenos sinais do cuidado de Deus.', 'Fé'],
      ['Com Deus à frente, cada recomeço pode se tornar uma bênção.', 'Fé']
    ]
  },
  {
    arquivo: 'mensagens-de-boa-semana.html',
    slug: 'mensagens-de-boa-semana',
    icone: '🌤️',
    titulo: 'Mensagens de Boa Semana para começar com inspiração',
    tituloCurto: 'Mensagens de Boa Semana',
    descricao: 'Mensagens de boa semana com fé, motivação e energia positiva para desejar dias de paz, conquistas e boas oportunidades.',
    resumo: 'Desejos de uma boa semana para enviar com motivação, paz e energia positiva.',
    introducao: [
      'Uma nova semana traz novos encontros, tarefas, desafios e oportunidades. Estas mensagens de boa semana foram criadas para ajudar você a começar os próximos dias com esperança, foco e uma palavra positiva.',
      'Envie a quem você deseja ver bem ou use uma frase para renovar a própria motivação. Uma boa semana começa com organização, coragem e a disposição de valorizar cada pequena conquista.'
    ],
    relacionados: [
      ['🌞 Frases de Bom Dia', 'frases-de-bom-dia.html'],
      ['💪 Frases de Motivação', 'frases-de-motivacao.html'],
      ['🚀 Frases de Sucesso', 'frases-de-sucesso.html']
    ],
    frases: [
      ['Que a sua semana comece com paz no coração e clareza nos seus objetivos.', 'Boa Semana'],
      ['Desejo dias produtivos, leves e cheios de boas oportunidades para você.', 'Boa Semana'],
      ['Uma boa semana não precisa ser perfeita; ela precisa ter propósito e esperança.', 'Boa Semana'],
      ['Que cada manhã traga uma razão nova para acreditar no que você é capaz de construir.', 'Boa Semana'],
      ['Comece com fé, siga com foco e celebre cada avanço da sua semana.', 'Boa Semana'],
      ['Que não faltem coragem para os desafios e serenidade para as decisões.', 'Boa Semana'],
      ['Nesta semana, cuide do que importa e deixe espaço para aquilo que faz bem.', 'Boa Semana'],
      ['Que as suas palavras sejam gentis e os seus passos encontrem bons caminhos.', 'Boa Semana'],
      ['Uma semana de paz começa quando escolhemos não carregar o que não nos pertence.', 'Boa Semana'],
      ['Que esta nova semana aproxime você dos sonhos que fazem sentido para o seu coração.', 'Boa Semana']
    ]
  },
  {
    arquivo: 'frases-para-fotos.html',
    slug: 'frases-para-fotos',
    icone: '📷',
    titulo: 'Frases para Fotos: legendas bonitas e originais',
    tituloCurto: 'Frases para Fotos',
    descricao: 'Frases para fotos e legendas originais de amor-próprio, felicidade, fé e reflexão para publicar nas redes sociais.',
    resumo: 'Legendas curtas e originais para completar fotos com personalidade e significado.',
    introducao: [
      'Uma boa foto pode guardar um momento; uma legenda certa pode contar o sentimento por trás dele. Nesta coleção de frases para fotos, você encontra ideias originais para publicar imagens de momentos felizes, conquistas, encontros e reflexões.',
      'Escolha uma legenda que combine com a sua imagem e com a mensagem que deseja transmitir. São frases curtas, versáteis e fáceis de adaptar para Instagram, WhatsApp, Facebook e outras redes sociais.'
    ],
    relacionados: [
      ['💬 Frases para Status', 'frases-para-status.html'],
      ['❤️ Frases de Amor', 'frases-de-amor.html'],
      ['🍃 Frases de Vida', 'frases-de-vida.html']
    ],
    frases: [
      ['Guardando em imagem aquilo que fez o coração sorrir.', 'Legenda'],
      ['Leveza é poder viver o momento sem pressa de explicar tudo.', 'Legenda'],
      ['Um dia simples, um coração agradecido e uma memória bonita.', 'Legenda'],
      ['Que eu nunca perca a coragem de ser quem sou.', 'Legenda'],
      ['Colecionando momentos que fazem a vida ter mais cor.', 'Legenda'],
      ['Onde existe verdade, até o sorriso fica mais bonito.', 'Legenda'],
      ['Aprendendo a valorizar a jornada tanto quanto a chegada.', 'Legenda'],
      ['A minha paz também merece aparecer na foto.', 'Legenda'],
      ['Pequenos instantes, grandes motivos para agradecer.', 'Legenda'],
      ['Deixando a vida registrar o que as palavras nem sempre conseguem dizer.', 'Legenda']
    ]
  }
];

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
  <link rel="stylesheet" href="style.css?v=20260817-colecoes-v1">
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
  <script type="module" src="colecoes.js?v=20260817-v1"></script>
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
    description: 'Coleções especiais de frases para WhatsApp, status, aniversário, saudade, Deus, boa semana e fotos.',
    url: `${dominio}/colecoes.html`, inLanguage: 'pt-BR',
    isPartOf: { '@type': 'WebSite', name: 'Frases de Messias', url: `${dominio}/` }
  }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="pt-BR"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coleções de Frases para Compartilhar | Frases de Messias</title>
  <meta name="description" content="Encontre coleções de frases para WhatsApp, status, aniversário, saudade, Deus, boa semana e fotos.">
  <meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${dominio}/colecoes.html">
  <meta property="og:type" content="website"><meta property="og:url" content="${dominio}/colecoes.html"><meta property="og:title" content="Coleções de Frases | Frases de Messias"><meta property="og:description" content="Mensagens selecionadas para compartilhar em diferentes momentos."><meta property="og:image" content="${imagemSocial}">
  <meta name="twitter:card" content="summary_large_image"><link rel="manifest" href="manifest.json"><meta name="theme-color" content="#4A90E2"><link rel="stylesheet" href="style.css?v=20260817-colecoes-v1">
  <script type="application/ld+json">${schema}</script><script async src="https://www.googletagmanager.com/gtag/js?id=G-3TZ1W3722P"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3TZ1W3722P');</script>
</head><body class="pagina-colecoes">
  <header><div class="container"><p class="titulo-site">📖 Frases de Messias</p>${nav}</div></header>
  <main>
    <section class="hero colecao-hero"><p class="breadcrumb"><a href="index.html">Início</a> <span aria-hidden="true">›</span> Coleções</p><p class="selo-colecao">MENSAGENS PARA CADA MOMENTO</p><h1>✨ Coleções de frases para inspirar e compartilhar</h1><p>Escolha uma coleção especial, encontre a mensagem que combina com o seu momento e compartilhe palavras que fazem bem.</p></section>
    <section class="colecoes-listagem" aria-labelledby="tituloColecoes"><h2 id="tituloColecoes">Encontre a coleção certa</h2><div class="grid-colecoes">${cards}</div></section>
    <section class="colecoes-relacionadas"><h2>Quer explorar por tema?</h2><p>Veja também todas as categorias de fé, amor, motivação, reflexão, bom dia e muito mais.</p><div class="botoes-colecoes-relacionadas"><a class="btn-colecao-relacionada" href="categorias.html">📂 Ver todas as categorias</a><a class="btn-colecao-relacionada" href="frases-importantes.html">⭐ Frases em destaque</a></div></section>
  </main>
  <footer><p>© 2026 Frases de Messias</p><p><a href="index.html">Início</a> · <a href="categorias.html">Categorias</a> · <a href="contato.html">Contato</a></p></footer><button id="temaBtn" type="button" aria-pressed="false">🌙 Modo Escuro</button><script type="module" src="colecoes.js?v=20260817-v1"></script>
</body></html>`;
}

for (const colecao of colecoes) fs.writeFileSync(path.join(raiz, colecao.arquivo), htmlColecao(colecao));
fs.writeFileSync(path.join(raiz, 'colecoes.html'), htmlHub());
fs.writeFileSync(path.join(raiz, 'dados', 'colecoes-editoriais.json'), `${JSON.stringify(colecoes, null, 2)}\n`);

const indexPath = path.join(raiz, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
if (!index.includes('colecoes.html')) {
  index = index.replace('      <a href="categorias.html">📂 Categorias</a>', '      <a href="categorias.html">📂 Categorias</a>\n      <a href="colecoes.html">✨ Coleções</a>');
  const vitrineColecoes = `    <a class="btn-categoria" href="frases-de-vida.html">🍃 Vida</a>\n  </div>\n</section>\n\n<section class="colecoes-destaque" aria-labelledby="tituloColecoesDestaque">\n  <div class="cabecalho-colecoes-destaque"><div><p class="selo-colecao">MENSAGENS PARA COMPARTILHAR</p><h2 id="tituloColecoesDestaque">✨ Coleções especiais</h2></div><a href="colecoes.html">Ver todas →</a></div>\n  <p>Frases prontas para status, WhatsApp, aniversário, fotos e outros momentos importantes.</p>\n  <div class="grid-colecoes grid-colecoes-inicial">${colecoes.slice(0, 4).map(cardColecao).join('')}\n  </div>\n</section>`;
  index = index.replace('    <a class="btn-categoria" href="frases-de-vida.html">🍃 Vida</a>\n  </div>\n</section>', vitrineColecoes);
  index = index.replace('  <p class="rodape-canal-telegram">', '  <p><a href="colecoes.html">✨ Explorar coleções especiais</a></p>\n  <p class="rodape-canal-telegram">');
  index = index.replace('style.css?v=20260815-frases-v2', 'style.css?v=20260817-colecoes-v1');
  fs.writeFileSync(indexPath, index);
}

const categoriasPath = path.join(raiz, 'categorias.html');
let categorias = fs.readFileSync(categoriasPath, 'utf8');
if (!categorias.includes('colecoes.html')) {
  categorias = categorias.replace('        <a href="categorias.html">📂 Categorias</a>', '        <a href="categorias.html">📂 Categorias</a>\n        <a href="colecoes.html">✨ Coleções</a>');
  const vitrineCategorias = `    </section>\n    <section class="colecoes-listagem categorias-com-colecoes" aria-labelledby="tituloColecoesEspeciais">\n      <h2 id="tituloColecoesEspeciais">✨ Coleções especiais para compartilhar</h2>\n      <p>Encontre mensagens prontas para situações e formatos específicos.</p>\n      <div class="grid-colecoes">${colecoes.map(cardColecao).join('')}\n      </div>\n    </section>\n  </main>`;
  categorias = categorias.replace('    </section>\n  </main>', vitrineCategorias);
  categorias = categorias.replace('style.css?v=20260815-frases-v2', 'style.css?v=20260817-colecoes-v1');
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
