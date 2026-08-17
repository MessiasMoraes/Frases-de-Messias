#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const about = fs.readFileSync(path.join(root, 'sobre.html'), 'utf8');
const errors = [];

const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const uniqueUrls = new Set(urls);

if (!robots.includes('Sitemap: https://frasesdemessias.com.br/sitemap.xml')) {
  errors.push('robots.txt não declara o sitemap canônico.');
}
if (urls.length !== uniqueUrls.size) {
  errors.push('O sitemap contém URLs duplicadas.');
}
if (urls.length < 70) {
  errors.push(`O sitemap contém somente ${urls.length} URLs; são esperadas ao menos 70.`);
}

const expectedCollectionPages = [
  'colecoes.html',
  'frases-para-whatsapp.html',
  'frases-para-status.html',
  'frases-de-aniversario.html',
  'frases-de-saudade.html',
  'frases-de-deus.html',
  'mensagens-de-boa-semana.html',
  'frases-para-fotos.html',
  'mensagens-de-gratidao.html',
  'frases-de-superacao.html',
  'frases-para-mae.html',
  'frases-para-pai.html',
  'mensagens-de-domingo.html',
  'mensagens-de-amizade.html',
  'frases-de-casal.html',
  'frases-de-trabalho.html',
  'frases-de-paz.html',
  'mensagens-para-comecar-o-dia.html'
];

for (const page of expectedCollectionPages) {
  const url = `https://frasesdemessias.com.br/${page}`;
  if (!uniqueUrls.has(url)) errors.push(`Coleção ausente do sitemap: ${page}`);
}

function parseJsonLd(html, label) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)];
  if (!blocks.length) {
    errors.push(`${label} não possui dados estruturados JSON-LD.`);
    return [];
  }
  return blocks.map((block, indexBlock) => {
    try {
      return JSON.parse(block[1]);
    } catch (error) {
      errors.push(`${label} possui JSON-LD inválido no bloco ${indexBlock + 1}: ${error.message}`);
      return null;
    }
  }).filter(Boolean);
}

const indexSchemas = parseJsonLd(index, 'index.html');
const aboutSchemas = parseJsonLd(about, 'sobre.html');
const indexGraph = indexSchemas.flatMap((schema) => schema['@graph'] || [schema]);
const aboutGraph = aboutSchemas.flatMap((schema) => schema['@graph'] || [schema]);

if (!indexGraph.some((schema) => schema['@type'] === 'WebSite')) errors.push('A página inicial não declara WebSite.');
const organization = indexGraph.find((schema) => schema['@type'] === 'Organization');
if (!organization) errors.push('A página inicial não declara Organization.');
else if (!Array.isArray(organization.sameAs) || organization.sameAs.length < 3) errors.push('Organization não possui os três canais oficiais em sameAs.');
if (!aboutGraph.some((schema) => schema['@type'] === 'WebPage')) errors.push('A página Sobre não declara WebPage.');
if (!about.includes('Frases de Messias')) errors.push('A página Sobre não apresenta a marca de forma visível.');
if (!about.includes('colecoes.html')) errors.push('A página Sobre não direciona para as coleções.');

if (errors.length) {
  console.error(`Falha na validação de visibilidade (${errors.length} problema(s)): `);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validação aprovada: ${urls.length} URLs únicas, robots.txt, sitemap, JSON-LD e página institucional consistentes.`);
