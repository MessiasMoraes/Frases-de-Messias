import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const raiz = path.resolve(__dirname, '..');

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

function limparLinha(valor = '') {
  return String(valor).replace(/\f/g, '').replace(/\s+/g, ' ').trim();
}

function chaveUnica(valor = '') {
  return limparLinha(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

function extrairColetanea(conteudo) {
  const frases = [];
  let categoriaPdf = '';
  let fraseAtual = '';

  const salvar = () => {
    const texto = limparLinha(fraseAtual);
    const categoria = MAPA_CATEGORIAS[categoriaPdf];
    if (!texto || !categoria || /\(continua até 100 frases/i.test(texto)) return;
    frases.push({ texto, categoria, autor: 'Messias' });
  };

  for (const linhaBruta of conteudo.split(/\r?\n/)) {
    const linha = limparLinha(linhaBruta);
    const cabecalho = linha.match(/^\d+\.\s+(.+)$/);
    const item = linha.match(/^•\s*(.+)$/);

    if (cabecalho) {
      salvar();
      fraseAtual = '';
      categoriaPdf = cabecalho[1].trim();
      continue;
    }
    if (item) {
      salvar();
      fraseAtual = item[1].trim();
      continue;
    }
    if (linha && fraseAtual) fraseAtual = `${fraseAtual} ${linha}`;
  }
  salvar();
  return frases;
}

function lerJson(nome) {
  return JSON.parse(fs.readFileSync(path.join(raiz, nome), 'utf8'));
}

const fontes = [
  ...lerJson('frases.json'),
  ...lerJson('frases-50-por-categoria.json'),
  ...extrairColetanea(fs.readFileSync(path.join(raiz, 'coletanea-extraida.txt'), 'utf8'))
];

const vistas = new Set();
const frases = [];
for (const item of fontes) {
  const texto = limparLinha(item.texto);
  const chave = chaveUnica(texto);
  if (!texto || vistas.has(chave)) continue;
  vistas.add(chave);
  frases.push({
    id: `bot-${String(frases.length + 1).padStart(4, '0')}`,
    texto,
    autor: limparLinha(item.autor) || 'Messias',
    categoria: limparLinha(item.categoria) || 'Reflexão'
  });
}

const destino = path.join(raiz, 'dados', 'frases-bot.json');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify({
  versao: '2026-08-17',
  total: frases.length,
  categorias: [...new Set(frases.map((frase) => frase.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  frases
}, null, 2) + '\n');

console.log(`Catálogo do bot criado: ${frases.length} frases em ${destino}`);
