import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const raiz = path.resolve(__dirname, '..');

const PROJETO = 'frases-de-messias-ca952';
const CHAVE_API = 'AIzaSyAdPWj_82SH4EqALPRApgUYuLdxGgl-DGA';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`;

const MAPA_CATEGORIAS = {
  'Motivação e Superação': 'Motivação',
  'Amor e Relacionamentos': 'Amor',
  'Sabedoria e Reflexão': 'Reflexão',
  'Felicidade e Gratidão': 'Gratidão',
  'Sucesso e Liderança': 'Sucesso',
  'Amizade': 'Amizade',
  'Foco e Produtividade': 'Motivação',
  'Coragem e Esperança': 'Esperança',
  'Paz e Equilíbrio': 'Vida',
  'Trabalho e Carreira': 'Sucesso',
  'Natureza e Espiritualidade': 'Fé',
  'Criatividade e Arte': 'Vida'
};

function normalizar(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function limparLinha(texto = '') {
  return String(texto).replace(/\f/g, '').replace(/\s+/g, ' ').trim();
}

function extrairFrases(conteudo) {
  const frases = [];
  let categoriaPdf = '';
  let fraseAtual = '';

  const salvarFraseAtual = () => {
    const texto = limparLinha(fraseAtual);
    if (!texto || /\(continua até 100 frases/i.test(texto) || !categoriaPdf) return;
    const categoria = MAPA_CATEGORIAS[categoriaPdf];
    if (!categoria) throw new Error(`Categoria sem mapeamento: ${categoriaPdf}`);
    frases.push({
      texto,
      categoria,
      categoriaOriginal: categoriaPdf,
      autor: 'Autor não informado',
      origem: 'Coletânea PDF enviada pelo administrador em 15-08-2026'
    });
  };

  for (const linhaBruta of conteudo.split(/\r?\n/)) {
    const linha = limparLinha(linhaBruta);
    const cabecalho = linha.match(/^\d+\.\s+(.+)$/);
    const item = linha.match(/^•\s*(.+)$/);

    if (cabecalho) {
      salvarFraseAtual();
      fraseAtual = '';
      categoriaPdf = cabecalho[1].trim();
      continue;
    }

    if (item) {
      salvarFraseAtual();
      fraseAtual = item[1].trim();
      continue;
    }

    if (linha && fraseAtual) {
      fraseAtual = `${fraseAtual} ${linha}`;
    }
  }

  salvarFraseAtual();
  return frases;
}

async function consultarDocumentos() {
  const documentos = [];
  let token = '';
  do {
    const sufixo = token ? `&pageToken=${encodeURIComponent(token)}` : '';
    const resposta = await fetch(`${BASE}/frases?key=${CHAVE_API}&pageSize=300${sufixo}`);
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.error?.message || `Falha HTTP ${resposta.status}`);
    documentos.push(...(dados.documents || []));
    token = dados.nextPageToken || '';
  } while (token);
  return documentos;
}

function contarPor(chave, lista) {
  return lista.reduce((acumulado, item) => {
    const valor = item[chave];
    acumulado[valor] = (acumulado[valor] || 0) + 1;
    return acumulado;
  }, {});
}

async function preparar() {
  const caminhoEntrada = path.join(raiz, 'coletanea-extraida.txt');
  const conteudo = fs.readFileSync(caminhoEntrada, 'utf8');
  const extraidas = extrairFrases(conteudo);

  const chavesLocais = new Set();
  const unicasNoPdf = [];
  const repetidasNoPdf = [];
  for (const frase of extraidas) {
    const chave = normalizar(frase.texto);
    if (chavesLocais.has(chave)) repetidasNoPdf.push(frase);
    else {
      chavesLocais.add(chave);
      unicasNoPdf.push(frase);
    }
  }

  const existentes = await consultarDocumentos();
  const chavesExistentes = new Set(
    existentes
      .map((documento) => normalizar(documento.fields?.texto?.stringValue || ''))
      .filter(Boolean)
  );

  const novas = unicasNoPdf.filter((frase) => !chavesExistentes.has(normalizar(frase.texto)));
  const jaCadastradas = unicasNoPdf.filter((frase) => chavesExistentes.has(normalizar(frase.texto)));

  const relatorio = {
    arquivoOrigem: 'coletanea-de-1-200-frases-tematicas.pdf',
    observacao: 'O PDF contém 133 frases reais extraíveis; os 12 marcadores “Continua até 100 frases...” não foram tratados como frases.',
    totalFrasesExtraidas: extraidas.length,
    repetidasNoPdf: repetidasNoPdf.length,
    jaCadastradasNoSite: jaCadastradas.length,
    candidatasNovasParaImportar: novas.length,
    documentosAtuaisNoFirestore: existentes.length,
    distribuicaoNoPdfPorCategoriaOriginal: contarPor('categoriaOriginal', unicasNoPdf),
    distribuicaoPlanejadaPorCategoriaDoSite: contarPor('categoria', novas),
    autorPadrao: 'Autor não informado',
    geradoEmUtc: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(raiz, 'coletanea-frases-candidatas.json'),
    JSON.stringify(novas, null, 2) + '\n'
  );
  fs.writeFileSync(
    path.join(raiz, 'coletanea-frases-ja-cadastradas.json'),
    JSON.stringify(jaCadastradas, null, 2) + '\n'
  );
  fs.writeFileSync(
    path.join(raiz, 'relatorio-preparacao-coletanea.json'),
    JSON.stringify(relatorio, null, 2) + '\n'
  );

  console.log(JSON.stringify(relatorio, null, 2));
}

preparar().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  process.exitCode = 1;
});
