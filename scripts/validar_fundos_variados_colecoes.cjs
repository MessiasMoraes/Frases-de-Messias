const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const colecoes = JSON.parse(fs.readFileSync(path.join(raiz, 'dados', 'colecoes-editoriais.json'), 'utf8'));
const fundosPorTema = {
  amizade: ['amizade', 'amor', 'familia', 'gratidao', 'vida'],
  'amor proprio': ['amor', 'vida', 'reflexao', 'sucesso', 'motivacao'],
  aniversario: ['bom-dia', 'gratidao', 'amizade', 'vida', 'sucesso'],
  'boa noite': ['boa-noite', 'reflexao', 'vida', 'fe', 'esperanca'],
  'boa semana': ['bom-dia', 'sucesso', 'motivacao', 'vida', 'gratidao'],
  'bom dia': ['bom-dia', 'vida', 'motivacao', 'esperanca', 'gratidao'],
  carinho: ['amor', 'amizade', 'familia', 'gratidao', 'vida'],
  casal: ['amor', 'amizade', 'familia', 'vida', 'gratidao'],
  domingo: ['boa-noite', 'vida', 'gratidao', 'fe', 'esperanca'],
  esperanca: ['esperanca', 'fe', 'vida', 'motivacao', 'reflexao'],
  fe: ['fe', 'esperanca', 'vida', 'reflexao', 'gratidao'],
  gratidao: ['gratidao', 'vida', 'familia', 'amizade', 'bom-dia'],
  legenda: ['vida', 'reflexao', 'amor', 'sucesso', 'motivacao'],
  motivacao: ['motivacao', 'sucesso', 'vida', 'esperanca', 'reflexao'],
  mae: ['familia', 'amor', 'gratidao', 'amizade', 'vida'],
  'novo dia': ['bom-dia', 'vida', 'motivacao', 'esperanca', 'gratidao'],
  pai: ['familia', 'amor', 'gratidao', 'amizade', 'vida'],
  paz: ['reflexao', 'boa-noite', 'esperanca', 'vida', 'fe'],
  reflexao: ['reflexao', 'vida', 'motivacao', 'esperanca', 'gratidao'],
  saudade: ['amizade', 'familia', 'amor', 'reflexao', 'vida'],
  status: ['vida', 'sucesso', 'reflexao', 'motivacao', 'amor'],
  superacao: ['motivacao', 'esperanca', 'sucesso', 'vida', 'reflexao'],
  trabalho: ['sucesso', 'motivacao', 'vida', 'reflexao', 'esperanca'],
  vida: ['vida', 'reflexao', 'motivacao', 'esperanca', 'gratidao']
};

function normalizar(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function hashDeterministico(valor = '') {
  let hash = 2166136261;
  for (let indice = 0; indice < valor.length; indice += 1) {
    hash ^= valor.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const composicoes = new Map();
const fundos = new Set();
let total = 0;
for (const colecao of colecoes) {
  for (const [texto, temaOriginal] of colecao.frases) {
    total += 1;
    const tema = normalizar(temaOriginal);
    const hash = hashDeterministico(`${tema}|${texto}`);
    const opcoes = fundosPorTema[tema] || ['fundo-frases-sereno'];
    const fundo = opcoes[hash % opcoes.length];
    const focoX = (0.08 + (((hash & 0xffff) / 0xffff) * 0.84)).toFixed(4);
    const focoY = (0.08 + ((((hash >>> 16) & 0xffff) / 0xffff) * 0.84)).toFixed(4);
    const chave = `${fundo}|${focoX}|${focoY}`;
    fundos.add(fundo);
    if (!composicoes.has(chave)) composicoes.set(chave, []);
    composicoes.get(chave).push(`${colecao.arquivo}: ${texto}`);
  }
}

const repeticoes = [...composicoes.values()].filter((itens) => itens.length > 1);
const relatorio = {
  validadoEm: new Date().toISOString(),
  totalFrases: total,
  composicoesVisuaisUnicas: composicoes.size,
  fundosTematicosUsados: fundos.size,
  repeticoes,
  valido: repeticoes.length === 0 && composicoes.size === total
};
fs.writeFileSync(path.join(raiz, 'validacao-fundos-variados-colecoes.json'), `${JSON.stringify(relatorio, null, 2)}\n`);
console.log(JSON.stringify(relatorio, null, 2));
if (!relatorio.valido) process.exitCode = 1;
