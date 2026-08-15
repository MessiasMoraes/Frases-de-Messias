import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(new URL('..', import.meta.url).pathname);
const dominio = 'https://frasesdemessias.com.br';
const frases = JSON.parse(await readFile(resolve(raiz, 'frases-destaque.json'), 'utf8'));
const sitemap = await readFile(resolve(raiz, 'sitemap.xml'), 'utf8');
const central = await readFile(resolve(raiz, 'frases-importantes.html'), 'utf8');
const arquivos = (await readdir(resolve(raiz, 'frases'))).filter((arquivo) => arquivo.endsWith('.html'));

const slugificar = (valor) => String(valor)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-+/g, '-');

const escaparRegex = (valor) => String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const problemas = [];
if (frases.length !== 36) problemas.push(`Seleção deveria conter 36 frases, encontrou ${frases.length}.`);
if (arquivos.length !== frases.length) problemas.push(`Pasta frases deveria conter ${frases.length} páginas, encontrou ${arquivos.length}.`);
if (!central.includes('<h1>⭐ Frases importantes para inspirar e compartilhar</h1>')) problemas.push('Central não possui o título principal esperado.');

for (const frase of frases) {
  const arquivo = `${slugificar(frase.texto).slice(0, 90)}.html`;
  const caminho = resolve(raiz, 'frases', arquivo);
  const url = `${dominio}/frases/${arquivo}`;
  try {
    await access(caminho);
    const html = await readFile(caminho, 'utf8');
    if (!html.includes(`<link rel="canonical" href="${url}">`)) problemas.push(`${arquivo}: canonical ausente ou incorreta.`);
    if (!html.includes(`<h1>${frase.texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>`)) problemas.push(`${arquivo}: h1 da frase ausente.`);
    if (!html.includes('class="botao-copiar"')) problemas.push(`${arquivo}: botão de copiar ausente.`);
    if (!html.includes('class="botao-compartilhar"')) problemas.push(`${arquivo}: botão de compartilhar ausente.`);
    if (!html.includes('Outras frases de')) problemas.push(`${arquivo}: links relacionados ausentes.`);
    if (!sitemap.includes(`<loc>${url}</loc>`)) problemas.push(`${arquivo}: URL ausente do sitemap.`);
    if (!central.includes(`href="frases/${arquivo}"`)) problemas.push(`${arquivo}: link ausente da central.`);
  } catch {
    problemas.push(`${arquivo}: arquivo não encontrado.`);
  }
}

const resultado = {
  paginasIndividuais: frases.length,
  paginasNaPasta: arquivos.length,
  urlsNoSitemap: (sitemap.match(/<url>/g) || []).length,
  status: problemas.length ? 'falhou' : 'aprovado',
  problemas
};
console.log(JSON.stringify(resultado, null, 2));
if (problemas.length) process.exit(1);
