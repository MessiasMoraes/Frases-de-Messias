const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const versao = 'expansao-7-areas-v1';
const temasCategorias = ['Fé', 'Motivação', 'Esperança'];
const temasColecoes = {
  'Frases de Deus': { arquivo: 'frases-de-deus.html', etiqueta: 'Fé' },
  'Frases de Superação': { arquivo: 'frases-de-superacao.html', etiqueta: 'Superação' },
  'Frases para Status': { arquivo: 'frases-para-status.html', etiqueta: 'Status' },
  'Frases para Começar o Dia': { arquivo: 'mensagens-para-comecar-o-dia.html', etiqueta: 'Bom Dia' }
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

function idSeguro(texto = '') {
  return normalizar(texto).replace(/\s+/g, '-');
}

function validar(candidatas) {
  const esperados = [...temasCategorias, ...Object.keys(temasColecoes)];
  const frases = [];
  for (const tema of esperados) {
    if (!Array.isArray(candidatas[tema]) || candidatas[tema].length !== 50) {
      throw new Error(`${tema} precisa conter exatamente 50 frases.`);
    }
    const chaves = candidatas[tema].map(normalizar);
    if (new Set(chaves).size !== 50 || chaves.some((chave) => !chave)) {
      throw new Error(`${tema} contém frase repetida ou vazia.`);
    }
    frases.push(...chaves);
  }
  if (new Set(frases).size !== 350) throw new Error('A expansão deve conter 350 frases únicas.');
}

function main() {
  const candidatas = JSON.parse(fs.readFileSync(path.join(raiz, 'dados', 'expansao-7-areas-50-frases.json'), 'utf8'));
  validar(candidatas);

  const caminhoColecoes = path.join(raiz, 'dados', 'colecoes-editoriais.json');
  const colecoes = JSON.parse(fs.readFileSync(caminhoColecoes, 'utf8'));
  let adicionadasColecoes = 0;
  let existentesColecoes = 0;

  for (const [tema, configuracao] of Object.entries(temasColecoes)) {
    const colecao = colecoes.find((item) => item.arquivo === configuracao.arquivo);
    if (!colecao) throw new Error(`Coleção ausente: ${configuracao.arquivo}`);
    const chavesDaColecao = new Set(colecao.frases.map(([texto]) => normalizar(texto)));
    for (const texto of candidatas[tema]) {
      const chave = normalizar(texto);
      if (chavesDaColecao.has(chave)) {
        existentesColecoes += 1;
        continue;
      }
      colecao.frases.push([texto, configuracao.etiqueta]);
      chavesDaColecao.add(chave);
      adicionadasColecoes += 1;
    }
    if (colecao.frases.length !== 60) {
      throw new Error(`${tema} deveria finalizar com 60 frases e terminou com ${colecao.frases.length}.`);
    }
  }
  fs.writeFileSync(caminhoColecoes, `${JSON.stringify(colecoes, null, 2)}\n`);

  const frasesPublicas = temasCategorias.flatMap((categoria) => candidatas[categoria].map((texto, indice) => ({
    id: `${versao}-${idSeguro(categoria)}-${String(indice + 1).padStart(2, '0')}`,
    categoria,
    texto,
    autor: 'Messias',
    imagem: '',
    curtidas: 0,
    visualizacoes: 0,
    compartilhamentos: 0,
    origem: 'publica-estatica'
  })));
  const caminhoFrasesPublicas = path.join(raiz, 'dados', 'frases-expansao-publica.json');
  fs.writeFileSync(caminhoFrasesPublicas, `${JSON.stringify(frasesPublicas, null, 2)}\n`);

  const relatorio = {
    versao,
    publicadoEm: new Date().toISOString(),
    frasesCategoriaPublicas: frasesPublicas.length,
    frasesColecoesAdicionadas: adicionadasColecoes,
    frasesColecoesJaPresentes: existentesColecoes,
    observacao: 'As frases de categoria são carregadas localmente na página pública até que a credencial administrativa do Firebase esteja disponível.'
  };
  fs.writeFileSync(path.join(raiz, 'relatorio-publicacao-expansao-7-areas.json'), `${JSON.stringify(relatorio, null, 2)}\n`);
  console.log(JSON.stringify(relatorio, null, 2));
}

try {
  main();
} catch (erro) {
  console.error(`ERRO: ${erro.message}`);
  process.exitCode = 1;
}
