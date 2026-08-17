const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const colecoes = JSON.parse(fs.readFileSync(path.join(raiz, 'dados', 'colecoes-editoriais.json'), 'utf8'));
const erros = [];
const avisos = [];

function exigir(condicao, mensagem) {
  if (!condicao) erros.push(mensagem);
}

function ler(nome) {
  return fs.readFileSync(path.join(raiz, nome), 'utf8');
}

function contar(texto, padrao) {
  return (texto.match(padrao) || []).length;
}

for (const colecao of colecoes) {
  const html = ler(colecao.arquivo);
  exigir(html.includes(`<title>${colecao.titulo} | Frases de Messias</title>`), `${colecao.arquivo}: title ausente ou incorreto.`);
  exigir(html.includes('<meta name="description"'), `${colecao.arquivo}: meta description ausente.`);
  exigir(html.includes(`<link rel="canonical" href="https://frasesdemessias.com.br/${colecao.arquivo}">`), `${colecao.arquivo}: canonical ausente ou incorreta.`);
  exigir(html.includes('"@type":"CollectionPage"'), `${colecao.arquivo}: schema CollectionPage ausente.`);
  exigir(html.includes('"@type":"BreadcrumbList"'), `${colecao.arquivo}: schema BreadcrumbList ausente.`);
  exigir(contar(html, /<h1[ >]/g) === 1, `${colecao.arquivo}: deve conter exatamente um H1.`);
  exigir(html.includes('href="colecoes.html"'), `${colecao.arquivo}: link para a central de coleções ausente.`);
  exigir(html.includes('id="buscaColecao"'), `${colecao.arquivo}: campo de busca ausente.`);
  exigir(contar(html, /data-frase-card/g) === 10, `${colecao.arquivo}: quantidade de cards de frase diferente de 10.`);
  exigir(contar(html, /data-copiar-frase/g) === 10, `${colecao.arquivo}: botões de cópia incompletos.`);
  exigir(contar(html, /data-compartilhar-frase/g) === 10, `${colecao.arquivo}: botões de compartilhamento incompletos.`);
  for (const [, url] of colecao.relacionados) exigir(fs.existsSync(path.join(raiz, url)), `${colecao.arquivo}: link relacionado inexistente (${url}).`);
}

const hub = ler('colecoes.html');
exigir(contar(hub, /<h1[ >]/g) === 1, 'colecoes.html: deve conter exatamente um H1.');
exigir(hub.includes('"@type":"CollectionPage"'), 'colecoes.html: schema CollectionPage ausente.');
for (const colecao of colecoes) exigir(hub.includes(`href="${colecao.arquivo}"`), `colecoes.html: link ausente para ${colecao.arquivo}.`);

const index = ler('index.html');
const categorias = ler('categorias.html');
for (const arquivo of ['index.html', 'categorias.html']) {
  const html = ler(arquivo);
  exigir(html.includes('href="colecoes.html"'), `${arquivo}: acesso à central de coleções ausente.`);
}
for (const colecao of colecoes) {
  exigir(categorias.includes(`href="${colecao.arquivo}"`), `categorias.html: atalho ausente para ${colecao.arquivo}.`);
}

const js = ler('colecoes.js');
exigir(js.includes('navigator.share'), 'colecoes.js: compartilhamento nativo ausente.');
exigir(js.includes('navigator.clipboard'), 'colecoes.js: cópia para área de transferência ausente.');
exigir(js.includes("localStorage.getItem('tema')"), 'colecoes.js: persistência de tema ausente.');

const css = ler('style.css');
for (const seletor of ['.grid-colecoes', '.card-colecao', '.card-frase-colecao', '.dark .card-colecao', '@media (max-width: 780px)']) {
  exigir(css.includes(seletor), `style.css: estilo esperado ausente (${seletor}).`);
}

if (index.includes('href="colecoes.html"') && !index.includes('style.css?v=20260817-colecoes-v2')) avisos.push('index.html: cache-busting do CSS não foi localizado; verifique a versão do stylesheet.');

if (erros.length) {
  console.error(`Falha na validação: ${erros.length} problema(s).`);
  erros.forEach((erro) => console.error(`- ${erro}`));
  process.exit(1);
}

console.log(`Validação concluída: ${colecoes.length} coleções, ${colecoes.length * 10} frases editoriais e links internos verificados.`);
if (avisos.length) avisos.forEach((aviso) => console.warn(`Aviso: ${aviso}`));
