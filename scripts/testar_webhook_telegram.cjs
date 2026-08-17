const assert = require('node:assert');
const handler = require('../api/telegram-webhook.js');

function respostaFalsa() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(codigo) { this.statusCode = codigo; return this; },
    json(valor) { this.body = valor; return this; },
    setHeader(chave, valor) { this.headers[chave] = valor; }
  };
}

function nomeDaApi(url) {
  return String(url).split('/').pop();
}

async function executar() {
  const fetchOriginal = global.fetch;
  const chamadasTelegram = [];
  global.fetch = async (url, opcoes) => {
    chamadasTelegram.push({
      metodo: nomeDaApi(url),
      dados: JSON.parse(opcoes.body)
    });
    return {
      ok: true,
      json: async () => ({ ok: true, result: true })
    };
  };

  try {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    let resposta = respostaFalsa();
    await handler({ method: 'GET', headers: {} }, resposta);
    assert.equal(resposta.statusCode, 200);
    assert.equal(resposta.body.webhook, 'aguardando variáveis de ambiente');

    process.env.TELEGRAM_BOT_TOKEN = 'teste';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'segredo-de-teste';
    const cabecalhoAssinado = { 'x-telegram-bot-api-secret-token': 'segredo-de-teste' };

    resposta = respostaFalsa();
    await handler({ method: 'GET', headers: {} }, resposta);
    assert.equal(resposta.statusCode, 200);
    assert.equal(resposta.body.webhook, 'configurado');
    assert.ok(resposta.body.comandos.includes('/hoje'));
    assert.ok(resposta.body.comandos.includes('/whatsapp'));

    resposta = respostaFalsa();
    await handler({ method: 'POST', headers: {}, body: {} }, resposta);
    assert.equal(resposta.statusCode, 401);

    async function testarComando(texto) {
      chamadasTelegram.length = 0;
      const respostaDoComando = respostaFalsa();
      await handler({
        method: 'POST',
        headers: cabecalhoAssinado,
        body: { message: { chat: { id: 12345 }, text: texto } }
      }, respostaDoComando);
      assert.equal(respostaDoComando.statusCode, 200);
      assert.equal(respostaDoComando.body.ok, true);
      assert.equal(chamadasTelegram.length, 1);
      assert.equal(chamadasTelegram[0].metodo, 'sendMessage');
      return chamadasTelegram[0].dados;
    }

    const ajuda = await testarComando('/ajuda');
    assert.match(ajuda.text, /\/hoje/);
    assert.match(ajuda.text, /\/whatsapp/);

    const amor = await testarComando('/amor');
    assert.match(amor.text, /<i>Amor<\/i>/);

    const hojePrimeira = await testarComando('/hoje');
    const hojeSegunda = await testarComando('/hoje');
    assert.match(hojePrimeira.text, /Frase do dia/);
    assert.equal(hojePrimeira.text, hojeSegunda.text);

    const whatsapp = await testarComando('/whatsapp');
    assert.equal(
      whatsapp.reply_markup.inline_keyboard[0][0].url,
      'https://whatsapp.com/channel/0029Va94RaR3bbV779wzFL1J'
    );

    chamadasTelegram.length = 0;
    resposta = respostaFalsa();
    await handler({
      method: 'GET',
      headers: cabecalhoAssinado,
      query: { registrar: '1' }
    }, resposta);
    assert.equal(resposta.statusCode, 200);
    assert.equal(resposta.body.webhook, 'registrado no Telegram');
    assert.deepEqual(chamadasTelegram.map((chamada) => chamada.metodo), ['setMyCommands', 'setWebhook']);
    assert.ok(chamadasTelegram[0].dados.commands.some((item) => item.command === 'ajuda'));

    console.log('Webhook, proteção e comandos personalizados validados.');
  } finally {
    global.fetch = fetchOriginal;
  }
}

executar().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
