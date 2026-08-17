#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const baseUrl = 'https://frasesdemessias.com.br';
const excludedRootPages = new Set([
  'admin.html',
  'favoritos.html',
  'importar.html',
  'meu-perfil.html',
  'moderacao.html',
  'perfil.html'
]);

function dateFor(filePath) {
  return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const rootPages = fs.readdirSync(root)
  .filter((name) => name.endsWith('.html') && !excludedRootPages.has(name))
  .sort()
  .map((name) => ({
    filePath: path.join(root, name),
    urlPath: name === 'index.html' ? '/' : `/${name}`
  }));

const phraseDirectory = path.join(root, 'frases');
const phrasePages = fs.existsSync(phraseDirectory)
  ? fs.readdirSync(phraseDirectory)
    .filter((name) => name.endsWith('.html'))
    .sort()
    .map((name) => ({
      filePath: path.join(phraseDirectory, name),
      urlPath: `/frases/${name}`
    }))
  : [];

const pages = [...rootPages, ...phrasePages];
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...pages.map(({ filePath, urlPath }) => [
    '  <url>',
    `    <loc>${escapeXml(`${baseUrl}${urlPath}`)}</loc>`,
    `    <lastmod>${dateFor(filePath)}</lastmod>`,
    '  </url>'
  ].join('\n')),
  '</urlset>',
  ''
].join('\n');

fs.writeFileSync(path.join(root, 'sitemap.xml'), xml, 'utf8');
console.log(`Sitemap criado com ${pages.length} URLs públicas.`);
