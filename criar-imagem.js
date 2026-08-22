// Direção visual: Aurora Editorial — controles discretos atualizam uma prévia editorial de forma imediata.
const MODELOS = {
  "bom-dia": {
    categoria: "Bom Dia",
    frase: "Que a luz de hoje encontre o seu coração.",
    assinatura: "Uma mensagem para compartilhar",
    imagem: "imagens/categorias/bom-dia.png",
    corTexto: "#493016",
    corSelo: "#a65f12",
    sobreposicao: ["rgba(255,248,225,.98)", "rgba(255,238,184,.72)", "rgba(90,58,26,.2)"]
  },
  fe: {
    categoria: "Fé",
    frase: "A fé ilumina caminhos que os olhos ainda não veem.",
    assinatura: "Uma mensagem para compartilhar",
    imagem: "imagens/categorias/fe.png",
    corTexto: "#fffdf7",
    corSelo: "#e7ad56",
    sobreposicao: ["rgba(12,32,60,.99)", "rgba(12,32,60,.9)", "rgba(12,32,60,.1)"]
  }
};

const modeloInicial = "bom-dia";
let modeloAtual = modeloInicial;
let imagemDoModelo = null;

const quadroPrevia = document.getElementById("quadroPrevia");
const textoImagem = document.getElementById("textoImagem");
const assinaturaImagem = document.getElementById("assinaturaImagem");
const frasePrevia = document.getElementById("frasePrevia");
const assinaturaPrevia = document.getElementById("assinaturaPrevia");
const categoriaPrevia = document.getElementById("categoriaPrevia");
const contadorCaracteres = document.getElementById("contadorCaracteres");
const statusCriador = document.getElementById("statusCriador");
const botaoBaixar = document.getElementById("baixarImagem");

function textoSeguro(valor, limite) {
  return String(valor || "").replace(/\s+/g, " ").trim().slice(0, limite);
}

function atualizarContador() {
  contadorCaracteres.textContent = `${textoImagem.value.length}/180`;
}

function atualizarPrevia() {
  const frase = textoSeguro(textoImagem.value, 180) || MODELOS[modeloAtual].frase;
  const assinatura = textoSeguro(assinaturaImagem.value, 48) || "Frases de Messias";
  quadroPrevia.dataset.comprimento = frase.length > 110 ? "longo" : frase.length > 62 ? "medio" : "curto";
  frasePrevia.textContent = frase;
  assinaturaPrevia.textContent = assinatura;
  atualizarContador();
}

function selecionarModelo(modelo) {
  if (!MODELOS[modelo]) return;
  modeloAtual = modelo;
  const dados = MODELOS[modelo];
  quadroPrevia.dataset.modelo = modelo;
  categoriaPrevia.textContent = dados.categoria;
  textoImagem.value = dados.frase;
  assinaturaImagem.value = dados.assinatura;
  document.querySelectorAll(".opcao-modelo").forEach(botao => {
    const ativo = botao.dataset.modelo === modelo;
    botao.classList.toggle("ativo", ativo);
    botao.setAttribute("aria-pressed", String(ativo));
  });
  statusCriador.textContent = `Modelo ${dados.categoria} selecionado.`;
  atualizarPrevia();
}

function quebrarLinhas(contexto, texto, larguraMaxima) {
  const palavras = texto.split(" ");
  const linhas = [];
  let linha = "";
  palavras.forEach(palavra => {
    const tentativa = linha ? `${linha} ${palavra}` : palavra;
    if (contexto.measureText(tentativa).width > larguraMaxima && linha) {
      linhas.push(linha);
      linha = palavra;
    } else {
      linha = tentativa;
    }
  });
  if (linha) linhas.push(linha);
  return linhas;
}

function desenharImagemCobrindo(contexto, imagem, largura, altura) {
  const escala = Math.max(largura / imagem.naturalWidth, altura / imagem.naturalHeight);
  const larguraRenderizada = imagem.naturalWidth * escala;
  const alturaRenderizada = imagem.naturalHeight * escala;
  contexto.drawImage(imagem, (largura - larguraRenderizada) / 2, (altura - alturaRenderizada) / 2, larguraRenderizada, alturaRenderizada);
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.decoding = "async";
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("Não foi possível carregar o fundo do modelo."));
    imagem.src = url;
  });
}

async function criarDownload() {
  const dados = MODELOS[modeloAtual];
  const frase = textoSeguro(textoImagem.value, 180) || dados.frase;
  const assinatura = textoSeguro(assinaturaImagem.value, 48) || "Frases de Messias";
  const canvas = document.createElement("canvas");
  const contexto = canvas.getContext("2d");
  canvas.width = 1200;
  canvas.height = 630;

  botaoBaixar.disabled = true;
  botaoBaixar.textContent = "Preparando imagem...";
  statusCriador.textContent = "Gerando seu arquivo em 1200 × 630 px...";

  try {
    imagemDoModelo = await carregarImagem(dados.imagem);
    desenharImagemCobrindo(contexto, imagemDoModelo, canvas.width, canvas.height);
    const gradiente = contexto.createLinearGradient(0, 0, canvas.width, 0);
    gradiente.addColorStop(0, dados.sobreposicao[0]);
    gradiente.addColorStop(.52, dados.sobreposicao[1]);
    gradiente.addColorStop(1, dados.sobreposicao[2]);
    contexto.fillStyle = gradiente;
    contexto.fillRect(0, 0, canvas.width, canvas.height);

    contexto.fillStyle = dados.corTexto;
    contexto.font = "700 30px Georgia";
    contexto.fillText("☼  Frases de Messias", 82, 90);
    contexto.fillStyle = dados.corSelo;
    contexto.font = "800 18px Arial";
    contexto.fillText(dados.categoria.toUpperCase(), 84, 170);

    let tamanhoFonte = modeloAtual === "fe" ? 69 : 74;
    let linhas = [];
    do {
      contexto.font = `italic 600 ${tamanhoFonte}px Georgia`;
      linhas = quebrarLinhas(contexto, frase, 650);
      tamanhoFonte -= 2;
    } while ((linhas.length > 4 || linhas.some(linha => contexto.measureText(linha).width > 650)) && tamanhoFonte > 43);
    contexto.font = `italic 600 ${Math.max(tamanhoFonte, 43)}px Georgia`;
    const alturaLinha = Math.max(tamanhoFonte, 43) * 1.08;
    const alturaBloco = linhas.length * alturaLinha;
    let y = 320 - alturaBloco / 2;
    linhas.forEach(linha => { contexto.fillText(linha, 82, y); y += alturaLinha; });

    contexto.globalAlpha = .62;
    contexto.fillRect(84, Math.min(y + 14, 510), 115, 3);
    contexto.globalAlpha = .82;
    contexto.font = "700 18px Arial";
    contexto.fillText(assinatura, 84, Math.min(y + 56, 562));
    contexto.globalAlpha = 1;

    const link = document.createElement("a");
    link.download = `frases-de-messias-${modeloAtual}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    link.remove();
    statusCriador.textContent = "Imagem pronta. O download foi iniciado.";
  } catch (erro) {
    console.error(erro);
    statusCriador.textContent = "Não foi possível gerar a imagem agora. Tente novamente.";
  } finally {
    botaoBaixar.disabled = false;
    botaoBaixar.innerHTML = '<span aria-hidden="true">↓</span> Baixar imagem';
  }
}

document.querySelectorAll(".opcao-modelo").forEach(botao => {
  botao.addEventListener("click", () => selecionarModelo(botao.dataset.modelo));
});
textoImagem.addEventListener("input", atualizarPrevia);
assinaturaImagem.addEventListener("input", atualizarPrevia);
botaoBaixar.addEventListener("click", criarDownload);
document.getElementById("restaurarModelo").addEventListener("click", () => selecionarModelo(modeloAtual));

document.getElementById("temaBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  document.getElementById("temaBtn").textContent = document.body.classList.contains("dark") ? "☀️ Modo Claro" : "🌙 Modo Escuro";
});

selecionarModelo(modeloInicial);
