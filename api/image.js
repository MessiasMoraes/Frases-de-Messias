const HOSTS_PERMITIDOS = new Set([
  "picsum.photos",
  "fastly.picsum.photos",
  "messiasmoraes.github.io",
  "frasesdemessias.com.br",
  "raw.githubusercontent.com"
]);

function hostPermitido(hostname) {
  const host = String(hostname || "").toLowerCase();
  return HOSTS_PERMITIDOS.has(host);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não permitido." });
  }

  const valor = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  if (!valor || typeof valor !== "string") {
    return res.status(400).json({ error: "Informe o parâmetro url." });
  }

  let url;
  try {
    url = new URL(valor);
  } catch (_) {
    return res.status(400).json({ error: "URL de imagem inválida." });
  }

  if (url.protocol !== "https:" || !hostPermitido(url.hostname)) {
    return res.status(403).json({ error: "Domínio de imagem não autorizado." });
  }

  try {
    const upstream = await fetch(url, {
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Frases-de-Messias-Image-Proxy/1.0"
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({
        error: "A imagem original não pôde ser carregada."
      });
    }

    const tipo = upstream.headers.get("content-type") || "";
    if (!tipo.toLowerCase().startsWith("image/")) {
      return res.status(502).json({ error: "A origem não retornou uma imagem." });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", tipo.split(";")[0]);
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Erro no proxy de imagem:", error);
    return res.status(502).json({ error: "Não foi possível acessar a imagem original." });
  }
};
