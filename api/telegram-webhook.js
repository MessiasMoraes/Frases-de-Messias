const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SITE_URL = 'https://frasesdemessias.com.br';
const TELEGRAM_WEBHOOK_URL = 'https://frasesdemessiascombr.vercel.app/api/telegram-webhook';
const CATALOGO_PATH = path.join(process.cwd(), 'dados', 'frases-bot.json');
let catalogoEmMemoria;

function carregarCatalogo() {
  if (!catalogoEmMemoria) {
    catalogoEmMemoria = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf8'));
  }
  return catalogoEmMemoria;
}

function textoLimpo(valor = '') {
  return String(valor).replace(/\s+/g, ' ').trim();
}

function normalizar(valor = '') {
  return textoLimpo(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function escolher(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function escapeHtml(valor = '') {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function mensagemDaFrase(frase) {
  return `“${escapeHtml(frase.texto)}”\n\n— <b>${escapeHtml(frase.autor || 'Messias')}</b>\n\n<i>${escapeHtml(frase.categoria)}</i>`;
}

function tecladoInicial() {
  return {
    inline_keyboard: [
      [{ text: '🎲 Frase para mim', callback_data: 'frase:aleatoria' }],
      [{ text: '📚 Escolher categoria', callback_data: 'menu:categorias' }],
      [{ text: '🌐 Acessar o site', url: SITE_URL }]
    ]
  };
}

function tecladoCategorias() {
  const { categorias } = carregarCatalogo();
  const linhas = [];
  for (let indice = 0; indice < categorias.length; indice += 2) {
    linhas.push(categorias.slice(indice, indice + 2).map((categoria) => ({
      text: categoria,
      callback_data: `categoria:${categoria}`
    })));
  }
  linhas.push([{ text: '🎲 Frase aleatória', callback_data: 'frase:aleatoria' }]);
  linhas.push([{ text: '🌐 Abrir Frases de Messias', url: SITE_URL }]);
  return { inline_keyboard: linhas };
}

function tecladoDaFrase(categoria) {
  const botoes = [[{ text: '🔄 Outra frase', callback_data: `frase:${categoria || 'aleatoria'}` }]];
  if (categoria) botoes.push([{ text: '📚 Outras categorias', callback_data: 'menu:categorias' }]);
  botoes.push([{ text: '🌐 Ver no site', url: SITE_URL }]);
  return { inline_keyboard: botoes };
}

function obterFrase(categoria) {
  const { frases } = carregarCatalogo();
  if (categoria && categoria !== 'aleatoria') {
    const filtradas = frases.filter((frase) => normalizar(frase.categoria) === normalizar(categoria));
    if (filtradas.length) return escolher(filtradas);
  }
  return escolher(frases);
}

function categoriaConhecida(texto) {
  const { categorias } = carregarCatalogo();
  return categorias.find((categoria) => normalizar(categoria) === normalizar(texto));
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
  if (!resposta.ok || !resultado.ok) {
    throw new Error(resultado.description || `Falha ao chamar ${metodo}.`);
  }
  return resultado.result;
}

async function registrarWebhookTelegram() {
  const segredo = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!segredo) throw new Error('TELEGRAM_WEBHOOK_SECRET não configurado.');
  return telegram('setWebhook', {
    url: TELEGRAM_WEBHOOK_URL,
    secret_token: segredo,
    allowed_updates: ['message', 'callback_query']
  });
}

async function enviarFrase(chatId, categoria) {
  const frase = obterFrase(categoria);
  await telegram('sendMessage', {
    chat_id: chatId,
    text: mensagemDaFrase(frase),
    parse_mode: 'HTML',
    reply_markup: tecladoDaFrase(frase.categoria),
    disable_web_page_preview: true
  });
}

async function tratarMensagem(mensagem) {
  const chatId = mensagem.chat?.id;
  if (!chatId) return;
  const texto = textoLimpo(mensagem.text || '');
  const comando = texto.split(/\s+/)[0].split('@')[0].toLowerCase();

  if (comando === '/start') {
    await telegram('sendMessage', {
      chat_id: chatId,
      text: '<b>Bem-vindo ao Frases de Messias.</b>\n\nEncontre uma palavra de fé, amor, motivação e esperança para o seu dia.',
      parse_mode: 'HTML',
      reply_markup: tecladoInicial(),
      disable_web_page_preview: true
    });
    return;
  }

  if (comando === '/frase') {
    await enviarFrase(chatId, texto.split(/\s+/).slice(1).join(' ') || 'aleatoria');
    return;
  }

  if (comando === '/categorias') {
    await telegram('sendMessage', {
      chat_id: chatId,
      text: '<b>Escolha uma categoria:</b>',
      parse_mode: 'HTML',
      reply_markup: tecladoCategorias()
    });
    return;
  }

  if (comando === '/site') {
    await telegram('sendMessage', {
      chat_id: chatId,
      text: `<b>Frases de Messias</b>\n${SITE_URL}`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '🌐 Abrir o site', url: SITE_URL }]] },
      disable_web_page_preview: false
    });
    return;
  }

  const categoria = categoriaConhecida(texto);
  if (categoria) {
    await enviarFrase(chatId, categoria);
    return;
  }

  await telegram('sendMessage', {
    chat_id: chatId,
    text: 'Use <b>/frase</b> para receber uma mensagem, <b>/categorias</b> para escolher um tema ou toque em um botão abaixo.',
    parse_mode: 'HTML',
    reply_markup: tecladoInicial()
  });
}

async function tratarCallback(callback) {
  const chatId = callback.message?.chat?.id;
  const acao = textoLimpo(callback.data || '');
  await telegram('answerCallbackQuery', { callback_query_id: callback.id });
  if (!chatId) return;

  if (acao === 'menu:categorias') {
    await telegram('sendMessage', {
      chat_id: chatId,
      text: '<b>Escolha uma categoria:</b>',
      parse_mode: 'HTML',
      reply_markup: tecladoCategorias()
    });
    return;
  }

  if (acao.startsWith('categoria:')) {
    await enviarFrase(chatId, acao.slice('categoria:'.length));
    return;
  }

  if (acao.startsWith('frase:')) {
    await enviarFrase(chatId, acao.slice('frase:'.length));
  }
}

function segredoValido(req) {
  const esperado = process.env.TELEGRAM_WEBHOOK_SECRET;
  const recebido = req.headers['x-telegram-bot-api-secret-token'];
  if (!esperado || typeof recebido !== 'string') return false;
  const esquerda = Buffer.from(esperado);
  const direita = Buffer.from(recebido);
  return esquerda.length === direita.length && crypto.timingSafeEqual(esquerda, direita);
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const pronto = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET);

    if (req.query?.registrar === '1') {
      if (!segredoValido(req)) return res.status(401).json({ error: 'Origem não autorizada.' });
      try {
        await registrarWebhookTelegram();
        return res.status(200).json({
          servico: 'Frases de Messias — bot do Telegram',
          webhook: 'registrado no Telegram',
          comandos: ['/start', '/frase', '/categorias', '/site']
        });
      } catch (erro) {
        console.error('Erro ao registrar webhook do Telegram:', erro.message);
        return res.status(500).json({ error: 'Não foi possível registrar o webhook.' });
      }
    }

    return res.status(200).json({
      servico: 'Frases de Messias — bot do Telegram',
      webhook: pronto ? 'configurado' : 'aguardando variáveis de ambiente',
      comandos: ['/start', '/frase', '/categorias', '/site']
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (!segredoValido(req)) return res.status(401).json({ error: 'Origem não autorizada.' });

  try {
    const atualizacao = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (atualizacao.message) await tratarMensagem(atualizacao.message);
    if (atualizacao.callback_query) await tratarCallback(atualizacao.callback_query);
    return res.status(200).json({ ok: true });
  } catch (erro) {
    console.error('Erro no webhook do Telegram:', erro.message);
    return res.status(200).json({ ok: true, processado: false });
  }
};
