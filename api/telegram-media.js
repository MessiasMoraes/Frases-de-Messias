const crypto = require('node:crypto');

const MAX_TEXT_LENGTH = 500;
const MAX_AUTHOR_LENGTH = 120;
const IMAGE_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const VIDEO_SECONDS = 15;
const FPS = 30;
const limitePorChat = new Map();

function responderJson(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function textoLimpo(valor, fallback = '') {
  return String(valor ?? fallback)
    .replace(/[\r\v\f\x00-\x1F\x7F-\x9F\u00AD\u200B-\u200F\u202A-\u202E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function quebrarTexto(texto, maxCaracteres, maxLinhas) {
  const palavras = texto.replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const linhas = [];
  let atual = '';

  for (const palavra of palavras) {
    const candidata = atual ? `${atual} ${palavra}` : palavra;
    if (!atual || candidata.length <= maxCaracteres) atual = candidata;
    else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length <= maxLinhas) return linhas.join('\n');

  const mantidas = linhas.slice(0, maxLinhas);
  mantidas[maxLinhas - 1] = `${mantidas[maxLinhas - 1].slice(0, Math.max(1, maxCaracteres - 3)).trim()}...`;
  return mantidas.join('\n');
}

function segredoValido(req) {
  const esperado = process.env.TELEGRAM_WEBHOOK_SECRET;
  const recebido = req.headers['x-telegram-bot-api-secret-token'];
  if (!esperado || typeof recebido !== 'string') return false;
  const esquerda = Buffer.from(esperado);
  const direita = Buffer.from(recebido);
  return esquerda.length === direita.length && crypto.timingSafeEqual(esquerda, direita);
}

async function lerCorpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let bruto = '';
  for await (const parte of req) bruto += parte;
  return bruto ? JSON.parse(bruto) : {};
}

function validarPedido(corpo) {
  const tipo = corpo.tipo === 'video' ? 'video' : corpo.tipo === 'imagem' ? 'imagem' : '';
  const chatId = corpo.chatId;
  const frase = corpo.frase || {};
  const texto = textoLimpo(frase.texto).slice(0, MAX_TEXT_LENGTH);
  const autor = textoLimpo(frase.autor, 'Messias').slice(0, MAX_AUTHOR_LENGTH) || 'Messias';
  const categoria = textoLimpo(frase.categoria, 'Inspiração').slice(0, 80) || 'Inspiração';
  const id = textoLimpo(frase.id, 'frase').slice(0, 100) || 'frase';

  if (!tipo) throw new Error('Tipo de mídia inválido.');
  if (typeof chatId !== 'number' && typeof chatId !== 'string') throw new Error('Destino do Telegram inválido.');
  if (!texto) throw new Error('A frase não foi informada.');
  return { tipo, chatId, frase: { texto, autor, categoria, id } };
}

function imagemDeFundo(frase) {
  const semente = `${frase.categoria}-${frase.id}`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 120);
  return `https://picsum.photos/seed/frases-de-messias-${semente}/1080/1920`;
}

function permitirUso(chatId, tipo) {
  const agora = Date.now();
  const janela = 60 * 60 * 1000;
  const limite = tipo === 'video' ? 2 : 10;
  const chave = `${tipo}:${chatId}`;
  const registro = limitePorChat.get(chave) || { inicio: agora, quantidade: 0 };

  if (agora - registro.inicio >= janela) {
    limitePorChat.set(chave, { inicio: agora, quantidade: 1 });
    return true;
  }
  if (registro.quantidade >= limite) return false;
  registro.quantidade += 1;
  limitePorChat.set(chave, registro);
  return true;
}

async function executar(sandbox, comando, argumentos, rotulo) {
  const resultado = await sandbox.runCommand({ cmd: comando, args: argumentos });
  if (resultado.exitCode !== 0) {
    const erro = (await resultado.stderr()).slice(-1200);
    throw new Error(`${rotulo} falhou: ${erro || `código ${resultado.exitCode}`}`);
  }
}

function filtroVisual({ largura, altura, texto, autor, formato }) {
  const fonteTexto = formato === 'feed' ? 58 : 68;
  const fonteAutor = formato === 'feed' ? 40 : 46;
  const fraseQuebrada = quebrarTexto(texto, formato === 'feed' ? 27 : 31, formato === 'feed' ? 6 : 8).replace(/\r/g, '');
  const autorQuebrado = quebrarTexto(`— ${autor}`, 28, 2).replace(/\r/g, '');

  const base = [
    `scale=${Math.round(largura * 1.08)}:${Math.round(altura * 1.08)}:force_original_aspect_ratio=increase`,
    `crop=${Math.round(largura * 1.08)}:${Math.round(altura * 1.08)}`
  ].join(',');
  const textoSobreposto = [
    'drawbox=x=0:y=0:w=iw:h=ih:color=black@0.50:t=fill',
    `drawtext=fontfile=${String(process.env.FFMPEG_FONT_DIR || '/vercel/sandbox/fonts')}/LiberationSans-Bold.ttf:textfile=/tmp/quote.txt:fontcolor=white:fontsize=${fonteTexto}:line_spacing=16:text_align=center:x=(w-text_w)/2:y=(h-text_h)/2-80:shadowcolor=black@0.65:shadowx=2:shadowy=2`,
    `drawtext=fontfile=${String(process.env.FFMPEG_FONT_DIR || '/vercel/sandbox/fonts')}/LiberationSans-Regular.ttf:textfile=/tmp/author.txt:fontcolor=white:fontsize=${fonteAutor}:line_spacing=10:text_align=center:x=(w-text_w)/2:y=(h*0.68):shadowcolor=black@0.65:shadowx=2:shadowy=2`,
    `drawtext=fontfile=${String(process.env.FFMPEG_FONT_DIR || '/vercel/sandbox/fonts')}/LiberationSans-Regular.ttf:text='Frases de Messias':fontcolor=white@0.9:fontsize=30:x=(w-text_w)/2:y=h-75:shadowcolor=black@0.6:shadowx=2:shadowy=2`
  ].join(',');

  return {
    fraseQuebrada,
    autorQuebrado,
    imagem: `${base},${textoSobreposto}`,
    video: `${base},zoompan=z='min(zoom+0.00035,1.08)':d=${VIDEO_SECONDS * FPS}:s=${largura}x${altura}:fps=${FPS},${textoSobreposto},fade=t=out:st=${VIDEO_SECONDS - 1}:d=1`
  };
}

async function renderizarPedido(pedido) {
  const snapshotId = String(process.env.SANDBOX_SNAPSHOT_ID || '').trim();
  if (!snapshotId) throw new Error('A configuração de vídeo ainda não está disponível.');

  const { Sandbox } = await import('@vercel/sandbox');
  const { put } = await import('@vercel/blob');
  const formato = 'story';
  const largura = IMAGE_WIDTH;
  const altura = STORY_HEIGHT;
  const imagem = imagemDeFundo(pedido.frase);
  const filtro = filtroVisual({
    largura,
    altura,
    texto: pedido.frase.texto,
    autor: pedido.frase.autor,
    formato
  });
  const ffmpeg = String(process.env.FFMPEG_PATH || '/vercel/sandbox/ffmpeg');
  let sandbox;

  try {
    sandbox = await Sandbox.create({
      name: `telegram-${pedido.tipo}-${crypto.randomUUID()}`,
      source: { type: 'snapshot', snapshotId },
      resources: { vcpus: 2 },
      timeout: 4 * 60 * 1000,
      persistent: false,
      networkPolicy: 'allow-all'
    });
    await sandbox.writeFiles([
      { path: '/tmp/quote.txt', content: Buffer.from(filtro.fraseQuebrada, 'utf8') },
      { path: '/tmp/author.txt', content: Buffer.from(filtro.autorQuebrado, 'utf8') }
    ]);
    await executar(sandbox, 'curl', ['-L', '--fail', '--max-time', '30', '--connect-timeout', '10', '-o', '/tmp/input.jpg', imagem], 'Download da imagem');

    const identificador = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    if (pedido.tipo === 'imagem') {
      await executar(sandbox, ffmpeg, [
        '-y', '-i', '/tmp/input.jpg', '-vf', filtro.imagem, '-frames:v', '1',
        '-q:v', '2', '-update', '1', '/tmp/frase.jpg'
      ], 'Renderização da imagem');
      const arquivo = await sandbox.readFileToBuffer({ path: '/tmp/frase.jpg' });
      const blob = await put(`telegram/imagens/${identificador}.jpg`, arquivo, {
        access: 'public', contentType: 'image/jpeg', cacheControlMaxAge: 3600
      });
      return { url: blob.url, tipo: 'imagem' };
    }

    await executar(sandbox, ffmpeg, [
      '-y', '-loop', '1', '-i', '/tmp/input.jpg', '-vf', filtro.video,
      '-frames:v', String(VIDEO_SECONDS * FPS), '-an', '-c:v', 'libx264',
      '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
      '-g', String(FPS), '-keyint_min', String(FPS), '-sc_threshold', '0',
      '-movflags', '+faststart', '/tmp/frase.mp4'
    ], 'Renderização do vídeo');
    const arquivo = await sandbox.readFileToBuffer({ path: '/tmp/frase.mp4' });
    const blob = await put(`telegram/videos/${identificador}.mp4`, arquivo, {
      access: 'public', contentType: 'video/mp4', cacheControlMaxAge: 3600
    });
    return { url: blob.url, tipo: 'video' };
  } finally {
    if (sandbox) {
      try { await sandbox.delete(); }
      catch (erro) { console.warn('[telegram-media] Não foi possível limpar o sandbox:', erro.message); }
    }
  }
}

async function telegram(metodo, dados) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN não configurado.');
  const resposta = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  const resultado = await resposta.json().catch(() => ({}));
  if (!resposta.ok || !resultado.ok) throw new Error(resultado.description || `Falha ao chamar ${metodo}.`);
  return resultado.result;
}

async function enviarLimite(chatId, tipo) {
  const rotulo = tipo === 'video' ? 'vídeos' : 'imagens';
  await telegram('sendMessage', {
    chat_id: chatId,
    text: `Você atingiu o limite temporário de ${rotulo}. Aguarde cerca de uma hora e tente novamente.`,
    disable_web_page_preview: true
  });
}

async function enviarFalha(chatId, tipo) {
  const rotulo = tipo === 'video' ? 'o vídeo' : 'a imagem';
  await telegram('sendMessage', {
    chat_id: chatId,
    text: `Não foi possível criar ${rotulo} agora. Por favor, tente novamente em alguns minutos.`,
    disable_web_page_preview: true
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return responderJson(res, 405, { error: 'Método não permitido.' });
  }
  if (!segredoValido(req)) return responderJson(res, 401, { error: 'Origem não autorizada.' });

  let pedido;
  try {
    pedido = validarPedido(await lerCorpo(req));
  } catch (erro) {
    return responderJson(res, 400, { error: erro.message || 'Pedido inválido.' });
  }

  if (!permitirUso(pedido.chatId, pedido.tipo)) {
    try { await enviarLimite(pedido.chatId, pedido.tipo); }
    catch (erro) { console.error('[telegram-media] Não foi possível avisar sobre o limite:', erro.message); }
    return responderJson(res, 200, { ok: true, limitado: true });
  }

  try {
    const resultado = await renderizarPedido(pedido);
    const legenda = `“${pedido.frase.texto}”\n— ${pedido.frase.autor}\n\nFrases de Messias`;
    if (resultado.tipo === 'imagem') {
      await telegram('sendPhoto', { chat_id: pedido.chatId, photo: resultado.url, caption: legenda.slice(0, 1024) });
    } else {
      await telegram('sendVideo', {
        chat_id: pedido.chatId,
        video: resultado.url,
        caption: legenda.slice(0, 1024),
        supports_streaming: true
      });
    }
    return responderJson(res, 200, { ok: true, tipo: resultado.tipo });
  } catch (erro) {
    console.error('[telegram-media] Falha no processamento:', erro.message);
    try { await enviarFalha(pedido.chatId, pedido.tipo); }
    catch (falhaNoAviso) { console.error('[telegram-media] Não foi possível avisar sobre a falha:', falhaNoAviso.message); }
    return responderJson(res, 200, { ok: false, processado: false });
  }
};
