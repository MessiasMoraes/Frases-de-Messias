const crypto = require("node:crypto");

const MAX_TEXT_LENGTH = 500;
const MAX_AUTHOR_LENGTH = 120;
const MAX_IMAGE_URL_LENGTH = 2048;
const RENDER_SECONDS = 15;
const FPS = 30;
const rateLimit = new Map();

module.exports.config = { maxDuration: 300 };

function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}

function checkRateLimit(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 10;
  const previous = rateLimit.get(ip) || { startedAt: now, count: 0 };
  if (now - previous.startedAt >= windowMs) {
    rateLimit.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  if (previous.count >= limit) return false;
  previous.count += 1;
  rateLimit.set(ip, previous);
  return true;
}

function normalizeText(value, fallback) {
  return String(value ?? fallback)
    .replace(/[\r\v\f\x00-\x1F\x7F-\x9F\u00AD\u200B-\u200F\u202A-\u202E]/g, "") // Remove CR, controles e invisíveis
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "") // Apenas ASCII e Latin-1
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text, maxChars, maxLines) {
  const words = text.replace(/\s+/g, " ").split(" ").filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines.join("\n");
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, Math.max(1, maxChars - 3)).trim()}...`;
  return kept.join("\n");
}

function validateImageUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error("A imagem precisa usar uma URL HTTPS.");
  return parsed.toString();
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function runCommand(sandbox, cmd, args, label) {
  const result = await sandbox.runCommand({ cmd, args });
  if (result.exitCode !== 0) {
    const errorText = (await result.stderr()).slice(-1200);
    throw new Error(`${label} falhou: ${errorText || `código ${result.exitCode}`}`);
  }
  return result;
}

module.exports = async function renderVideo(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type")
      .end();
    return;
  }
  if (req.method === "GET") {
    sendJson(res, 200, { ok: true, message: "Endpoint de renderização de vídeo online. Envie um POST com { imageUrl, texto, autor, formato }." });
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    sendJson(res, 405, { error: "Método não permitido. Use POST para gerar o vídeo." });
    return;
  }
  if (!checkRateLimit(req)) {
    sendJson(res, 429, { error: "Limite temporário atingido. Tente novamente em alguns minutos." });
    return;
  }

  let sandbox;
  try {
    const body = await parseBody(req);
    const formato = body.formato === "feed" ? "feed" : "story";
    const texto = normalizeText(body.texto, "Uma nova inspiração para o seu dia.").slice(0, MAX_TEXT_LENGTH);
    const autor = normalizeText(body.autor, "— Messias").slice(0, MAX_AUTHOR_LENGTH);
    const imageUrl = validateImageUrl(String(body.imageUrl || "").slice(0, MAX_IMAGE_URL_LENGTH));
    if (!texto) throw new Error("A frase não pode ficar vazia.");

    const snapshotId = String(process.env.SANDBOX_SNAPSHOT_ID || "").trim();
    if (!snapshotId) {
      sendJson(res, 503, {
        ok: false,
        error: "Configuração pendente: adicione SANDBOX_SNAPSHOT_ID nas variáveis da Vercel após preparar o snapshot com FFmpeg.",
      });
      return;
    }

    const { Sandbox } = require("@vercel/sandbox");
    const { put } = require("@vercel/blob");
    const { selecionarTrilha, caminhoDaTrilha } = require("./trilhas.js");
    const width = 1080;
    const height = formato === "feed" ? 1080 : 1920;
    const quoteSize = formato === "feed" ? 48 : 56;
    const authorSize = formato === "feed" ? 29 : 34;
    const quoteText = wrapText(texto, formato === "feed" ? 27 : 31, formato === "feed" ? 6 : 8);
    const authorText = wrapText(autor, 28, 2);
    const trilha = selecionarTrilha({ quote: quoteText, author: authorText, category: body.category });
    const arquivoTrilha = caminhoDaTrilha(trilha.arquivo);

    sandbox = await Sandbox.create({
      name: `frases-video-${crypto.randomUUID()}`,
      source: { type: "snapshot", snapshotId },
      resources: { vcpus: 2 },
      timeout: 4 * 60 * 1000,
      persistent: false,
      networkPolicy: "allow-all",
    });
    // Garante que o arquivo use apenas LF (\n) e nenhum CR (\r) que causa as caixinhas no FFmpeg
    const cleanQuote = quoteText.replace(/\r/g, "");
    const cleanAuthor = authorText.replace(/\r/g, "");
    await sandbox.writeFiles([
      { path: "/tmp/quote.txt", content: Buffer.from(cleanQuote, "utf8") },
      { path: "/tmp/author.txt", content: Buffer.from(cleanAuthor, "utf8") },
    ]);
    await runCommand(sandbox, "curl", ["-L", "--fail", "--max-time", "30", "--connect-timeout", "10", "-o", "/tmp/input.jpg", imageUrl], "Download da imagem");
    await sandbox.writeFiles([{ path: "/tmp/trilha.mp3", content: await require("node:fs").promises.readFile(arquivoTrilha) }]);

    const ffmpegPath = String(process.env.FFMPEG_PATH || "/vercel/sandbox/ffmpeg");
    const fontDir = String(process.env.FFMPEG_FONT_DIR || "/vercel/sandbox/fonts");
    const vf = [
      `scale=${Math.round(width * 1.08)}:${Math.round(height * 1.08)}:force_original_aspect_ratio=increase`,
      `crop=${Math.round(width * 1.08)}:${Math.round(height * 1.08)}`,
      `zoompan=z='min(zoom+0.00035,1.08)':d=${RENDER_SECONDS * FPS}:s=${width}x${height}:fps=${FPS}`,
      "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.43:t=fill",
      `drawtext=fontfile=${fontDir}/LiberationSans-Bold.ttf:textfile=/tmp/quote.txt:fontcolor=white:fontsize=${quoteSize}:line_spacing=16:text_align=center:x=(w-text_w)/2:y=(h-text_h)/2-80:shadowcolor=black@0.65:shadowx=2:shadowy=2`,
      `drawtext=fontfile=${fontDir}/LiberationSans-Regular.ttf:textfile=/tmp/author.txt:fontcolor=white:fontsize=${authorSize}:line_spacing=10:text_align=center:x=(w-text_w)/2:y=(h*0.68):shadowcolor=black@0.65:shadowx=2:shadowy=2`,
      `drawtext=fontfile=${fontDir}/LiberationSans-Regular.ttf:text='Frases de Messias':fontcolor=white@0.9:fontsize=30:x=(w-text_w)/2:y=h-75:shadowcolor=black@0.6:shadowx=2:shadowy=2`,
      // O primeiro quadro é usado como miniatura por muitos players Android; ele precisa manter a capa visível.
      `fade=t=out:st=${RENDER_SECONDS - 1}:d=1`,
    ].join(",");
    const audioFilter = `atrim=duration=${RENDER_SECONDS},volume=${trilha.volumeFundoDb}dB,afade=t=in:st=0:d=0.35,afade=t=out:st=${RENDER_SECONDS - 1}:d=1[a]`;
    await runCommand(sandbox, ffmpegPath, [
      "-y", "-loop", "1", "-i", "/tmp/input.jpg", "-stream_loop", "-1", "-i", "/tmp/trilha.mp3",
      "-filter_complex", `[0:v]${vf}[v];[1:a]${audioFilter}`,
      "-map", "[v]", "-map", "[a]", "-t", String(RENDER_SECONDS),
      "-frames:v", String(RENDER_SECONDS * FPS), "-c:v", "libx264", "-c:a", "aac", "-b:a", "128k",
      "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
      "-g", String(FPS), "-keyint_min", String(FPS), "-sc_threshold", "0",
      "-movflags", "+faststart", "-shortest", "/tmp/frases-de-messias.mp4",
    ], "Renderização FFmpeg");

    const video = await sandbox.readFileToBuffer({ path: "/tmp/frases-de-messias.mp4" });
    const identificadorArquivo = Date.now();
    const nomeArquivo = `frases-de-messias-${formato}-${identificadorArquivo}.mp4`;
    const blob = await put(`videos/${identificadorArquivo}-${formato}.mp4`, video, {
      access: "public",
      addRandomSuffix: true,
      contentType: "video/mp4",
      cacheControlMaxAge: 3600,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    sendJson(res, 200, {
      ok: true,
      // A URL padrão permite a prévia no player; downloadUrl força attachment no Blob.
      url: blob.url,
      downloadUrl: blob.downloadUrl || `${blob.url}?download=1`,
      formato,
      filename: nomeArquivo,
      trilha: { id: trilha.id, rotulo: trilha.rotulo },
    });
  } catch (error) {
    console.error("[render-video]", error);
    const sdkError = error && typeof error === "object" ? error : null;
    const serializeDetail = (value) => {
      if (typeof value === "string" && value.trim()) return value;
      if (value && typeof value === "object") {
        try { return JSON.stringify(value); } catch { return ""; }
      }
      return "";
    };
    const details = [
      serializeDetail(sdkError?.json?.error),
      serializeDetail(sdkError?.json?.message),
      serializeDetail(sdkError?.json),
      serializeDetail(sdkError?.text),
    ].find((value) => value);
    const message = String(details || (error instanceof Error ? error.message : "Falha desconhecida.")).slice(0, 1200);
    sendJson(res, 500, {
      ok: false,
      error: message,
    });
  } finally {
    if (sandbox) {
      try { await sandbox.delete(); }
      catch (cleanupError) { console.warn("[render-video] Falha ao limpar Sandbox", cleanupError); }
    }
  }
};
