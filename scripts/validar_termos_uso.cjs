const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const termosPath = path.join(raiz, 'termos-de-uso.html');
const termos = fs.readFileSync(termosPath, 'utf8');
const exigencias = [
  '<title>Termos de Uso e Direitos Autorais | Frases de Messias</title>',
  'id="uso-do-portal"',
  'id="direitos-autorais"',
  'id="comunidade"',
  'id="conteudo-usuarios"',
  'id="moderacao"',
  'politica-de-privacidade.html',
  'contato.html'
];

const faltando = exigencias.filter((item) => !termos.includes(item));
if (faltando.length) {
  throw new Error(`A página de termos está incompleta: ${faltando.join(', ')}`);
}

const paginasComRodape = fs.readdirSync(raiz)
  .filter((nome) => nome.endsWith('.html') && nome !== 'termos-de-uso.html')
  .filter((nome) => fs.readFileSync(path.join(raiz, nome), 'utf8').includes('<footer>'));

const semLink = paginasComRodape.filter((nome) => {
  const conteudo = fs.readFileSync(path.join(raiz, nome), 'utf8');
  const rodape = conteudo.match(/<footer>([\s\S]*?)<\/footer>/);
  return !rodape || !rodape[0].includes('href="termos-de-uso.html"');
});

const linksEmAcoes = fs.readdirSync(raiz)
  .filter((nome) => nome.endsWith('.html'))
  .filter((nome) => /<footer\s+class="[^"]*acoes-publicacao[^\"]*">[\s\S]*?href="termos-de-uso\.html"/i.test(fs.readFileSync(path.join(raiz, nome), 'utf8')));

if (semLink.length) {
  throw new Error(`Páginas com rodapé sem link de termos: ${semLink.join(', ')}`);
}
if (linksEmAcoes.length) {
  throw new Error(`Links de termos não podem aparecer em ações de publicação: ${linksEmAcoes.join(', ')}`);
}

console.log(`Validação aprovada: página de termos completa e ${paginasComRodape.length} rodapés reais com link legal.`);
