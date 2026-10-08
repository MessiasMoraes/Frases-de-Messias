const CONFIG = {
  story: { width: 540, height: 960, label: "1080 × 1920" },
  feed: { width: 540, height: 540, label: "1080 × 1080" }
};
const TEMPLATES = {
  aurora: { colors: ["#0d54c9", "#d59b54"], overlay: "rgba(7,25,69,.28)", accent: "#ffe2a2" },
  noite: { colors: ["#071126", "#244d86"], overlay: "rgba(3,8,22,.52)", accent: "#b9d4ff" },
  dourado: { colors: ["#7b3f18", "#e7ad56"], overlay: "rgba(45,18,5,.34)", accent: "#fff0bd" }
};
const DEFAULT_IMAGE = "imagens/categorias/bom-dia.png";

const canvas = document.getElementById("videoCanvas");
const context = canvas.getContext("2d");
const frase = document.getElementById("videoFrase");
const autor = document.getElementById("videoAutor");
const fundoInput = document.getElementById("videoFundo");
const musicaInput = document.getElementById("videoMusica");
const status = document.getElementById("videoStatus");
const exportar = document.getElementById("exportarVideo");
const reproduzir = document.getElementById("reproduzirVideo");
const duracao = document.getElementById("videoDuracao");
const animacao = document.getElementById("videoAnimacao");
const contador = document.getElementById("videoContador");
const duracaoValor = document.getElementById("duracaoValor");
const dimensao = document.getElementById("videoDimensao");

let formato = "story";
let template = "aurora";
let fundo = null;
let fundoUrl = null;
let fundoVideo = null;
let musicaFile = null;
let musicaNome = "Sem música";
let animacaoAtual = "fade";
let previewStart = 0;
let previewFrame = 0;
let previewPlaying = false;

function textoLimpo(valor, limite) {
  return String(valor || "").replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, limite);
}

function wrapText(text, maxWidth, font) {
  context.font = font;
  const words = text.split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 8);
}

function drawCover(source, width, height, focus = .5) {
  if (!source || !source.width || !source.height) return;
  const scale = Math.max(width / source.width, height / source.height);
  const sw = source.width * scale;
  const sh = source.height * scale;
  const x = (width - sw) * focus;
  const y = (height - sh) / 2;
  context.drawImage(source, x, y, sw, sh);
}

function drawBackground(progress) {
  const cfg = CONFIG[formato];
  const style = TEMPLATES[template];
  context.clearRect(0, 0, cfg.width, cfg.height);
  context.fillStyle = style.colors[0];
  context.fillRect(0, 0, cfg.width, cfg.height);
  const source = fundoVideo && fundoVideo.readyState >= 2 ? fundoVideo : fundo;
  if (source) {
    const zoom = animacaoAtual === "zoom" ? 1 + progress * .08 : 1;
    context.save();
    context.translate(cfg.width / 2, cfg.height / 2);
    context.scale(zoom, zoom);
    context.translate(-cfg.width / 2, -cfg.height / 2);
    drawCover(source, cfg.width, cfg.height, .5);
    context.restore();
  }
  const gradient = context.createLinearGradient(0, 0, cfg.width, cfg.height);
  gradient.addColorStop(0, style.colors[0] + "e6");
  gradient.addColorStop(.55, style.colors[1] + "80");
  gradient.addColorStop(1, "#00000055");
  context.fillStyle = gradient;
  context.fillRect(0, 0, cfg.width, cfg.height);
  context.fillStyle = style.overlay;
  context.fillRect(0, 0, cfg.width, cfg.height);
}

function drawFrame(progress = 0) {
  const cfg = CONFIG[formato];
  const style = TEMPLATES[template];
  drawBackground(progress);
  const quote = textoLimpo(frase.value, 220) || "Uma nova inspiração para o seu dia.";
  const signature = textoLimpo(autor.value, 80) || "— Messias";
  const alpha = animacaoAtual === "fade" ? Math.min(1, progress * 4 + .08) : 1;
  const movement = animacaoAtual === "static" ? 0 : (1 - alpha) * 22;
  context.save();
  context.globalAlpha = alpha;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = style.accent;
  context.font = `800 ${formato === "feed" ? 17 : 18}px Manrope, Arial`;
  context.fillText("✦  FRASES DE MESSIAS", cfg.width / 2, cfg.height * .13 - movement);
  const quoteSize = formato === "feed" ? 32 : 38;
  const quoteFont = `italic 700 ${quoteSize}px Georgia, serif`;
  const lines = wrapText(quote, cfg.width * .78, quoteFont);
  context.font = quoteFont;
  context.fillStyle = "#fffdf7";
  const lineHeight = quoteSize * 1.22;
  const quoteY = cfg.height * .48 - ((lines.length - 1) * lineHeight) / 2 - movement;
  lines.forEach((line, index) => context.fillText(line, cfg.width / 2, quoteY + index * lineHeight));
  context.fillStyle = style.accent;
  context.fillRect(cfg.width * .39, quoteY + lines.length * lineHeight * .65, cfg.width * .22, 3);
  context.font = `600 ${formato === "feed" ? 20 : 23}px Manrope, Arial`;
  context.fillStyle = "#ffffffee";
  context.fillText(signature, cfg.width / 2, quoteY + lines.length * lineHeight * .65 + 34);
  context.restore();
  if (alpha < 1) {
    context.fillStyle = `rgba(7,17,38,${1 - alpha})`;
    context.fillRect(0, 0, cfg.width, cfg.height);
  }
}

function atualizarPrevia() {
  contador.textContent = `${frase.value.length}/220`;
  duracaoValor.textContent = `${duracao.value} s`;
  dimensao.textContent = CONFIG[formato].label;
  canvas.width = CONFIG[formato].width;
  canvas.height = CONFIG[formato].height;
  canvas.style.aspectRatio = `${canvas.width}/${canvas.height}`;
  drawFrame(previewPlaying ? Math.min(1, (performance.now() - previewStart) / 1000 / Number(duracao.value)) : .4);
}

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("is-error", error);
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function carregarFundo(file) {
  if (fundoUrl) URL.revokeObjectURL(fundoUrl);
  fundoUrl = URL.createObjectURL(file);
  document.getElementById("videoFundoNome").textContent = file.name;
  if (file.type.startsWith("video/")) {
    fundo = null;
    fundoVideo = document.createElement("video");
    fundoVideo.src = fundoUrl;
    fundoVideo.muted = true;
    fundoVideo.loop = true;
    fundoVideo.playsInline = true;
    await fundoVideo.play().catch(() => {});
    fundoVideo.addEventListener("loadeddata", atualizarPrevia, { once: true });
  } else {
    fundoVideo = null;
    fundo = await carregarImagem(fundoUrl);
  }
  setStatus("Fundo carregado somente neste aparelho.");
  atualizarPrevia();
}

function escolherFormato(button) {
  formato = button.dataset.format;
  document.querySelectorAll("[data-format]").forEach((item) => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  atualizarPrevia();
}
function escolherTemplate(button) {
  template = button.dataset.template;
  document.querySelectorAll("[data-template]").forEach((item) => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  atualizarPrevia();
}

function escolherMime() {
  const opcoes = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return opcoes.find((tipo) => MediaRecorder.isTypeSupported(tipo)) || "";
}

async function exportarVideo() {
  if (!window.MediaRecorder || !canvas.captureStream) {
    setStatus("Seu navegador não oferece exportação de vídeo local. Tente Chrome ou Safari atualizado.", true);
    return;
  }
  const seconds = Number(duracao.value);
  const mime = escolherMime();
  if (!mime) { setStatus("Este navegador não encontrou um formato de vídeo compatível.", true); return; }
  exportar.disabled = true;
  reproduzir.disabled = true;
  setStatus("Renderizando seu vídeo no aparelho...");
  let audioContext;
  let audioElement;
  try {
    if (fundoVideo) { fundoVideo.currentTime = 0; await fundoVideo.play().catch(() => {}); }
    const videoStream = canvas.captureStream(30);
    let stream = videoStream;
    if (musicaFile) {
      audioContext = new AudioContext();
      audioElement = new Audio(URL.createObjectURL(musicaFile));
      audioElement.loop = true;
      audioElement.crossOrigin = "anonymous";
      const source = audioContext.createMediaElementSource(audioElement);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioContext.destination);
      stream = new MediaStream([...videoStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
      await audioContext.resume();
      await audioElement.play();
    }
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
    const done = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
      recorder.onerror = () => reject(new Error("Falha no gravador local."));
      recorder.onstop = resolve;
    });
    const started = performance.now();
    const draw = () => {
      const elapsed = (performance.now() - started) / 1000;
      drawFrame(Math.min(1, elapsed / seconds));
      if (elapsed < seconds) requestAnimationFrame(draw);
    };
    recorder.start(200);
    draw();
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 250));
    if (recorder.state !== "inactive") recorder.stop();
    await done;
    const blob = new Blob(chunks, { type: mime });
    const extension = mime.startsWith("video/mp4") ? "mp4" : "webm";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `frases-de-messias-${formato}-${Date.now()}.${extension}`;
    link.click();
    setStatus(`Vídeo ${extension.toUpperCase()} pronto. O download foi iniciado.`);
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  } catch (error) {
    console.error(error);
    setStatus("Não foi possível exportar agora. Verifique se o navegador permite áudio e vídeo.", true);
  } finally {
    audioElement?.pause();
    audioContext?.close();
    exportar.disabled = false;
    reproduzir.disabled = false;
    atualizarPrevia();
  }
}

function alternarPreview() {
  if (previewPlaying) {
    previewPlaying = false;
    cancelAnimationFrame(previewFrame);
    reproduzir.textContent = "▶ Reproduzir";
    atualizarPrevia();
    return;
  }
  previewPlaying = true;
  previewStart = performance.now();
  reproduzir.textContent = "■ Parar prévia";
  const loop = () => {
    const progress = (performance.now() - previewStart) / 1000 / Number(duracao.value);
    if (progress >= 1 || !previewPlaying) {
      previewPlaying = false;
      reproduzir.textContent = "▶ Reproduzir";
      drawFrame(.4);
      return;
    }
    drawFrame(progress);
    previewFrame = requestAnimationFrame(loop);
  };
  loop();
}

document.querySelectorAll("[data-format]").forEach((button) => button.addEventListener("click", () => escolherFormato(button)));
document.querySelectorAll("[data-template]").forEach((button) => button.addEventListener("click", () => escolherTemplate(button)));
[frase, autor, duracao].forEach((element) => element.addEventListener("input", atualizarPrevia));
animacao.addEventListener("change", () => { animacaoAtual = animacao.value; atualizarPrevia(); });
fundoInput.addEventListener("change", () => fundoInput.files[0] && carregarFundo(fundoInput.files[0]));
musicaInput.addEventListener("change", () => { musicaFile = musicaInput.files[0] || null; musicaNome = musicaFile ? musicaFile.name : "Sem música"; document.getElementById("videoMusicaNome").textContent = musicaNome; setStatus(musicaFile ? "Música pronta para a exportação local." : "Música removida."); });
reproduzir.addEventListener("click", alternarPreview);
exportar.addEventListener("click", exportarVideo);
document.getElementById("temaBtn")?.addEventListener("click", () => { document.body.classList.toggle("dark"); document.getElementById("temaBtn").textContent = document.body.classList.contains("dark") ? "☀️ Modo Claro" : "🌙 Modo Escuro"; });

carregarImagem(DEFAULT_IMAGE).then((image) => { fundo = image; atualizarPrevia(); }).catch(() => { atualizarPrevia(); setStatus("Escolha uma imagem ou vídeo para personalizar o fundo."); });
atualizarPrevia();
