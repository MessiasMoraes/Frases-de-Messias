const fs = require('node:fs');
const path = require('node:path');
const configuracao = require('../dados/perfis-trilha.json');

function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function contemExpressao(texto, expressao) {
  const alvo = normalizar(expressao);
  if (!alvo) return false;
  if (alvo.includes(' ')) return texto.includes(alvo);
  return new RegExp(`(^|[^a-z0-9])${alvo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(texto);
}

function selecionarTrilha({ quote = '', author = '', category = '' } = {}) {
  const texto = normalizar(`${quote} ${author}`);
  const categoria = normalizar(category);
  const perfis = configuracao.perfis;
  let melhor = perfis[0];
  let maiorPontuacao = Number.NEGATIVE_INFINITY;

  for (const perfil of perfis) {
    let pontuacao = 0;
    if (perfil.categorias.some((item) => normalizar(item) === categoria)) pontuacao += 6;
    for (const palavra of perfil.palavras) {
      // Um sentido explícito, como “carinho” ou “força”, deve prevalecer sobre uma categoria ampla como Reflexão.
      if (contemExpressao(texto, palavra)) pontuacao += 7;
    }
    if (pontuacao > maiorPontuacao) {
      melhor = perfil;
      maiorPontuacao = pontuacao;
    }
  }

  return {
    id: melhor.id,
    arquivo: melhor.arquivo,
    rotulo: melhor.rotulo,
    volumeFundoDb: configuracao.volumeFundoDb,
    pontuacao: Math.max(0, maiorPontuacao),
  };
}

function caminhoDaTrilha(arquivo) {
  const candidatos = [
    path.join(process.cwd(), 'public', 'trilhas', arquivo),
    path.join(__dirname, '..', 'public', 'trilhas', arquivo),
  ];
  const encontrado = candidatos.find((item) => fs.existsSync(item));
  if (!encontrado) throw new Error(`Trilha não encontrada: ${arquivo}`);
  return encontrado;
}

module.exports = { selecionarTrilha, caminhoDaTrilha, configuracao };
