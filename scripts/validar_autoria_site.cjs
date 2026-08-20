const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..');
const arquivos = {
  inicio: path.join(raiz, 'index.html'),
  sobre: path.join(raiz, 'sobre.html'),
  sitemap: path.join(raiz, 'sitemap.xml')
};

function ler(nome) {
  return fs.readFileSync(arquivos[nome], 'utf8');
}

function jsonLdDo(html, origem) {
  const bloco = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/i);
  if (!bloco) throw new Error(`JSON-LD ausente em ${origem}.`);
  try {
    return JSON.parse(bloco[1]);
  } catch (erro) {
    throw new Error(`JSON-LD inválido em ${origem}: ${erro.message}`);
  }
}

function exigir(valor, mensagem) {
  if (!valor) throw new Error(mensagem);
}

const inicio = ler('inicio');
const sobre = ler('sobre');
const sitemap = ler('sitemap');
const dadosInicio = jsonLdDo(inicio, 'index.html');
const dadosSobre = jsonLdDo(sobre, 'sobre.html');
const grafoInicio = dadosInicio['@graph'] || [];
const grafoSobre = dadosSobre['@graph'] || [];
const criadorId = 'https://frasesdemessias.com.br/sobre.html#criador';
const instagramCriador = 'https://www.instagram.com/ue_messiasaugusto/';

const pessoaInicio = grafoInicio.find((item) => item['@type'] === 'Person' && item['@id'] === criadorId);
const organizacaoInicio = grafoInicio.find((item) => item['@type'] === 'Organization');
const site = grafoInicio.find((item) => item['@type'] === 'WebSite');
const pessoaSobre = grafoSobre.find((item) => item['@type'] === 'Person' && item['@id'] === criadorId);
const paginaSobre = grafoSobre.find((item) => item['@type'] === 'WebPage');

exigir(inicio.includes('Criado por <a href="sobre.html#criador-titulo" rel="author">Messias Augusto</a>'), 'Rodapé da página inicial sem autoria visível.');
exigir(sobre.includes('O Frases de Messias foi criado por Messias Augusto'), 'Página Sobre sem autoria explícita.');
exigir(pessoaInicio?.name === 'Messias Augusto', 'Pessoa criadora ausente ou incorreta na página inicial.');
exigir(pessoaInicio?.sameAs?.includes(instagramCriador), 'Instagram do criador ausente na página inicial.');
exigir(organizacaoInicio?.founder?.['@id'] === criadorId, 'Fundador ausente na organização da página inicial.');
exigir(site?.creator?.['@id'] === criadorId, 'Criador ausente no WebSite da página inicial.');
exigir(pessoaSobre?.name === 'Messias Augusto', 'Pessoa criadora ausente ou incorreta na página Sobre.');
exigir(paginaSobre?.author?.['@id'] === criadorId, 'Autor ausente no WebPage da página Sobre.');
exigir(sitemap.includes('<loc>https://frasesdemessias.com.br/</loc>\n    <lastmod>2026-08-20</lastmod>'), 'Página inicial não atualizada no sitemap.');
exigir(sitemap.includes('<loc>https://frasesdemessias.com.br/sobre.html</loc>\n    <lastmod>2026-08-20</lastmod>'), 'Página Sobre não atualizada no sitemap.');

console.log('Validação de autoria concluída: Messias Augusto está identificado no conteúdo, nos dados estruturados e no sitemap.');
