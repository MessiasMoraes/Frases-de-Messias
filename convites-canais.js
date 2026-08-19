const CANAIS_OFICIAIS = {
  whatsapp: {
    nome: "Canal WhatsApp",
    descricao: "Mensagens diárias",
    url: "https://whatsapp.com/channel/0029Va94RaR3bbV779wzFL1J",
    classe: "whatsapp",
    sigla: "W"
  },
  telegram: {
    nome: "Canal Telegram",
    descricao: "Frases, imagens e vídeos",
    url: "https://t.me/frasesdemessias",
    classe: "telegram",
    sigla: "T"
  }
};

function escaparHtml(valor = "") {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function definirDestino() {
  if (document.body.classList.contains("pagina-categoria")) {
    return { elemento: document.querySelector(".categoria-conteudo"), posicao: "afterend", origem: "categoria" };
  }

  if (document.querySelector(".pagina-categorias")) {
    return { elemento: document.querySelector(".pagina-categorias"), posicao: "afterend", origem: "lista_categorias" };
  }

  if (document.body.classList.contains("pagina-colecoes")) {
    return { elemento: document.querySelector(".colecoes-listagem"), posicao: "beforebegin", origem: "colecoes" };
  }

  if (document.body.classList.contains("pagina-frases-destaque")) {
    return { elemento: document.querySelector(".lista-frases-destaque"), posicao: "beforebegin", origem: "destaques" };
  }

  if (document.body.classList.contains("pagina-comunidade")) {
    return { elemento: document.querySelector(".hero-comunidade"), posicao: "afterend", origem: "comunidade" };
  }

  return null;
}

function tituloDoConvite(origem) {
  const categoria = String(document.body.dataset.categoria || "").trim();
  if (origem === "categoria" && categoria) return `Receba mais frases de ${escaparHtml(categoria)}`;
  if (origem === "comunidade") return "Inspiração para além da Comunidade";
  return "Uma frase certa pode transformar o dia";
}

function garantirEstiloAtualizado() {
  const folha = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .find((link) => new URL(link.href, window.location.href).pathname.endsWith('/style.css'));
  if (!folha) return;

  const url = new URL(folha.href, window.location.href);
  url.searchParams.set('v', '20260819-canais-v1');
  if (folha.href !== url.href) folha.href = url.href;
}

function criarConvite({ origem }) {
  const secao = document.createElement("section");
  secao.className = "convite-canais";
  secao.setAttribute("aria-labelledby", "tituloConviteCanais");
  secao.dataset.origemConvite = origem;

  secao.innerHTML = `
    <div class="convite-canais-texto">
      <p class="convite-canais-selo">CANAIS OFICIAIS</p>
      <h2 id="tituloConviteCanais">${tituloDoConvite(origem)}</h2>
      <p>Escolha seu canal favorito e receba palavras de fé, motivação e esperança para compartilhar quando quiser.</p>
    </div>
    <div class="convite-canais-acoes" aria-label="Escolha um canal oficial">
      ${Object.values(CANAIS_OFICIAIS).map((canal) => `
        <a class="convite-canal convite-canal-${canal.classe}" href="${canal.url}" target="_blank" rel="noopener noreferrer" data-canal="${canal.classe}" aria-label="Abrir ${canal.nome} do Frases de Messias em uma nova guia">
          <span class="convite-canal-sigla" aria-hidden="true">${canal.sigla}</span>
          <span class="convite-canal-corpo"><strong>${canal.nome}</strong><small>${canal.descricao}</small></span>
          <span class="convite-canal-seta" aria-hidden="true">↗</span>
        </a>
      `).join("")}
    </div>
  `;

  secao.querySelectorAll("a[data-canal]").forEach((link) => {
    link.addEventListener("click", () => {
      if (typeof window.gtag === "function") {
        window.gtag("event", "entrar_canal", {
          canal: link.dataset.canal,
          origem: secao.dataset.origemConvite || "portal"
        });
      }
    });
  });

  return secao;
}

export function inserirConviteCanais() {
  if (document.querySelector(".convite-canais")) return;

  const destino = definirDestino();
  if (!destino?.elemento) return;

  garantirEstiloAtualizado();
  destino.elemento.insertAdjacentElement(destino.posicao, criarConvite(destino));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inserirConviteCanais, { once: true });
} else {
  inserirConviteCanais();
}
