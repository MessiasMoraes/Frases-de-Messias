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

const VERSAO_MENU = "20260919-header-text-v1";

function garantirEstiloAtualizado() {
  const folha = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .find((link) => new URL(link.href, window.location.href).pathname.endsWith('/style.css'));
  if (!folha) return;

  const url = new URL(folha.href, window.location.href);
  url.searchParams.set('v', VERSAO_MENU);
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

function criarMenuPrincipal(navegacao) {
  if (!navegacao || navegacao.querySelector(".menu-principal-gatilho")) return;

  const gatilho = document.createElement("button");
  gatilho.type = "button";
  gatilho.className = "menu-principal-gatilho";
  gatilho.setAttribute("aria-expanded", "false");
  gatilho.setAttribute("aria-controls", "menu-principal-links");
  gatilho.setAttribute("aria-label", "Abrir menu de navegação");
  gatilho.title = "Abrir menu";
  gatilho.innerHTML = '<span aria-hidden="true">⋮</span><span class="menu-principal-gatilho-texto">Menu</span>';

  const fechar = () => {
    navegacao.classList.remove("menu-principal-aberto");
    gatilho.setAttribute("aria-expanded", "false");
    gatilho.setAttribute("aria-label", "Abrir menu de navegação");
    gatilho.title = "Abrir menu";
  };

  const alternar = () => {
    const abrir = !navegacao.classList.contains("menu-principal-aberto");
    navegacao.classList.toggle("menu-principal-aberto", abrir);
    gatilho.setAttribute("aria-expanded", String(abrir));
    gatilho.setAttribute("aria-label", abrir ? "Fechar menu de navegação" : "Abrir menu de navegação");
    gatilho.title = abrir ? "Fechar menu" : "Abrir menu";
  };

  gatilho.addEventListener("click", (evento) => {
    evento.stopPropagation();
    alternar();
  });

  navegacao.querySelectorAll(":scope > a").forEach((link) => {
    link.addEventListener("click", fechar);
  });

  document.addEventListener("click", (evento) => {
    if (!navegacao.contains(evento.target)) fechar();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && navegacao.classList.contains("menu-principal-aberto")) {
      fechar();
      gatilho.focus();
    }
  });

  navegacao.classList.add("menu-principal");
  navegacao.prepend(gatilho);
}

export function inserirConviteCanais() {
  const navegacao = document.querySelector("header nav, .cabecalho-comunidade nav, nav");
  if (!navegacao) return;

  garantirEstiloAtualizado();
  if (!navegacao.querySelector(".menu-canais-nav")) {
    const menu = criarMenuCanais();
    const pontoDeInsercao = navegacao.querySelector("[data-menu-canais]");
    if (pontoDeInsercao) {
      pontoDeInsercao.replaceWith(menu);
    } else {
      navegacao.appendChild(menu);
    }
  }
  criarMenuPrincipal(navegacao);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inserirConviteCanais, { once: true });
} else {
  inserirConviteCanais();
}
