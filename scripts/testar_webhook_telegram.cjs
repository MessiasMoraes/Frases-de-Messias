const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('../api/telegram-webhook.js');
const processadorMidia = require('../api/telegram-media.js');
const { selecionarTrilha, caminhoDaTrilha, configuracao } = require('../api/trilhas.js');

function respostaFalsa() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(codigo) { this.statusCode = codigo; return this; },
    json(valor) { this.body = valor; return this; },
    setHeader(chave, valor) { this.headers[chave] = valor; },
    end(valor) { this.body = JSON.parse(valor); }
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
    const renderizadorDoSite = fs.readFileSync(path.join(__dirname, '..', 'api', 'video.js'), 'utf8');
    const renderizadorDoBot = fs.readFileSync(path.join(__dirname, '..', 'api', 'telegram-media.js'), 'utf8');
    assert.match(renderizadorDoSite, /const RENDER_SECONDS = 15;/);
    assert.match(renderizadorDoBot, /const VIDEO_SECONDS = 15;/);
    assert.match(renderizadorDoSite, /-c:a", "aac"/);
    assert.match(renderizadorDoBot, /'-c:a', 'aac'/);
    assert.equal(configuracao.perfis.length, 6);
    assert.equal(configuracao.volumeFundoDb, -12);
    assert.match(renderizadorDoSite, /alimiter=limit=0\.95/);
    assert.match(renderizadorDoBot, /alimiter=limit=0\.95/);
    assert.equal(selecionarTrilha({ quote: 'Em Deus encontro paz e esperança.', category: 'Reflexão' }).id, 'fe_esperanca');
    assert.equal(selecionarTrilha({ quote: 'Tenha força para superar os desafios.', category: 'Inspiração' }).id, 'motivacao');
    assert.equal(selecionarTrilha({ quote: 'O carinho torna a vida mais bonita.', category: 'Reflexão' }).id, 'amor');
    assert.equal(selecionarTrilha({ quote: 'Sou grato por cada bênção.', category: 'Inspiração' }).id, 'gratidao');
    assert.equal(selecionarTrilha({ quote: 'Bom dia! Hoje é um novo recomeço.', category: 'Inspiração' }).id, 'bom_dia');
    assert.equal(selecionarTrilha({ quote: 'Boa noite. Descanse em paz.', category: 'Inspiração' }).id, 'boa_noite');
    for (const perfil of configuracao.perfis) assert.ok(fs.existsSync(caminhoDaTrilha(perfil.arquivo)));

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
    assert.ok(resposta.body.comandos.includes('/imagem'));
    assert.ok(resposta.body.comandos.includes('/video'));
    assert.ok(resposta.body.comandos.includes('/canal'));
    assert.ok(resposta.body.comandos.includes('/whatsapp'));
    assert.ok(resposta.body.comandos.includes('/colecoes'));

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
    assert.match(ajuda.text, /\/imagem/);
    assert.match(ajuda.text, /\/video/);
    assert.match(ajuda.text, /\/canal/);
    assert.match(ajuda.text, /\/whatsapp/);
    assert.match(ajuda.text, /\/colecoes/);

    const amor = await testarComando('/amor');
    assert.match(amor.text, /<i>Amor<\/i>/);

    const hojePrimeira = await testarComando('/hoje');
    const hojeSegunda = await testarComando('/hoje');
    assert.match(hojePrimeira.text, /Frase do dia/);
    assert.equal(hojePrimeira.text, hojeSegunda.text);

    const colecoes = await testarComando('/colecoes');
    assert.match(colecoes.text, /Coleções de Frases/);
    assert.equal(colecoes.reply_markup.inline_keyboard[0][0].url, 'https://frasesdemessias.com.br/colecoes.html');

    const inicio = await testarComando('/start');
    assert.ok(inicio.reply_markup.inline_keyboard.some((linha) => linha.some((botao) => botao.url === 'https://frasesdemessias.com.br/colecoes.html')));

    const whatsapp = await testarComando('/whatsapp');
    assert.equal(
      whatsapp.reply_markup.inline_keyboard[0][0].url,
      'https://whatsapp.com/channel/0029Va94RaR3bbV779wzFL1J'
    );

    const canal = await testarComando('/canal');
    assert.equal(canal.reply_markup.inline_keyboard[0][0].url, 'https://t.me/frasesdemessias');
    assert.match(canal.text, /Canal Frases de Messias no Telegram/);

    const motivacaoLivre = await testarComando('Hoje estou muito cansado e preciso de força.');
    assert.match(motivacaoLivre.text, /<i>Motivação<\/i>/);
    assert.match(motivacaoLivre.text, /Uma mensagem para você/);

    const gratidaoLivre = await testarComando('Estou agradecido pelas bênçãos de hoje.');
    assert.match(gratidaoLivre.text, /<i>Gratidão<\/i>/);

    const mensagemGenerica = await testarComando('Olá, tudo bem?');
    assert.match(mensagemGenerica.text, /Que bom receber sua mensagem/);
    assert.match(mensagemGenerica.text, /preciso de fé/);

    async function testarMidia(texto, tipo) {
      chamadasTelegram.length = 0;
      const respostaDaMidia = respostaFalsa();
      await handler({
        method: 'POST',
        headers: cabecalhoAssinado,
        body: { message: { chat: { id: 12345 }, text: texto } }
      }, respostaDaMidia);
      assert.equal(respostaDaMidia.statusCode, 200);
      assert.equal(respostaDaMidia.body.ok, true);
      assert.equal(chamadasTelegram[0].metodo, 'sendMessage');
      assert.match(chamadasTelegram[0].dados.text, tipo === 'video' ? /vídeo está sendo criado/ : /imagem está sendo criada/);
      const chamadaProcessador = chamadasTelegram.find((chamada) => chamada.metodo === 'telegram-media');
      assert.ok(chamadaProcessador, 'O processador de mídia deve ser acionado.');
      assert.equal(chamadaProcessador.dados.tipo, tipo);
      assert.equal(chamadaProcessador.dados.chatId, 12345);
      assert.ok(chamadaProcessador.dados.frase.texto);
    }

    await testarMidia('/imagem fé', 'imagem');
    await testarMidia('/video motivação', 'video');

    resposta = respostaFalsa();
    await processadorMidia({ method: 'POST', headers: {}, body: {} }, resposta);
    assert.equal(resposta.statusCode, 401);

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
    assert.ok(chamadasTelegram[0].dados.commands.some((item) => item.command === 'imagem'));
    assert.ok(chamadasTelegram[0].dados.commands.some((item) => item.command === 'video'));
    assert.ok(chamadasTelegram[0].dados.commands.some((item) => item.command === 'canal'));
    assert.ok(chamadasTelegram[0].dados.commands.some((item) => item.command === 'colecoes'));

    console.log('Webhook, proteção, comandos, mídia de 15 segundos com trilha automática, canal, coleções e respostas automáticas validados.');
  } finally {
    global.fetch = fetchOriginal;
  }
}

executar().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
