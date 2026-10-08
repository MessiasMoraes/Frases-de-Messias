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
const TRANSITION_TIME = .18;

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
const cenasEl = document.getElementById("videoCenas");
const novaCenaBtn = document.getElementById("novaCena");
const transicao = document.getElementById("videoTransicao");
const formatoExportacao = document.getElementById("videoFormatoExportacao");
const formatoStatus = document.getElementById("videoFormatoStatus");

let formato = "story";
let template = "aurora";
let fundo = null;
let fundoUrl = null;
let fundoVideo = null;
let musicaFile = null;
let animacaoAtual = "fade";
let transitionAtual = "crossfade";
let previewStart = 0;
let previewFrame = 0;
let previewPlaying = false;
let nextSceneId = 2;
let cenas = [{ id: 1, quote: "", author: "— Messias" }];
let ffmpegInstance = null;
let ffmpegLoading = null;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function easeOutCubic(value) {
  const t = clamp(value);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(value) {
  const t = clamp(value);
  return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

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

function drawBackground(progress, clear = true) {
  const cfg = CONFIG[formato];
  const style = TEMPLATES[template];
  if (clear) context.clearRect(0, 0, cfg.width, cfg.height);
  context.fillStyle = style.colors[0];
  context.fillRect(0, 0, cfg.width, cfg.height);
  const source = fundoVideo && fundoVideo.readyState >= 2 ? fundoVideo : fundo;
  if (source) {
    const zoom = 1 + clamp(progress) * .08;
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

function sceneText(scene) {
  return textoLimpo(scene?.quote, 220) || "Uma nova inspiração para o seu dia.";
}

function drawText(scene, progress, opacity = 1) {
  const cfg = CONFIG[formato];
  const style = TEMPLATES[template];
  const quote = sceneText(scene);
  const signature = textoLimpo(scene?.author, 80) || "— Messias";
  const p = clamp(progress);
  const entrance = easeOutCubic(Math.min(1, p * 1.8));
  let alpha = opacity;
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  let filter = "none";
  let visibleQuote = quote;

  if (animacaoAtual === "fade") alpha *= Math.min(1, p * 4 + .08);
  if (animacaoAtual === "slide-up") { alpha *= Math.min(1, p * 3); offsetY = (1 - entrance) * 42; }
  if (animacaoAtual === "slide-left") { alpha *= Math.min(1, p * 3); offsetX = -(1 - entrance) * 56; }
  if (animacaoAtual === "typewriter") visibleQuote = quote.slice(0, Math.max(1, Math.ceil(quote.length * Math.min(1, p * 1.55))));
  if (animacaoAtual === "word-by-word") {
    const words = quote.split(" ");
    visibleQuote = words.slice(0, Math.max(1, Math.ceil(words.length * Math.min(1, p * 1.55)))).join(" ");
  }
  if (animacaoAtual === "blur-in") { alpha *= Math.min(1, p * 2.8); filter = `blur(${Math.max(0, (1 - entrance) * 7)}px)`; }
  if (animacaoAtual === "bounce") { alpha *= Math.min(1, p * 3); offsetY = Math.sin(entrance * Math.PI * 1.25) * (1 - entrance) * -18; scale = .94 + entrance * .06; }
  if (animacaoAtual === "static") { alpha = opacity; }

  const quoteSize = formato === "feed" ? 32 : 38;
  const quoteFont = `italic 700 ${quoteSize}px Georgia, serif`;
  const lines = wrapText(visibleQuote, cfg.width * .78, quoteFont);
  const lineHeight = quoteSize * 1.22;
  const quoteY = cfg.height * .48 - ((lines.length - 1) * lineHeight) / 2;

  context.save();
  context.globalAlpha = clamp(alpha);
  context.filter = filter;
  context.translate(cfg.width / 2 + offsetX, cfg.height / 2 + offsetY);
  context.scale(scale, scale);
  context.translate(-cfg.width / 2, -cfg.height / 2);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = style.accent;
  context.font = `800 ${formato === "feed" ? 17 : 18}px Manrope, Arial`;
  context.fillText("✦  FRASES DE MESSIAS", cfg.width / 2, cfg.height * .13);
  context.font = quoteFont;
  context.fillStyle = "#fffdf7";
  lines.forEach((line, index) => context.fillText(line, cfg.width / 2, quoteY + index * lineHeight));
  context.fillStyle = style.accent;
  context.fillRect(cfg.width * .39, quoteY + lines.length * lineHeight * .65, cfg.width * .22, 3);
  context.font = `600 ${formato === "feed" ? 20 : 23}px Manrope, Arial`;
  context.fillStyle = "#ffffffee";
  context.fillText(signature, cfg.width / 2, quoteY + lines.length * lineHeight * .65 + 34);
  context.restore();
}

function drawScene(scene, progress = 1, { clear = true, opacity = 1 } = {}) {
  drawBackground(progress, clear);
  drawText(scene, progress, opacity);
}

function drawTransition(current, next, progress) {
  const cfg = CONFIG[formato];
  const p = easeInOut(progress);
  const type = transitionAtual;
  if (type === "none") {
    drawScene(next, p);
    return;
  }
  if (type === "wipe") {
    drawScene(current, 1);
    context.save();
    context.beginPath();
    context.rect(0, 0, cfg.width * p, cfg.height);
    context.clip();
    drawScene(next, p, { clear: false });
    context.restore();
    return;
  }
  if (type === "slide") {
    context.clearRect(0, 0, cfg.width, cfg.height);
    context.save();
    context.translate(-cfg.width * p, 0);
    drawScene(current, 1, { clear: false });
    context.restore();
    context.save();
    context.translate(cfg.width * (1 - p), 0);
    drawScene(next, p, { clear: false });
    context.restore();
    return;
  }
  if (type === "zoom-transition") {
    drawScene(current, 1);
    context.save();
    context.globalAlpha = p;
    context.translate(cfg.width / 2, cfg.height / 2);
    context.scale(.86 + p * .14, .86 + p * .14);
    context.translate(-cfg.width / 2, -cfg.height / 2);
    drawScene(next, p, { clear: false });
    context.restore();
    return;
  }
  drawScene(current, 1, { opacity: 1 - p });
  drawScene(next, p, { clear: false, opacity: p });
  if (type === "flash") {
    context.fillStyle = `rgba(255,255,255,${Math.sin(p * Math.PI) * .7})`;
    context.fillRect(0, 0, cfg.width, cfg.height);
  }
}

function drawTimeline(progress = .4) {
  const p = clamp(progress);
  if (cenas.length === 1) {
    drawScene(cenas[0], p);
    return;
  }
  const position = p * cenas.length;
  const index = Math.min(cenas.length - 1, Math.floor(position));
  const local = position - index;
  if (index >= cenas.length - 1) {
    drawScene(cenas[cenas.length - 1], local);
    return;
  }
  const transitionStart = 1 - TRANSITION_TIME;
  if (local >= transitionStart) {
    drawTransition(cenas[index], cenas[index + 1], (local - transitionStart) / TRANSITION_TIME);
  } else {
    drawScene(cenas[index], local / transitionStart);
  }
}

function syncFirstScene() {
  cenas[0].quote = textoLimpo(frase.value, 220);
  cenas[0].author = textoLimpo(autor.value, 80) || "— Messias";
  const firstQuote = cenasEl?.querySelector('[data-scene-quote="0"]');
  const firstAuthor = cenasEl?.querySelector('[data-scene-author="0"]');
  if (firstQuote && document.activeElement !== firstQuote) firstQuote.value = cenas[0].quote;
  if (firstAuthor && document.activeElement !== firstAuthor) firstAuthor.value = cenas[0].author;
}

function renderCenas() {
  if (!cenasEl) return;
  cenasEl.replaceChildren();
  cenas.forEach((scene, index) => {
    const card = document.createElement("article");
    card.className = "video-scene-card";
    card.innerHTML = `<div class="video-scene-card-head"><strong>Cena ${index + 1}</strong>${cenas.length > 1 ? '<button type="button" class="video-remove-scene" aria-label="Remover cena">×</button>' : ""}</div><label>Frase<textarea data-scene-quote="${index}" rows="2" maxlength="220" placeholder="Digite a frase desta cena"></textarea></label><label>Autoria<input data-scene-author="${index}" type="text" maxlength="80" placeholder="— Messias"></label>`;
    card.querySelector(`[data-scene-quote="${index}"]`).value = scene.quote;
    card.querySelector(`[data-scene-author="${index}"]`).value = scene.author;
    card.querySelector(`[data-scene-quote="${index}"]`).addEventListener("input", (event) => { cenas[index].quote = textoLimpo(event.target.value, 220); atualizarPrevia(); });
    card.querySelector(`[data-scene-author="${index}"]`).addEventListener("input", (event) => { cenas[index].author = textoLimpo(event.target.value, 80); atualizarPrevia(); });
    card.querySelector(".video-remove-scene")?.addEventListener("click", () => { cenas.splice(index, 1); renderCenas(); atualizarPrevia(); });
    cenasEl.appendChild(card);
  });
}

function atualizarPrevia() {
  contador.textContent = `${frase.value.length}/220`;
  duracaoValor.textContent = `${duracao.value} s`;
  dimensao.textContent = CONFIG[formato].label;
  canvas.width = CONFIG[formato].width;
  canvas.height = CONFIG[formato].height;
  canvas.style.aspectRatio = `${canvas.width}/${canvas.height}`;
  syncFirstScene();
  drawTimeline(previewPlaying ? Math.min(1, (performance.now() - previewStart) / 1000 / Number(duracao.value)) : .4);
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

function escolherMime(preferido = "webm") {
  const mp4 = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1"];
  const webm = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  const opcoes = preferido === "mp4" ? [...mp4, ...webm] : [...webm, ...mp4];
  return opcoes.find((tipo) => window.MediaRecorder?.isTypeSupported(tipo)) || "";
}

function suportaMp4Nativo() {
  return Boolean(window.MediaRecorder && ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1"].some((tipo) => MediaRecorder.isTypeSupported(tipo)));
}

function atualizarFormatoExportacao() {
  if (!formatoStatus || !formatoExportacao) return;
  const mp4 = formatoExportacao.value === "mp4";
  const fallback = mp4 && !suportaMp4Nativo();
  formatoStatus.textContent = mp4
    ? (fallback ? "MP4 será convertido no navegador antes do download." : "MP4 nativo disponível neste navegador.")
    : "WebM é mais rápido e funciona como alternativa leve.";
  formatoExportacao.closest(".video-export-format")?.classList.toggle("is-fallback", fallback);
}

async function carregarConversorMp4() {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoading) return ffmpegLoading;
  ffmpegLoading = (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm"),
      import("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm")
    ]);
    const ffmpeg = new FFmpeg();
    const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpeg.load({
      classWorkerURL: new URL("./ffmpeg-worker.js", window.location.href).href,
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })().catch((error) => {
    ffmpegLoading = null;
    throw error;
  });
  return ffmpegLoading;
}

async function converterWebmParaMp4(webmBlob) {
  setStatus("Carregando conversor MP4 no navegador...", false);
  const ffmpeg = await carregarConversorMp4();
  const baseName = `frases-${Date.now()}`;
  const inputName = `${baseName}.webm`;
  const outputName = `${baseName}.mp4`;
  const { fetchFile } = await import("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm");
  const progresso = ({ progress }) => setStatus(`Convertendo para MP4... ${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`);
  ffmpeg.on("progress", progresso);
  try {
    await ffmpeg.writeFile(inputName, await fetchFile(webmBlob));
    await ffmpeg.exec(["-i", inputName, "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", outputName]);
    const data = await ffmpeg.readFile(outputName);
    return new Blob([data.buffer], { type: "video/mp4" });
  } finally {
    ffmpeg.off?.("progress", progresso);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}

function baixarBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function exportarVideo() {
  if (!window.MediaRecorder || !canvas.captureStream) {
    setStatus("Seu navegador não oferece exportação de vídeo local. Tente Chrome ou Safari atualizado.", true);
    return;
  }
  const seconds = Number(duracao.value);
  const solicitado = formatoExportacao?.value === "mp4" ? "mp4" : "webm";
  const mime = escolherMime(solicitado);
  if (!mime) { setStatus("Este navegador não encontrou um formato de vídeo compatível.", true); return; }
  exportar.disabled = true;
  reproduzir.disabled = true;
  setStatus(`Renderizando ${cenas.length} ${cenas.length === 1 ? "cena" : "cenas"} no aparelho...`);
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
      drawTimeline(Math.min(1, elapsed / seconds));
      if (elapsed < seconds) requestAnimationFrame(draw);
    };
    recorder.start(200);
    draw();
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 250));
    if (recorder.state !== "inactive") recorder.stop();
    await done;
    let blob = new Blob(chunks, { type: mime });
    let extensao = mime.startsWith("video/mp4") ? "mp4" : "webm";
    if (solicitado === "mp4" && extensao !== "mp4") {
      blob = await converterWebmParaMp4(blob);
      extensao = "mp4";
    }
    baixarBlob(blob, `frases-de-messias-${formato}-${Date.now()}.${extensao}`);
    setStatus(`Vídeo ${extensao.toUpperCase()} pronto. O download foi iniciado.`);
  } catch (error) {
    console.error(error);
    setStatus(solicitado === "mp4" ? "Não foi possível converter para MP4 neste navegador. Escolha WebM ou tente Chrome atualizado." : "Não foi possível exportar agora. Verifique se o navegador permite áudio e vídeo.", true);
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
      drawTimeline(.4);
      return;
    }
    drawTimeline(progress);
    previewFrame = requestAnimationFrame(loop);
  };
  loop();
}

document.querySelectorAll("[data-format]").forEach((button) => button.addEventListener("click", () => escolherFormato(button)));
document.querySelectorAll("[data-template]").forEach((button) => button.addEventListener("click", () => escolherTemplate(button)));
frase.addEventListener("input", () => { syncFirstScene(); atualizarPrevia(); });
autor.addEventListener("input", () => { syncFirstScene(); atualizarPrevia(); });
duracao.addEventListener("input", atualizarPrevia);
animacao.addEventListener("change", () => { animacaoAtual = animacao.value; atualizarPrevia(); });
transicao?.addEventListener("change", () => { transitionAtual = transicao.value; atualizarPrevia(); });
formatoExportacao?.addEventListener("change", atualizarFormatoExportacao);
novaCenaBtn?.addEventListener("click", () => { cenas.push({ id: nextSceneId++, quote: "", author: "— Messias" }); renderCenas(); atualizarPrevia(); setStatus("Nova cena adicionada à timeline."); });
fundoInput.addEventListener("change", () => fundoInput.files[0] && carregarFundo(fundoInput.files[0]));
musicaInput.addEventListener("change", () => { musicaFile = musicaInput.files[0] || null; document.getElementById("videoMusicaNome").textContent = musicaFile ? musicaFile.name : "Sem música"; setStatus(musicaFile ? "Música pronta para a exportação local." : "Música removida."); });
reproduzir.addEventListener("click", alternarPreview);
exportar.addEventListener("click", exportarVideo);
document.getElementById("temaBtn")?.addEventListener("click", () => { document.body.classList.toggle("dark"); document.getElementById("temaBtn").textContent = document.body.classList.contains("dark") ? "☀️ Modo Claro" : "🌙 Modo Escuro"; });

renderCenas();
atualizarFormatoExportacao();
carregarImagem(DEFAULT_IMAGE).then((image) => { fundo = image; atualizarPrevia(); }).catch(() => { atualizarPrevia(); setStatus("Escolha uma imagem ou vídeo para personalizar o fundo."); });
atualizarPrevia();
