const crypto = require("node:crypto");

const MAX_TEXT_LENGTH = 500;
const MAX_AUTHOR_LENGTH = 120;
const MAX_IMAGE_URL_LENGTH = 2048;
const RENDER_SECONDS = 8;
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
    .replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/g, "") // Remove caracteres não-latinos/emojis que causam 'tofu'
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

    const { Sandbox } = await import("@vercel/sandbox");
    const { put } = await import("@vercel/blob");
    const width = 1080;
    const height = formato === "feed" ? 1080 : 1920;
    const quoteSize = formato === "feed" ? 58 : 68;
    const authorSize = formato === "feed" ? 40 : 46;
    const quoteText = wrapText(texto, formato === "feed" ? 27 : 31, formato === "feed" ? 6 : 8);
    const authorText = wrapText(autor, 28, 2);

    sandbox = await Sandbox.create({
      name: `frases-video-${crypto.randomUUID()}`,
      source: { type: "snapshot", snapshotId },
      resources: { vcpus: 2 },
      timeout: 4 * 60 * 1000,
      persistent: false,
      networkPolicy: "allow-all",
    });
    await sandbox.writeFiles([
      { path: "/tmp/quote.txt", content: Buffer.from(quoteText, "utf8") },
      { path: "/tmp/author.txt", content: Buffer.from(authorText, "utf8") },
    ]);
    await runCommand(sandbox, "curl", ["-L", "--fail", "--max-time", "30", "--connect-timeout", "10", "-o", "/tmp/input.jpg", imageUrl], "Download da imagem");

    const vf = [
      `scale=${Math.round(width * 1.08)}:${Math.round(height * 1.08)}:force_original_aspect_ratio=increase`,
      `crop=${Math.round(width * 1.08)}:${Math.round(height * 1.08)}`,
      `zoompan=z='min(zoom+0.00035,1.08)':d=${RENDER_SECONDS * FPS}:s=${width}x${height}:fps=${FPS}`,
      "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.43:t=fill",
      `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile=/tmp/quote.txt:fontcolor=white:fontsize=${quoteSize}:line_spacing=16:text_align=center:x=(w-text_w)/2:y=(h-text_h)/2-80:shadowcolor=black@0.65:shadowx=2:shadowy=2`,
      `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:textfile=/tmp/author.txt:fontcolor=white:fontsize=${authorSize}:line_spacing=10:text_align=center:x=(w-text_w)/2:y=(h*0.68):shadowcolor=black@0.65:shadowx=2:shadowy=2`,
      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Frases de Messias':fontcolor=white@0.9:fontsize=30:x=(w-text_w)/2:y=h-75:shadowcolor=black@0.6:shadowx=2:shadowy=2",
      "fade=t=in:st=0:d=0.5",
      `fade=t=out:st=${RENDER_SECONDS - 1}:d=1`,
    ].join(",");

    const ffmpegPath = String(process.env.FFMPEG_PATH || "/vercel/sandbox/ffmpeg");
    await runCommand(sandbox, ffmpegPath, [
      "-y", "-loop", "1", "-i", "/tmp/input.jpg", "-vf", vf,
      "-frames:v", String(RENDER_SECONDS * FPS), "-an", "-c:v", "libx264",
      "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", "/tmp/frases-de-messias.mp4",
    ], "Renderização FFmpeg");

    const video = await sandbox.readFileToBuffer({ path: "/tmp/frases-de-messias.mp4" });
    const blob = await put(`videos/${Date.now()}-${formato}.mp4`, video, {
      access: "public",
      addRandomSuffix: true,
      contentType: "video/mp4",
      cacheControlMaxAge: 3600,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    sendJson(res, 200, {
      ok: true,
      url: blob.url,
      formato,
      filename: `frases-de-messias-${formato}.mp4`,
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
