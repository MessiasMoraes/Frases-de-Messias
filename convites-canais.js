const CANAIS_OFICIAIS = {
  whatsapp: {
    nome: "WhatsApp",
    url: "https://whatsapp.com/channel/0029Va94RaR3bbV779wzFL1J",
    classe: "whatsapp",
    icone: "💬"
  },
  telegram: {
    nome: "Telegram",
    url: "https://t.me/frasesdemessias",
    classe: "telegram",
    icone: "✈️"
  }
};

function garantirEstiloAtualizado() {
  const folha = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .find((link) => new URL(link.href, window.location.href).pathname.endsWith('/style.css'));
  if (!folha) return;

  const url = new URL(folha.href, window.location.href);
  url.searchParams.set('v', '20260820-navegacao-canais-v1');
  if (folha.href !== url.href) folha.href = url.href;
}

function registrarClique(link) {
  if (typeof window.gtag !== "function") return;

  window.gtag("event", "entrar_canal", {
    canal: link.dataset.canal,
    origem: "navegacao_compacta"
  });
}

function criarAtalhos() {
  const grupo = document.createElement("span");
  grupo.className = "atalhos-canais-nav";
  grupo.setAttribute("role", "group");
  grupo.setAttribute("aria-label", "Canais oficiais do Frases de Messias");

  grupo.innerHTML = Object.values(CANAIS_OFICIAIS).map((canal) => `
    <a class="atalho-canal atalho-canal-${canal.classe}" href="${canal.url}" target="_blank" rel="noopener noreferrer" data-canal="${canal.classe}" aria-label="Abrir canal oficial no ${canal.nome}, abre em uma nova guia">
      <span aria-hidden="true">${canal.icone}</span><span>${canal.nome}</span>
    </a>
  `).join("");

  grupo.querySelectorAll("a[data-canal]").forEach((link) => {
    link.addEventListener("click", () => registrarClique(link));
  });

  return grupo;
}

export function inserirConviteCanais() {
  if (document.querySelector(".atalhos-canais-nav")) return;

  const navegacao = document.querySelector("header nav, .cabecalho-comunidade nav, nav");
  if (!navegacao) return;

  garantirEstiloAtualizado();
  navegacao.appendChild(criarAtalhos());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inserirConviteCanais, { once: true });
} else {
  inserirConviteCanais();
}
