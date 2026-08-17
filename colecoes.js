const busca = document.getElementById('buscaColecao');
const lista = document.getElementById('listaFrasesColecao');
const contador = document.getElementById('contadorColecao');
const semResultado = document.getElementById('semResultadoColecao');

function normalizar(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function copiarTexto(texto) {
  const valor = String(texto || '').trim();
  if (!valor) throw new Error('Não há texto para copiar.');

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(valor);
      return;
    } catch (erro) {
      console.warn('Clipboard moderno indisponível; usando alternativa.', erro);
    }
  }

  const area = document.createElement('textarea');
  area.value = valor;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;';
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, area.value.length);
  try {
    if (!document.execCommand('copy')) throw new Error('O navegador não confirmou a cópia.');
  } finally {
    area.remove();
  }
}

function atualizarBusca() {
  if (!lista || !busca) return;
  const termo = normalizar(busca.value);
  const cards = [...lista.querySelectorAll('[data-frase-card]')];
  let visiveis = 0;

  cards.forEach((card) => {
    const conteudo = normalizar(`${card.dataset.texto || ''} ${card.dataset.tema || ''}`);
    const mostrar = !termo || conteudo.includes(termo);
    card.hidden = !mostrar;
    if (mostrar) visiveis += 1;
  });

  if (contador) contador.textContent = `${visiveis} ${visiveis === 1 ? 'frase encontrada' : 'frases para você'}`;
  if (semResultado) semResultado.hidden = visiveis !== 0;
}

function configurarTema() {
  const botao = document.getElementById('temaBtn');
  const aplicar = (escuro) => {
    document.body.classList.toggle('dark', escuro);
    if (botao) {
      botao.textContent = escuro ? '☀️ Modo Claro' : '🌙 Modo Escuro';
      botao.setAttribute('aria-pressed', String(escuro));
    }
  };

  aplicar(localStorage.getItem('tema') === 'dark');
  botao?.addEventListener('click', () => {
    const escuro = !document.body.classList.contains('dark');
    localStorage.setItem('tema', escuro ? 'dark' : 'light');
    aplicar(escuro);
  });
}

async function compartilhar(texto, titulo) {
  const mensagem = `“${texto}” — Messias\n\n${window.location.href}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo || 'Frases de Messias', text: mensagem, url: window.location.href });
      return;
    } catch (erro) {
      if (erro?.name === 'AbortError') return;
      console.warn('Compartilhamento nativo indisponível; usando cópia.', erro);
    }
  }
  await copiarTexto(mensagem);
  alert('Frase e link copiados para compartilhar.');
}

document.addEventListener('click', async (evento) => {
  const copiar = evento.target.closest('[data-copiar-frase]');
  if (copiar) {
    const rotulo = copiar.textContent;
    try {
      await copiarTexto(`“${copiar.dataset.copiarFrase || ''}” — Messias`);
      copiar.textContent = 'Copiada!';
      window.setTimeout(() => { copiar.textContent = rotulo; }, 1800);
    } catch (erro) {
      console.error('Não foi possível copiar a frase.', erro);
      alert('Não foi possível copiar a frase agora.');
    }
    return;
  }

  const botaoCompartilhar = evento.target.closest('[data-compartilhar-frase]');
  if (botaoCompartilhar) {
    const rotulo = botaoCompartilhar.textContent;
    botaoCompartilhar.disabled = true;
    try {
      await compartilhar(botaoCompartilhar.dataset.compartilharFrase || '', botaoCompartilhar.dataset.titulo || 'Frases de Messias');
      botaoCompartilhar.textContent = 'Pronto!';
      window.setTimeout(() => { botaoCompartilhar.textContent = rotulo; }, 1800);
    } catch (erro) {
      console.error('Não foi possível compartilhar a frase.', erro);
      alert('Não foi possível preparar o compartilhamento agora.');
    } finally {
      window.setTimeout(() => { botaoCompartilhar.disabled = false; }, 250);
    }
  }
});

busca?.addEventListener('input', atualizarBusca);
configurarTema();
