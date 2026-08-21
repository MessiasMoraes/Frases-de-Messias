const { put, del } = require("@vercel/blob");

const FIREBASE_API_KEY = "AIzaSyAdPWj_82SH4EqALPRApgUYuLdxGgl-DGA";
const LIMITE_AVATAR_BYTES = 700 * 1024;
const ORIGENS_PERMITIDAS = new Set([
  "https://frasesdemessias.com.br",
  "https://www.frasesdemessias.com.br",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:4177"
]);

function configurarCors(requisicao, resposta) {
  const origem = String(requisicao.headers.origin || "");
  if (ORIGENS_PERMITIDAS.has(origem)) {
    resposta.setHeader("Access-Control-Allow-Origin", origem);
    resposta.setHeader("Vary", "Origin");
  }
  resposta.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  resposta.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function respostaDeErro(resposta, status, mensagem) {
  return resposta.status(status).json({ error: mensagem });
}

async function usuarioDoToken(idToken) {
  const resposta = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    }
  );
  const dados = await resposta.json().catch(() => ({}));
  const usuario = dados?.users?.[0];
  return resposta.ok && usuario?.localId ? usuario : null;
}

function lerImagemJpeg(dataUrl) {
  const texto = String(dataUrl || "").trim();
  const resultado = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/i.exec(texto);
  if (!resultado) return null;

  const imagem = Buffer.from(resultado[1], "base64");
  const eJpeg = imagem.length > 3 && imagem[0] === 0xff && imagem[1] === 0xd8 && imagem[2] === 0xff;
  if (!eJpeg || imagem.length > LIMITE_AVATAR_BYTES) return null;
  return imagem;
}

function avatarPertenceAoUsuario(url, usuarioId) {
  try {
    const endereco = new URL(String(url || ""));
    const caminho = decodeURIComponent(endereco.pathname);
    return endereco.protocol === "https:"
      && endereco.hostname.endsWith(".public.blob.vercel-storage.com")
      && caminho.startsWith(`/perfis/${usuarioId}/avatar-`);
  } catch {
    return false;
  }
}

async function handler(requisicao, resposta) {
  configurarCors(requisicao, resposta);
  if (requisicao.method === "OPTIONS") return resposta.status(204).end();
  if (requisicao.method !== "POST") {
    resposta.setHeader("Allow", "POST, OPTIONS");
    return respostaDeErro(resposta, 405, "Método não permitido.");
  }

  const corpo = requisicao.body && typeof requisicao.body === "object" ? requisicao.body : {};
  const idToken = String(corpo.idToken || "").trim();
  if (!idToken) return respostaDeErro(resposta, 401, "Entre na Comunidade para alterar sua foto.");

  try {
    const usuario = await usuarioDoToken(idToken);
    if (!usuario) return respostaDeErro(resposta, 401, "Sua sessão expirou. Entre novamente para continuar.");

    const acao = String(corpo.acao || "enviar");
    const fotoAnterior = String(corpo.fotoAnterior || "");
    if (acao === "remover") {
      if (avatarPertenceAoUsuario(fotoAnterior, usuario.localId)) {
        await del(fotoAnterior).catch(() => undefined);
      }
      return resposta.status(200).json({ ok: true, url: "" });
    }

    const imagem = lerImagemJpeg(corpo.imagem);
    if (!imagem) {
      return respostaDeErro(resposta, 400, "Escolha uma imagem JPEG válida de até 700 KB.");
    }

    const identificador = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const avatar = await put(`perfis/${usuario.localId}/avatar-${identificador}.jpg`, imagem, {
      access: "public",
      contentType: "image/jpeg",
      cacheControlMaxAge: 31536000
    });

    return resposta.status(201).json({ ok: true, url: avatar.url });
  } catch (erro) {
    console.error("Erro ao salvar avatar:", erro);
    return respostaDeErro(resposta, 500, "Não foi possível salvar a foto agora. Tente novamente.");
  }
}

handler.config = {
  api: {
    bodyParser: { sizeLimit: "1mb" }
  }
};

module.exports = handler;
