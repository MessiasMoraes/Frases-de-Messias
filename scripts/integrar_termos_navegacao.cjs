const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const arquivos = fs.readdirSync(raiz).filter((nome) => nome.endsWith('.html'));
let atualizados = 0;

function adicionarLinkNoRodape(conteudo) {
  return conteudo.replace(/<footer>([\s\S]*?)<\/footer>/g, (rodapeCompleto, interno) => {
    if (interno.includes('href="termos-de-uso.html"')) return rodapeCompleto;

    const linkTermos = '<a href="termos-de-uso.html">Termos de Uso</a>';
    let novoInterno = interno;

    if (novoInterno.includes('href="contato.html"')) {
      novoInterno = novoInterno.replace(
        /(<a href="contato\.html"[^>]*>[^<]*<\/a>)/,
        `${linkTermos} · $1`
      );
    } else {
      novoInterno = `${novoInterno}\n    <p>${linkTermos} · <a href="contato.html">Contato</a></p>`;
    }

    return `<footer>${novoInterno}</footer>`;
  });
}

for (const nome of arquivos) {
  if (nome === 'termos-de-uso.html') continue;
  const arquivo = path.join(raiz, nome);
  const original = fs.readFileSync(arquivo, 'utf8');
  const atualizado = adicionarLinkNoRodape(original);

  if (atualizado !== original) {
    fs.writeFileSync(arquivo, atualizado);
    atualizados += 1;
  }
}

console.log(`Links de Termos de Uso integrados em ${atualizados} páginas.`);
