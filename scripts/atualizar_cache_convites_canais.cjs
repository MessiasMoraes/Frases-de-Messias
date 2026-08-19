const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const versao = "20260819-canais-v1";
const paginas = fs.readdirSync(raiz)
  .filter((arquivo) => arquivo.endsWith(".html"))
  .filter((arquivo) => fs.readFileSync(path.join(raiz, arquivo), "utf8").includes('src="categoria.js'));

let atualizadas = 0;
for (const pagina of paginas) {
  const arquivo = path.join(raiz, pagina);
  const original = fs.readFileSync(arquivo, "utf8");
  const atualizado = original.replace(/src="categoria\.js\?v=[^"]+"/g, `src="categoria.js?v=${versao}"`);
  if (atualizado !== original) {
    fs.writeFileSync(arquivo, atualizado);
    atualizadas += 1;
  }
}

console.log(`Versão de cache atualizada em ${atualizadas} páginas de categoria.`);
