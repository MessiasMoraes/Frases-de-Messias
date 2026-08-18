const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const categorias = ['Fé', 'Motivação', 'Esperança'];
const colecoesAlvo = {
  'Frases de Deus': 'frases-de-deus.html',
  'Frases de Superação': 'frases-de-superacao.html',
  'Frases para Status': 'frases-para-status.html',
  'Frases para Começar o Dia': 'mensagens-para-comecar-o-dia.html'
};

function normalizar(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function contar(ocorrencias, texto) {
  return (texto.match(ocorrencias) || []).length;
}

function main() {
  const erros = [];
  const dadosPublicos = JSON.parse(fs.readFileSync(path.join(raiz, 'dados', 'frases-expansao-publica.json'), 'utf8'));
  if (!Array.isArray(dadosPublicos) || dadosPublicos.length !== 150) erros.push('O arquivo público deveria conter 150 frases.');
  const ids = dadosPublicos.map((frase) => frase.id);
  const textos = dadosPublicos.map((frase) => normalizar(frase.texto));
  if (new Set(ids).size !== 150) erros.push('Há identificadores repetidos no arquivo público.');
  if (new Set(textos).size !== 150) erros.push('Há frases repetidas no arquivo público.');
  const totaisCategorias = Object.fromEntries(categorias.map((categoria) => [categoria, dadosPublicos.filter((frase) => frase.categoria === categoria).length]));
  for (const [categoria, total] of Object.entries(totaisCategorias)) {
    if (total !== 50) erros.push(`${categoria} deveria conter 50 frases públicas; contém ${total}.`);
  }

  const colecoes = JSON.parse(fs.readFileSync(path.join(raiz, 'dados', 'colecoes-editoriais.json'), 'utf8'));
  const totaisColecoes = {};
  for (const [titulo, arquivo] of Object.entries(colecoesAlvo)) {
    const colecao = colecoes.find((item) => item.arquivo === arquivo);
    if (!colecao) {
      erros.push(`Coleção ausente: ${titulo}.`);
      continue;
    }
    const chaves = colecao.frases.map(([texto]) => normalizar(texto));
    totaisColecoes[titulo] = colecao.frases.length;
    if (colecao.frases.length !== 60) erros.push(`${titulo} deveria conter 60 frases; contém ${colecao.frases.length}.`);
    if (new Set(chaves).size !== chaves.length) erros.push(`${titulo} contém frases repetidas.`);
    const html = fs.readFileSync(path.join(raiz, arquivo), 'utf8');
    if (!html.includes(`${colecao.frases.length} frases para você`)) erros.push(`${arquivo} não foi regenerada com o contador correto.`);
    if (contar(/class="card-frase-colecao"/g, html) !== colecao.frases.length) erros.push(`${arquivo} não possui a quantidade correta de cartões de frase.`);
  }

  const categoriaJs = fs.readFileSync(path.join(raiz, 'categoria.js'), 'utf8');
  for (const termo of ['carregarFrasesExpansaoPublica', 'dados/frases-expansao-publica.json', 'fraseEstatica(frase)']) {
    if (!categoriaJs.includes(termo)) erros.push(`categoria.js não contém a integração esperada: ${termo}.`);
  }

  const relatorio = {
    validadoEm: new Date().toISOString(),
    valida: erros.length === 0,
    categoriasPublicas: totaisCategorias,
    colecoes: totaisColecoes,
    totalFrasesNovas: dadosPublicos.length + 200,
    erros
  };
  fs.writeFileSync(path.join(raiz, 'validacao-publicacao-expansao-7-areas.json'), `${JSON.stringify(relatorio, null, 2)}\n`);
  console.log(JSON.stringify(relatorio, null, 2));
  if (erros.length) process.exitCode = 1;
}

try {
  main();
} catch (erro) {
  console.error(`ERRO: ${erro.message}`);
  process.exitCode = 1;
}
