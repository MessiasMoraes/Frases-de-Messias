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

async function executar() {
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  let resposta = respostaFalsa();
  await handler({ method: 'GET', headers: {} }, resposta);
  assert.equal(resposta.statusCode, 200);
  assert.equal(resposta.body.webhook, 'aguardando variáveis de ambiente');

  process.env.TELEGRAM_BOT_TOKEN = 'teste';
  process.env.TELEGRAM_WEBHOOK_SECRET = 'segredo-de-teste';
  resposta = respostaFalsa();
  await handler({ method: 'GET', headers: {} }, resposta);
  assert.equal(resposta.statusCode, 200);
  assert.equal(resposta.body.webhook, 'configurado');

  resposta = respostaFalsa();
  await handler({ method: 'POST', headers: {}, body: {} }, resposta);
  assert.equal(resposta.statusCode, 401);

  console.log('Webhook: disponibilidade e bloqueio de origem não autorizada validados.');
}

executar().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
