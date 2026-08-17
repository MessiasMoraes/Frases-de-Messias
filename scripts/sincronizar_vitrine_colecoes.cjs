const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const colecoes = JSON.parse(fs.readFileSync(path.join(raiz, 'dados', 'colecoes-editoriais.json'), 'utf8'));
const escapar = (valor = '') => String(valor)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const cards = colecoes.map((colecao) => `
        <a class="card-colecao" href="${colecao.arquivo}">
          <span class="card-colecao-icone" aria-hidden="true">${colecao.icone}</span>
          <span class="card-colecao-conteudo"><strong>${escapar(colecao.tituloCurto)}</strong><small>${escapar(colecao.resumo)}</small></span>
          <span class="card-colecao-seta" aria-hidden="true">→</span>
        </a>`).join('');

const secao = `    <section class="colecoes-listagem categorias-com-colecoes" aria-labelledby="tituloColecoesEspeciais">
      <h2 id="tituloColecoesEspeciais">✨ Coleções especiais para compartilhar</h2>
      <p>Encontre mensagens prontas para situações, pessoas e momentos específicos.</p>
      <div class="grid-colecoes">${cards}
      </div>
    </section>`;

const arquivo = path.join(raiz, 'categorias.html');
let html = fs.readFileSync(arquivo, 'utf8');
const padrao = /    <section class="colecoes-listagem categorias-com-colecoes"[\s\S]*?\n    <\/section>/;

if (padrao.test(html)) {
  html = html.replace(padrao, secao);
} else {
  html = html.replace('  </main>', `${secao}\n  </main>`);
}

fs.writeFileSync(arquivo, html);
console.log(`Vitrine de categorias sincronizada com ${colecoes.length} coleções.`);
