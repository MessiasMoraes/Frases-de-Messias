const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const paginas = [
  'frases-de-fe.html',
  'frases-de-amor.html',
  'frases-de-motivacao.html',
  'frases-de-bom-dia.html',
  'frases-de-boa-noite.html'
];

let falhas = 0;

function conferir(condicao, mensagem) {
  if (!condicao) {
    falhas += 1;
    console.error(`FALHA: ${mensagem}`);
  }
}

for (const arquivo of paginas) {
  const caminho = path.join(raiz, arquivo);
  const html = fs.readFileSync(caminho, 'utf8');
  const titulo = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
  const descricao = html.match(/<meta name="description" content="([^"]+)">/)?.[1] || '';
  const canonica = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1] || '';
  const schema = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || '';

  conferir((html.match(/<h1>/g) || []).length === 1, `${arquivo} precisa ter exatamente um H1.`);
  conferir(titulo.length >= 30 && titulo.length <= 70, `${arquivo} possui título fora da faixa recomendada: ${titulo.length} caracteres.`);
  conferir(descricao.length >= 120 && descricao.length <= 160, `${arquivo} possui meta description fora da faixa recomendada: ${descricao.length} caracteres.`);
  conferir(canonica === `https://frasesdemessias.com.br/${arquivo}`, `${arquivo} possui URL canônica incorreta.`);
  conferir(html.includes('property="og:site_name"'), `${arquivo} não possui og:site_name.`);
  conferir(html.includes('class="categoria-conteudo"'), `${arquivo} não possui introdução editorial.`);
  conferir(html.includes('Explore categorias relacionadas'), `${arquivo} não possui seção de links internos relacionados.`);

  try {
    const objeto = JSON.parse(schema);
    const tipos = (objeto['@graph'] || []).map((item) => item['@type']);
    conferir(tipos.includes('CollectionPage'), `${arquivo} não possui CollectionPage no JSON-LD.`);
    conferir(tipos.includes('BreadcrumbList'), `${arquivo} não possui BreadcrumbList no JSON-LD.`);
  } catch (erro) {
    conferir(false, `${arquivo} possui JSON-LD inválido: ${erro.message}`);
  }

  const linksInternos = [...html.matchAll(/href="([^"]+\.html)"/g)]
    .map((match) => match[1])
    .filter((link) => !/^https?:\/\//i.test(link));
  for (const link of linksInternos) {
    conferir(fs.existsSync(path.join(raiz, link)), `${arquivo} aponta para um arquivo inexistente: ${link}.`);
  }

  console.log(`OK: ${arquivo} — title ${titulo.length} caracteres, description ${descricao.length} caracteres, ${linksInternos.length} links internos.`);
}

if (falhas) {
  console.error(`\nValidação concluída com ${falhas} falha(s).`);
  process.exit(1);
}

console.log('\nValidação SEO concluída sem falhas.');
