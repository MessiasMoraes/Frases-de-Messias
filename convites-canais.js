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
  url.searchParams.set('v', '20260820-menu-canais-v1');
  if (folha.href !== url.href) folha.href = url.href;
}

function registrarClique(link) {
  if (typeof window.gtag !== "function") return;

  window.gtag("event", "entrar_canal", {
    canal: link.dataset.canal,
    origem: "menu_canais"
  });
}

function criarMenuCanais() {
  const idLista = `lista-canais-${Math.random().toString(36).slice(2, 9)}`;
  const grupo = document.createElement("div");
  grupo.className = "menu-canais-nav";

  grupo.innerHTML = `
    <button class="menu-canais-gatilho" type="button" aria-expanded="false" aria-controls="${idLista}" aria-label="Abrir opções dos canais oficiais">
      <span aria-hidden="true">📣</span><span>Canais</span><span class="menu-canais-seta" aria-hidden="true">▾</span>
    </button>
    <div id="${idLista}" class="menu-canais-lista" role="menu" aria-label="Canais oficiais do Frases de Messias" hidden>
      ${Object.values(CANAIS_OFICIAIS).map((canal) => `
        <a class="menu-canais-link menu-canais-${canal.classe}" href="${canal.url}" target="_blank" rel="noopener noreferrer" data-canal="${canal.classe}" role="menuitem" aria-label="Abrir canal oficial no ${canal.nome}, abre em uma nova guia">
          <span aria-hidden="true">${canal.icone}</span><span>${canal.nome}</span>
        </a>
      `).join("")}
    </div>
  `;

  const gatilho = grupo.querySelector(".menu-canais-gatilho");
  const lista = grupo.querySelector(".menu-canais-lista");
  const fechar = () => {
    lista.hidden = true;
    gatilho.setAttribute("aria-expanded", "false");
  };
  const alternar = () => {
    const abrir = lista.hidden;
    lista.hidden = !abrir;
    gatilho.setAttribute("aria-expanded", String(abrir));
  };

  gatilho.addEventListener("click", (evento) => {
    evento.stopPropagation();
    alternar();
  });

  grupo.querySelectorAll("a[data-canal]").forEach((link) => {
    link.addEventListener("click", () => {
      registrarClique(link);
      fechar();
    });
  });

  document.addEventListener("click", (evento) => {
    if (!grupo.contains(evento.target)) fechar();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !lista.hidden) {
      fechar();
      gatilho.focus();
    }
  });

  return grupo;
}

export function inserirConviteCanais() {
  if (document.querySelector(".menu-canais-nav")) return;

  const navegacao = document.querySelector("header nav, .cabecalho-comunidade nav, nav");
  if (!navegacao) return;

  garantirEstiloAtualizado();
  const menu = criarMenuCanais();
  const pontoDeInsercao = navegacao.querySelector("[data-menu-canais]");
  if (pontoDeInsercao) {
    pontoDeInsercao.replaceWith(menu);
  } else {
    navegacao.appendChild(menu);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inserirConviteCanais, { once: true });
} else {
  inserirConviteCanais();
}
