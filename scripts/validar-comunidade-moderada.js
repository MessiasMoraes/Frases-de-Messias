const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), 'utf8');
const exigir = (condicao, mensagem) => {
  if (!condicao) throw new Error(mensagem);
};

const arquivosPublicos = [
  'comunidade.html', 'comunidade.css', 'comunidade.js',
  'moderacao.html', 'moderacao.css', 'moderacao.js',
  'dist/comunidade.html', 'dist/comunidade.css', 'dist/comunidade.js',
  'dist/moderacao.html', 'dist/moderacao.css', 'dist/moderacao.js'
];

arquivosPublicos.forEach((arquivo) => exigir(fs.existsSync(path.join(raiz, arquivo)), `Arquivo ausente: ${arquivo}`));

const comunidade = ler('comunidade.js');
const moderacao = ler('moderacao.js');
const regras = ler('firestore-comunidade.rules');
const inicio = ler('index.html');

exigir(inicio.includes('href="comunidade.html"'), 'A navegação principal não contém o acesso à Comunidade.');
exigir(comunidade.includes('status: "pendente"'), 'O envio de conteúdo não está marcado como pendente.');
exigir(comunidade.includes('where("status", "==", "publicado")'), 'O feed não está limitado a conteúdo aprovado.');
exigir(comunidade.includes('Comentário enviado para aprovação.'), 'Comentários não informam que aguardam moderação.');
exigir(moderacao.includes('collectionGroup(db, "comentarios")'), 'A fila administrativa não consulta comentários pendentes.');
exigir(moderacao.includes('status: "publicado"'), 'A aprovação administrativa não publica o conteúdo.');
exigir(regras.includes("request.resource.data.status == 'pendente'"), 'As regras não exigem status pendente em novas submissões.');
exigir(regras.includes("allow update: if administrador();"), 'As regras não restringem a aprovação ao administrador.');
exigir(regras.includes("resource.data.status == 'publicado' || administrador()"), 'As regras não limitam a leitura pública a conteúdo aprovado.');

console.log('Validação aprovada: navegação social, publicações pendentes, comentários pendentes e moderação administrativa estão coerentes.');
