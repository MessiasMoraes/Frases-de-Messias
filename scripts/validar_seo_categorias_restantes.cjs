const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const hoje = '2026-08-19';
const paginas = [
  { arquivo: 'frases-de-gratidao.html', termo: 'Frases de Gratidão', introducao: 'introducaoGratidao' },
  { arquivo: 'frases-de-familia.html', termo: 'Frases de Família', introducao: 'introducaoFamilia' },
  { arquivo: 'frases-de-esperanca.html', termo: 'Frases de Esperança', introducao: 'introducaoEsperanca' },
  { arquivo: 'frases-de-reflexao.html', termo: 'Frases de Reflexão', introducao: 'introducaoReflexao' },
  { arquivo: 'frases-de-paz.html', termo: 'Frases de Paz' },
  { arquivo: 'frases-de-superacao.html', termo: 'Frases de Superação' },
  { arquivo: 'frases-de-trabalho.html', termo: 'Frases de Trabalho' }
];

const erros = [];
const avisos = [];
const sitemap = fs.readFileSync(path.join(raiz, 'sitemap.xml'), 'utf8');

function erro(mensagem) {
  erros.push(mensagem);
}

function extrairUnico(html, expressao, descricao, arquivo) {
  const resultados = [...html.matchAll(expressao)];
  if (resultados.length !== 1) {
    erro(`${arquivo}: ${descricao} deve aparecer uma vez; foram encontradas ${resultados.length}.`);
    return '';
  }
  return resultados[0][1].trim();
}

for (const pagina of paginas) {
  const caminho = path.join(raiz, pagina.arquivo);
  const html = fs.readFileSync(caminho, 'utf8');
  const slug = pagina.arquivo.replace(/\.html$/, '');

  const titulo = extrairUnico(html, /<title>([^<]+)<\/title>/g, 'title', pagina.arquivo);
  const descricao = extrairUnico(html, /<meta name="description" content="([^"]+)">/g, 'meta description', pagina.arquivo);
  const h1 = extrairUnico(html, /<h1[^>]*>([\s\S]*?)<\/h1>/g, 'H1', pagina.arquivo).replace(/<[^>]+>/g, '').trim();

  if (!titulo.includes(pagina.termo)) erro(`${pagina.arquivo}: o título não inclui "${pagina.termo}".`);
  if (!descricao.toLowerCase().includes(pagina.termo.toLowerCase())) erro(`${pagina.arquivo}: a descrição não inclui o tema principal.`);
  if (!h1.includes(pagina.termo)) erro(`${pagina.arquivo}: o H1 não inclui "${pagina.termo}".`);
  if (titulo.length > 90) avisos.push(`${pagina.arquivo}: title com ${titulo.length} caracteres; revisar se necessário.`);
  if (descricao.length < 70 || descricao.length > 180) avisos.push(`${pagina.arquivo}: meta description com ${descricao.length} caracteres; revisar se necessário.`);

  const canonical = `https://frasesdemessias.com.br/${pagina.arquivo}`;
  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) erro(`${pagina.arquivo}: canonical ausente ou incorreto.`);
  if (!html.includes('<meta name="robots" content="index,follow,max-image-preview:large">')) erro(`${pagina.arquivo}: robots meta ausente.`);

  const dadosEstruturados = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!dadosEstruturados.length) {
    erro(`${pagina.arquivo}: dados estruturados ausentes.`);
  } else {
    for (const bloco of dadosEstruturados) {
      try {
        JSON.parse(bloco[1]);
      } catch (error) {
        erro(`${pagina.arquivo}: JSON-LD inválido (${error.message}).`);
      }
    }
  }

  if (pagina.introducao && !html.includes(`id="${pagina.introducao}"`)) erro(`${pagina.arquivo}: introdução editorial ausente.`);
  if (html.includes('<h1>📖 Frases de Messias</h1>')) erro(`${pagina.arquivo}: H1 genérico do cabeçalho não foi removido.`);

  const entradaSitemap = `<loc>${canonical}</loc>\n    <lastmod>${hoje}</lastmod>`;
  if (!sitemap.includes(entradaSitemap)) erro(`${pagina.arquivo}: sitemap sem lastmod ${hoje}.`);

  const blocosRelacionados = [...html.matchAll(/<div class="grid-botoes links-editoriais"[\s\S]*?<\/div>/g)];
  for (const bloco of blocosRelacionados) {
    for (const link of bloco[0].matchAll(/href="([^"]+)"/g)) {
      const destino = path.join(raiz, link[1]);
      if (!fs.existsSync(destino)) erro(`${pagina.arquivo}: link editorial inexistente (${link[1]}).`);
    }
  }
}

if (erros.length) {
  console.error('Validação reprovada:');
  erros.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`Validação aprovada: ${paginas.length} páginas com SEO técnico consistente.`);
if (avisos.length) {
  console.log('Avisos de revisão:');
  avisos.forEach((item) => console.log(`- ${item}`));
}
