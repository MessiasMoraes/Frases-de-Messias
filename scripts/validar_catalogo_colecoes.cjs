const fs = require('fs');
const path = require('path');

const arquivo = path.resolve(__dirname, '..', 'dados', 'colecoes-editoriais.json');
const colecoes = JSON.parse(fs.readFileSync(arquivo, 'utf8'));

if (colecoes.length !== 17) {
  throw new Error(`Total inesperado de coleções: ${colecoes.length}. Esperado: 17.`);
}

const incompletas = colecoes.filter((colecao) => !colecao.titulo || !Array.isArray(colecao.frases) || colecao.frases.length !== 10);
if (incompletas.length) {
  throw new Error(`Coleções incompletas: ${incompletas.map((colecao) => colecao.arquivo).join(', ')}`);
}

const arquivos = colecoes.map((colecao) => colecao.arquivo);
if (new Set(arquivos).size !== arquivos.length) {
  throw new Error('Há URLs duplicadas no catálogo de coleções.');
}

const totalFrases = colecoes.reduce((total, colecao) => total + colecao.frases.length, 0);
console.log(`Catálogo validado: ${colecoes.length} coleções e ${totalFrases} frases.`);
