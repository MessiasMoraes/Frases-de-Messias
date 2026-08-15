import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const categorias = ['Amizade', 'Amor', 'Boa Noite', 'Bom Dia', 'Esperança', 'Família', 'Fé', 'Gratidão', 'Motivação', 'Reflexão', 'Sucesso', 'Vida'];
const porCategoria = 3;

const normalizar = (texto) => String(texto)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const lerJson = async (arquivo) => JSON.parse(await readFile(resolve(raiz, arquivo), 'utf8'));
const frasesPrincipais = await lerJson('frases.json');
const fontes = frasesPrincipais.map((frase) => ({ ...frase, fonte: 'acervo-principal' }));

const selecionadas = [];
for (const categoria of categorias) {
  const usadas = new Set();
  const candidatas = fontes.filter((frase) => frase.categoria === categoria && frase.texto && frase.texto.trim().length >= 20);
  for (const frase of candidatas) {
    const chave = normalizar(frase.texto);
    if (usadas.has(chave)) continue;
    usadas.add(chave);
    selecionadas.push({
      categoria,
      autor: frase.autor?.trim() || 'Messias',
      texto: frase.texto.trim(),
      fonte: frase.fonte
    });
    if (selecionadas.filter((item) => item.categoria === categoria).length === porCategoria) break;
  }
}

const faltantes = categorias.filter((categoria) => selecionadas.filter((item) => item.categoria === categoria).length !== porCategoria);
if (faltantes.length) throw new Error(`Não foi possível selecionar ${porCategoria} frases para: ${faltantes.join(', ')}`);

await writeFile(resolve(raiz, 'frases-destaque.json'), `${JSON.stringify(selecionadas, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ total: selecionadas.length, porCategoria, categorias: categorias.length, selecionadas }, null, 2));
