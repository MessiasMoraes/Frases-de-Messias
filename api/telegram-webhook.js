const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SITE_URL = 'https://frasesdemessias.com.br';
const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029Va94RaR3bbV779wzFL1J';
const TELEGRAM_WEBHOOK_URL = 'https://frasesdemessiascombr.vercel.app/api/telegram-webhook';
const CATALOGO_PATH = path.join(process.cwd(), 'dados', 'frases-bot.json');
const COMANDOS_BOT = [
  { command: 'start', description: 'Abrir o menu principal' },
  { command: 'frase', description: 'Receber uma frase aleatória' },
  { command: 'hoje', description: 'Receber a frase do dia' },
  { command: 'amor', description: 'Receber uma frase de amor' },
  { command: 'fe', description: 'Receber uma frase de fé' },
  { command: 'motivacao', description: 'Receber uma frase de motivação' },
  { command: 'bomdia', description: 'Receber uma frase de bom dia' },
  { command: 'boanoite', description: 'Receber uma frase de boa noite' },
  { command: 'categorias', description: 'Escolher um tema' },
  { command: 'whatsapp', description: 'Abrir o canal no WhatsApp' },
  { command: 'sobre', description: 'Conhecer o Frases de Messias' },
  { command: 'site', description: 'Abrir o site' },
  { command: 'ajuda', description: 'Ver todos os comandos' }
];
const ATALHOS_CATEGORIA = {
  '/amor': 'Amor',
  '/fe': 'Fé',
  '/motivacao': 'Motivação',
  '/bomdia': 'Bom Dia',
  '/boanoite': 'Boa Noite'
};
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

function obterFraseDoDia() {
  const { frases } = carregarCatalogo();
  if (!frases.length) return null;

  const dataNoBrasil = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  let hash = 0;
  for (const caractere of dataNoBrasil) hash = ((hash * 31) + caractere.charCodeAt(0)) >>> 0;
  return frases[hash % frases.length];
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
      [{ text: '☀️ Frase do dia', callback_data: 'frase:hoje' }],
      [{ text: '📚 Escolher categoria', callback_data: 'menu:categorias' }],
      [{ text: '📢 Canal no WhatsApp', url: WHATSAPP_CHANNEL_URL }],
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

async function registrarComandosTelegram() {
  return telegram('setMyCommands', { commands: COMANDOS_BOT });
}

async function registrarWebhookTelegram() {
  const segredo = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!segredo) throw new Error('TELEGRAM_WEBHOOK_SECRET não configurado.');
  await registrarComandosTelegram();
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

async function enviarFraseDoDia(chatId) {
  const frase = obterFraseDoDia();
  if (!frase) return;
  await telegram('sendMessage', {
    chat_id: chatId,
    text: `<b>☀️ Frase do dia</b>\n\n${mensagemDaFrase(frase)}`,
    parse_mode: 'HTML',
    reply_markup: tecladoDaFrase(frase.categoria),
    disable_web_page_preview: true
  });
}

async function enviarAjuda(chatId) {
  await telegram('sendMessage', {
    chat_id: chatId,
    text: '<b>Comandos do Frases de Messias</b>\n\n🎲 <b>/frase</b> — frase aleatória\n☀️ <b>/hoje</b> — frase do dia\n❤️ <b>/amor</b> — frases de amor\n🙏 <b>/fe</b> — frases de fé\n💪 <b>/motivacao</b> — motivação\n🌞 <b>/bomdia</b> — bom dia\n🌙 <b>/boanoite</b> — boa noite\n📚 <b>/categorias</b> — escolher outro tema\n📢 <b>/whatsapp</b> — canal no WhatsApp\nℹ️ <b>/sobre</b> — conhecer o projeto\n🌐 <b>/site</b> — abrir o portal',
    parse_mode: 'HTML',
    reply_markup: tecladoInicial(),
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
      text: '<b>Bem-vindo ao Frases de Messias.</b>\n\nEncontre uma palavra de fé, amor, motivação e esperança para o seu dia. Use <b>/ajuda</b> para conhecer todos os comandos.',
      parse_mode: 'HTML',
      reply_markup: tecladoInicial(),
      disable_web_page_preview: true
    });
    return;
  }

  if (comando === '/ajuda') {
    await enviarAjuda(chatId);
    return;
  }

  if (comando === '/hoje') {
    await enviarFraseDoDia(chatId);
    return;
  }

  if (ATALHOS_CATEGORIA[comando]) {
    await enviarFrase(chatId, ATALHOS_CATEGORIA[comando]);
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

  if (comando === '/whatsapp') {
    await telegram('sendMessage', {
      chat_id: chatId,
      text: '<b>Canal Frases de Messias no WhatsApp</b>\n\nReceba frases e mensagens diárias diretamente no WhatsApp.',
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '📢 Abrir canal no WhatsApp', url: WHATSAPP_CHANNEL_URL }]] },
      disable_web_page_preview: true
    });
    return;
  }

  if (comando === '/sobre') {
    await telegram('sendMessage', {
      chat_id: chatId,
      text: '<b>Frases de Messias</b>\n\nUm portal de mensagens de fé, amor, motivação, gratidão e reflexão para inspirar o seu dia.',
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '🌐 Conhecer o site', url: SITE_URL }]] },
      disable_web_page_preview: true
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
    text: 'Não reconheci esse comando. Use <b>/ajuda</b> para ver as opções ou toque em um botão abaixo.',
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

  if (acao === 'frase:hoje') {
    await enviarFraseDoDia(chatId);
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
          comandos: COMANDOS_BOT.map(({ command }) => `/${command}`)
        });
      } catch (erro) {
        console.error('Erro ao registrar webhook do Telegram:', erro.message);
        return res.status(500).json({ error: 'Não foi possível registrar o webhook.' });
      }
    }

    return res.status(200).json({
      servico: 'Frases de Messias — bot do Telegram',
      webhook: pronto ? 'configurado' : 'aguardando variáveis de ambiente',
      comandos: COMANDOS_BOT.map(({ command }) => `/${command}`)
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
