const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const catalogoColecoes = path.join(raiz, 'dados', 'colecoes-editoriais.json');

function ler(caminho) {
  return fs.readFileSync(caminho, 'utf8');
}

function gravar(caminho, conteudo) {
  fs.writeFileSync(caminho, conteudo, 'utf8');
}

function substituirUmaVez(conteudo, procurado, substituto, contexto) {
  const ocorrencias = conteudo.split(procurado).length - 1;
  if (ocorrencias !== 1) {
    throw new Error(`${contexto}: era esperada exatamente uma ocorrência, encontradas ${ocorrencias}.`);
  }
  return conteudo.replace(procurado, substituto);
}

function substituirTodas(conteudo, procurado, substituto, contexto) {
  const ocorrencias = conteudo.split(procurado).length - 1;
  if (ocorrencias < 1) {
    throw new Error(`${contexto}: texto de origem não encontrado.`);
  }
  return conteudo.replaceAll(procurado, substituto);
}

const categorias = [
  {
    arquivo: 'frases-de-gratidao.html',
    tituloAntigo: 'Frases de Gratidão',
    tituloNovo: 'Frases de Gratidão para reconhecer bênçãos e compartilhar alegria',
    descricaoAntiga: 'Frases de gratidão para reconhecer bênçãos, cultivar alegria e compartilhar boas mensagens.',
    descricaoNova: 'Frases de gratidão para reconhecer bênçãos, agradecer a vida, cultivar alegria e compartilhar mensagens especiais todos os dias.',
    heroiAntigo: '✨ Frases de Gratidão',
    heroiNovo: '✨ Frases de Gratidão para reconhecer bênçãos e compartilhar alegria',
    introducaoId: 'introducaoGratidao',
    introducaoTitulo: 'Mensagens de gratidão para valorizar o que importa',
    introducao: [
      'As frases de gratidão ajudam a transformar pequenas conquistas, encontros e aprendizados em lembranças que merecem ser valorizadas. Use esta seleção para agradecer pela vida, reconhecer uma bênção ou enviar uma palavra de carinho a quem faz parte do seu caminho.',
      'Escolha uma mensagem que combine com o seu momento, copie para uma conversa ou compartilhe nas redes. Gratidão não apaga os desafios, mas ajuda a enxergar com mais clareza tudo o que também sustenta o coração.'
    ],
    relacionados: [
      ['frases-de-fe.html', 'frases de fé para dias de gratidão'],
      ['frases-de-familia.html', 'mensagens para a família'],
      ['frases-de-esperanca.html', 'frases de esperança']
    ]
  },
  {
    arquivo: 'frases-de-familia.html',
    tituloAntigo: 'Frases de Família',
    tituloNovo: 'Frases de Família para celebrar amor, união e cuidado',
    descricaoAntiga: 'Frases de família para celebrar união, cuidado, amor e momentos especiais.',
    descricaoNova: 'Frases de família para celebrar amor, união e cuidado, agradecer momentos juntos e compartilhar mensagens especiais com quem importa.',
    heroiAntigo: '🏡 Frases de Família',
    heroiNovo: '🏡 Frases de Família para celebrar amor, união e cuidado',
    introducaoId: 'introducaoFamilia',
    introducaoTitulo: 'Mensagens para fortalecer os laços de família',
    introducao: [
      'A família é feita de presença, conversas, lembranças e cuidado nos dias simples. Nesta página, você encontra frases de família para celebrar vínculos, agradecer por quem caminha ao seu lado e transformar carinho em uma mensagem pronta para compartilhar.',
      'Envie uma frase para mãe, pai, irmãos, avós ou para aquela pessoa que escolheu estar perto. Uma palavra de afeto pode aproximar, homenagear e tornar um momento comum ainda mais especial.'
    ],
    relacionados: [
      ['frases-para-mae.html', 'frases para mãe'],
      ['frases-para-pai.html', 'frases para pai'],
      ['frases-de-gratidao.html', 'mensagens de gratidão']
    ]
  },
  {
    arquivo: 'frases-de-esperanca.html',
    tituloAntigo: 'Frases de Esperança',
    tituloNovo: 'Frases de Esperança para dias difíceis e novos começos',
    descricaoAntiga: 'Frases de esperança para fortalecer a confiança em dias melhores e renovar a fé.',
    descricaoNova: 'Frases de esperança para dias difíceis e novos começos, com mensagens para renovar a fé, seguir com confiança e acreditar em dias melhores.',
    heroiAntigo: '🌱 Frases de Esperança',
    heroiNovo: '🌱 Frases de Esperança para dias difíceis e novos começos',
    introducaoId: 'introducaoEsperanca',
    introducaoTitulo: 'Mensagens de esperança para seguir com confiança',
    introducao: [
      'Há fases em que uma frase de esperança não resolve tudo, mas pode lembrar que a história ainda continua. Reunimos mensagens para dias difíceis, novos começos e momentos em que você precisa respirar, recuperar a confiança e olhar adiante com mais calma.',
      'Leia no seu tempo, salve a mensagem que converse com o seu momento e compartilhe com quem também precisa de um sinal de ânimo. A esperança cresce quando encontra espaço para permanecer.'
    ],
    relacionados: [
      ['frases-de-fe.html', 'frases de fé e confiança'],
      ['frases-de-superacao.html', 'frases de superação'],
      ['frases-de-bom-dia.html', 'mensagens de bom dia']
    ]
  },
  {
    arquivo: 'frases-de-reflexao.html',
    tituloAntigo: 'Frases de Reflexão',
    tituloNovo: 'Frases de Reflexão sobre a vida para pensar e recomeçar',
    descricaoAntiga: 'Frases de reflexão para pensar sobre a vida, fazer escolhas e encontrar novos caminhos.',
    descricaoNova: 'Frases de reflexão sobre a vida para pensar com calma, aprender com os dias, fazer escolhas e encontrar novos caminhos.',
    heroiAntigo: '💡 Frases de Reflexão',
    heroiNovo: '💡 Frases de Reflexão sobre a vida para pensar e recomeçar',
    introducaoId: 'introducaoReflexao',
    introducaoTitulo: 'Mensagens para refletir sobre a vida com mais calma',
    introducao: [
      'As frases de reflexão sobre a vida convidam a olhar para os dias com mais presença. Elas podem ajudar a organizar pensamentos, perceber aprendizados e encontrar uma pausa antes de tomar uma decisão ou começar de novo.',
      'Escolha a mensagem que faz sentido agora, salve para reler depois ou compartilhe com alguém que valoriza conversas profundas. Às vezes, uma pergunta bem colocada abre espaço para um novo caminho.'
    ],
    relacionados: [
      ['frases-de-vida.html', 'frases sobre a vida'],
      ['frases-de-paz.html', 'frases de paz'],
      ['frases-de-superacao.html', 'mensagens para recomeçar']
    ]
  }
];

for (const categoria of categorias) {
  const caminho = path.join(raiz, categoria.arquivo);
  let html = ler(caminho);
  const marcadorHeroi = `__HEROI_SEO_${categoria.arquivo.replace(/[^a-z]/gi, '_')}__`;
  const heroiDuplicado = categoria.heroiNovo.replaceAll(categoria.tituloAntigo, categoria.tituloNovo);

  if (html.includes('<h1>📖 Frases de Messias</h1>')) {
    html = substituirUmaVez(html, '<h1>📖 Frases de Messias</h1>', '<p class="titulo-site">📖 Frases de Messias</p>', categoria.arquivo);
  }

  if (html.includes(`<h2>${categoria.heroiAntigo}</h2>`)) {
    html = substituirUmaVez(html, `<h2>${categoria.heroiAntigo}</h2>`, `<h1>${marcadorHeroi}</h1>`, categoria.arquivo);
  } else if (html.includes(`<h1>${heroiDuplicado}</h1>`)) {
    html = substituirUmaVez(html, `<h1>${heroiDuplicado}</h1>`, `<h1>${marcadorHeroi}</h1>`, categoria.arquivo);
  }

  if (html.includes(categoria.tituloAntigo) && !html.includes(categoria.tituloNovo)) {
    html = substituirTodas(html, categoria.tituloAntigo, categoria.tituloNovo, categoria.arquivo);
  }
  if (html.includes(categoria.descricaoAntiga) && !html.includes(categoria.descricaoNova)) {
    html = substituirTodas(html, categoria.descricaoAntiga, categoria.descricaoNova, categoria.arquivo);
  }
  if (html.includes(marcadorHeroi)) {
    html = substituirUmaVez(html, `<h1>${marcadorHeroi}</h1>`, `<h1>${categoria.heroiNovo}</h1>`, categoria.arquivo);
  }

  const linksRelacionados = categoria.relacionados
    .map(([href, texto]) => `        <a class="btn-categoria" href="${href}">${texto}</a>`)
    .join('\n');
  const blocoIntroducao = `    <section class="introducao-colecao introducao-categoria" aria-labelledby="${categoria.introducaoId}">\n      <h2 id="${categoria.introducaoId}">${categoria.introducaoTitulo}</h2>\n      <p>${categoria.introducao[0]}</p>\n      <p>${categoria.introducao[1]}</p>\n      <div class="grid-botoes links-editoriais" aria-label="Conteúdos relacionados">\n${linksRelacionados}\n      </div>\n    </section>\n`;
  if (!html.includes(`id="${categoria.introducaoId}"`)) {
    html = substituirUmaVez(
      html,
      '    </section>\n    <section class="categorias categoria-links"',
      `    </section>\n${blocoIntroducao}    <section class="categorias categoria-links"`,
      `${categoria.arquivo} — inserção da introdução`
    );
  }

  gravar(caminho, html);
}

const colecoes = [
  {
    arquivo: 'frases-de-paz.html',
    tituloAntigo: 'Frases de Paz para acalmar a mente e o coração',
    tituloNovo: 'Frases de Paz para acalmar a mente e o coração',
    descricaoAntiga: 'Frases de paz para acalmar a mente, fortalecer a serenidade, inspirar leveza e compartilhar mensagens de tranquilidade e esperança.',
    descricaoNova: 'Frases de paz para acalmar a mente e o coração, cultivar serenidade, inspirar leveza e compartilhar mensagens de tranquilidade e esperança.',
    resumoAntigo: 'Mensagens para desacelerar, respirar e encontrar serenidade no meio da rotina.',
    resumoNovo: 'Mensagens de paz para desacelerar, respirar e encontrar serenidade no meio da rotina.'
  },
  {
    arquivo: 'frases-de-superacao.html',
    tituloAntigo: 'Frases de Superação para encontrar força e recomeçar',
    tituloNovo: 'Frases de Superação para não desistir, recomeçar e seguir em frente',
    descricaoAntiga: 'Frases de superação para vencer momentos difíceis, recuperar a confiança, recomeçar com coragem e seguir em frente todos os dias.',
    descricaoNova: 'Frases de superação para não desistir, vencer momentos difíceis, recuperar a confiança e seguir em frente com coragem.',
    resumoAntigo: 'Mensagens para lembrar a sua força nos dias em que continuar parece mais difícil.',
    resumoNovo: 'Mensagens de superação para não desistir e lembrar a sua força nos dias difíceis.'
  },
  {
    arquivo: 'frases-de-trabalho.html',
    tituloAntigo: 'Frases de Trabalho para motivar, agradecer e inspirar',
    tituloNovo: 'Frases de Trabalho para motivação, foco e reconhecimento',
    descricaoAntiga: 'Frases de trabalho para motivar a rotina, valorizar o esforço, inspirar equipes e compartilhar mensagens de foco, dedicação e crescimento.',
    descricaoNova: 'Frases de trabalho e motivação para valorizar o esforço, inspirar equipes e compartilhar mensagens de foco, dedicação e crescimento.',
    resumoAntigo: 'Mensagens para levar foco, propósito e incentivo à rotina profissional.',
    resumoNovo: 'Mensagens de motivação para o trabalho, com foco, propósito e incentivo à rotina profissional.'
  }
];

let catalogo = ler(catalogoColecoes);
for (const colecao of colecoes) {
  const caminho = path.join(raiz, colecao.arquivo);
  let html = ler(caminho);

  if (colecao.tituloAntigo !== colecao.tituloNovo && html.includes(colecao.tituloAntigo)) {
    html = substituirTodas(html, colecao.tituloAntigo, colecao.tituloNovo, colecao.arquivo);
  }
  if (catalogo.includes(`"titulo": "${colecao.tituloAntigo}",`)) {
    catalogo = substituirUmaVez(catalogo, `"titulo": "${colecao.tituloAntigo}",`, `"titulo": "${colecao.tituloNovo}",`, `catálogo — ${colecao.arquivo}`);
  }
  if (html.includes(colecao.descricaoAntiga)) {
    html = substituirTodas(html, colecao.descricaoAntiga, colecao.descricaoNova, colecao.arquivo);
  }
  if (html.includes(colecao.resumoAntigo)) {
    html = substituirUmaVez(html, colecao.resumoAntigo, colecao.resumoNovo, colecao.arquivo);
  }
  if (catalogo.includes(`"descricao": "${colecao.descricaoAntiga}",`)) {
    catalogo = substituirUmaVez(catalogo, `"descricao": "${colecao.descricaoAntiga}",`, `"descricao": "${colecao.descricaoNova}",`, `catálogo — ${colecao.arquivo}`);
  }
  if (catalogo.includes(`"resumo": "${colecao.resumoAntigo}",`)) {
    catalogo = substituirUmaVez(catalogo, `"resumo": "${colecao.resumoAntigo}",`, `"resumo": "${colecao.resumoNovo}",`, `catálogo — ${colecao.arquivo}`);
  }

  gravar(caminho, html);
}

gravar(catalogoColecoes, catalogo);

console.log(`SEO atualizado em ${categorias.length} categorias e ${colecoes.length} coleções editoriais.`);
