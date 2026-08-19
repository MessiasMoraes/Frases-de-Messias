const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const colecoes = JSON.parse(fs.readFileSync(path.join(raiz, 'dados', 'colecoes-editoriais.json'), 'utf8'));
const erros = [];
let totalCards = 0;

for (const colecao of colecoes) {
  const html = fs.readFileSync(path.join(raiz, colecao.arquivo), 'utf8');
  const totalEsperado = colecao.frases.length;
  totalCards += totalEsperado;
  const contagens = {
    cards: (html.match(/data-frase-card/g) || []).length,
    baixar: (html.match(/data-alternar-download/g) || []).length,
    imagemStory: (html.match(/data-baixar-imagem="story"/g) || []).length,
    imagemFeed: (html.match(/data-baixar-imagem="feed"/g) || []).length,
    videoStory: (html.match(/data-baixar-video="story"/g) || []).length,
    videoFeed: (html.match(/data-baixar-video="feed"/g) || []).length
  };
  for (const [nome, total] of Object.entries(contagens)) {
    if (total !== totalEsperado) erros.push(`${colecao.arquivo}: ${nome} deveria ter ${totalEsperado} ocorrências e tem ${total}.`);
  }
  if (!html.includes('colecoes.js?v=20260820-fundos-variados-v1')) erros.push(`${colecao.arquivo}: versão de colecoes.js com fundos variados não foi referenciada.`);
  if (!html.includes('style.css?v=20260818-colecoes-midia-v1')) erros.push(`${colecao.arquivo}: versão nova de style.css não foi referenciada.`);
}

const script = fs.readFileSync(path.join(raiz, 'colecoes.js'), 'utf8');
for (const trecho of ['async function gerarImagem', 'async function gerarVideo', 'async function baixarVideo', 'function configuracaoVisual', 'FUNDOS_POR_TEMA', 'data-baixar-imagem', 'data-baixar-video']) {
  if (!script.includes(trecho)) erros.push(`colecoes.js: integração ausente (${trecho}).`);
}

const estilo = fs.readFileSync(path.join(raiz, 'style.css'), 'utf8');
for (const trecho of ['.opcoes-download-colecao', '.btn-video-colecao']) {
  if (!estilo.includes(trecho)) erros.push(`style.css: estilo ausente (${trecho}).`);
}

const relatorio = {
  validadoEm: new Date().toISOString(),
  valido: erros.length === 0,
  colecoes: colecoes.length,
  totalCards,
  opcoesPorCard: ['Imagem Story', 'Imagem Feed', 'Vídeo Story', 'Vídeo Feed'],
  erros
};
fs.writeFileSync(path.join(raiz, 'validacao-midia-colecoes.json'), `${JSON.stringify(relatorio, null, 2)}\n`);
console.log(JSON.stringify(relatorio, null, 2));
if (erros.length) process.exitCode = 1;
