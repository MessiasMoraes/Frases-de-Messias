const busca = document.getElementById('buscaColecao');
import "./convites-canais.js?v=20260819-canais-v1";

const lista = document.getElementById('listaFrasesColecao');
const contador = document.getElementById('contadorColecao');
const semResultado = document.getElementById('semResultadoColecao');
const IMAGEM_PADRAO = new URL('imagens/fundo-frases-sereno.png', window.location.href).href;
const ORIGEM_API_PADRAO = 'https://frasesdemessiascombr.vercel.app';

function normalizar(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function nomeArquivo(tipo, formato) {
  const data = new Date().toISOString().replace(/[:.]/g, '-');
  return `frase-messias-${tipo}-${formato}-${data}`;
}

function origemApiVideo() {
  const parametro = new URLSearchParams(window.location.search).get('apiOrigin');
  if (parametro) return parametro.replace(/\/$/, '');
  if (/\.vercel\.app$/i.test(window.location.hostname)) return window.location.origin;
  return ORIGEM_API_PADRAO;
}

function ehAplicativoAndroid() {
  return Boolean(window.AndroidDownloader)
    && typeof window.AndroidDownloader.baixarVideo === 'function';
}

function iniciarDownload(url, arquivo) {
  const link = document.createElement('a');
  link.href = url;
  link.download = arquivo;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
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

function abrirOpcoesDownload(botao) {
  const card = botao.closest('[data-frase-card]');
  const opcoes = card?.querySelector('[data-opcoes-download]');
  if (!opcoes) return;
  const abrir = opcoes.hidden;
  opcoes.hidden = !abrir;
  botao.setAttribute('aria-expanded', String(abrir));
  if (abrir) requestAnimationFrame(() => opcoes.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.crossOrigin = 'anonymous';
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error('Não foi possível carregar a imagem de fundo.'));
    imagem.src = url;
  });
}

function quebrarLinhas(ctx, texto, larguraMaxima) {
  const palavras = String(texto || '').replace(/[“”]/g, '').trim().split(/\s+/).filter(Boolean);
  if (!palavras.length) return [''];
  const linhas = [];
  let atual = palavras[0];
  for (let indice = 1; indice < palavras.length; indice += 1) {
    const teste = `${atual} ${palavras[indice]}`;
    if (ctx.measureText(teste).width <= larguraMaxima) atual = teste;
    else {
      linhas.push(atual);
      atual = palavras[indice];
    }
  }
  linhas.push(atual);
  return linhas;
}

function desenharImagemDeFundo(ctx, imagem, largura, altura) {
  const proporcaoImagem = imagem.naturalWidth / imagem.naturalHeight;
  const proporcaoCanvas = largura / altura;
  let larguraDesenho = largura;
  let alturaDesenho = altura;
  let x = 0;
  let y = 0;
  if (proporcaoImagem > proporcaoCanvas) {
    larguraDesenho = altura * proporcaoImagem;
    x = (largura - larguraDesenho) / 2;
  } else {
    alturaDesenho = largura / proporcaoImagem;
    y = (altura - alturaDesenho) / 2;
  }
  ctx.drawImage(imagem, x, y, larguraDesenho, alturaDesenho);
  ctx.fillStyle = 'rgba(7, 20, 36, .62)';
  ctx.fillRect(0, 0, largura, altura);
}

function fecharModal(modal) {
  const objetoUrl = modal.dataset.objetoUrl;
  if (objetoUrl) URL.revokeObjectURL(objetoUrl);
  modal.remove();
}

function mostrarImagemGerada(url, formato) {
  document.querySelectorAll('[data-modal-colecao="imagem"]').forEach(fecharModal);
  const modal = document.createElement('div');
  modal.dataset.modalColecao = 'imagem';
  modal.dataset.objetoUrl = url;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Prévia da imagem gerada');
  modal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.92);color:#fff;text-align:center;';
  modal.innerHTML = `<p style="margin:0 0 12px;font-weight:800;">Imagem ${formato === 'feed' ? 'Feed' : 'Story'} pronta!</p><img src="${url}" alt="Imagem gerada da frase" style="width:min(100%,360px);max-height:62vh;object-fit:contain;border-radius:12px;"><a href="${url}" download="${nomeArquivo('imagem', formato)}.png" style="margin-top:16px;padding:12px 22px;border-radius:9px;background:#2563eb;color:#fff;font-weight:800;text-decoration:none;">⬇️ Baixar imagem</a><p style="max-width:360px;margin:12px 0;font-size:13px;line-height:1.4;">No celular, se a imagem abrir em vez de baixar, toque e segure para escolher <strong>Salvar imagem</strong>.</p><button type="button" data-fechar-modal style="padding:11px 24px;border:0;border-radius:8px;background:#ef4444;color:#fff;font-weight:800;">Fechar</button>`;
  modal.querySelector('[data-fechar-modal]')?.addEventListener('click', () => fecharModal(modal));
  modal.addEventListener('click', (evento) => { if (evento.target === modal) fecharModal(modal); });
  document.body.appendChild(modal);
}

async function gerarImagem(botao, formato) {
  const card = botao.closest('[data-frase-card]');
  const texto = card?.dataset.texto || '';
  if (!texto) return;
  const rotulo = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Gerando...';
  try {
    const largura = 1080;
    const altura = formato === 'feed' ? 1080 : 1920;
    const tamanhoTexto = formato === 'feed' ? 56 : 72;
    const imagem = await carregarImagem(IMAGEM_PADRAO);
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível preparar a imagem.');
    desenharImagemDeFundo(ctx, imagem, largura, altura);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.85)';
    ctx.shadowBlur = 14;
    ctx.font = `700 ${tamanhoTexto}px Arial, sans-serif`;
    const linhas = quebrarLinhas(ctx, texto, largura - 140);
    const alturaLinha = tamanhoTexto * 1.38;
    const inicio = (altura - (linhas.length * alturaLinha + 170)) / 2 + (alturaLinha / 2);
    linhas.forEach((linha, indice) => ctx.fillText(`“${linha}”`, largura / 2, inicio + (indice * alturaLinha)));
    ctx.font = `600 ${formato === 'feed' ? 38 : 46}px Arial, sans-serif`;
    ctx.fillText('— Messias', largura / 2, inicio + (linhas.length * alturaLinha) + 55);
    ctx.shadowColor = 'transparent';
    ctx.font = `800 ${formato === 'feed' ? 28 : 34}px Arial, sans-serif`;
    ctx.fillText('Frases de Messias', largura / 2, altura - 82);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Não foi possível criar a imagem.');
    mostrarImagemGerada(URL.createObjectURL(blob), formato);
  } catch (erro) {
    console.error('Erro ao gerar imagem da coleção:', erro);
    alert(`Não foi possível gerar a imagem agora. ${erro.message || 'Tente novamente.'}`);
  } finally {
    botao.disabled = false;
    botao.textContent = rotulo;
  }
}

async function baixarVideo(url, arquivo, mensagem) {
  if (ehAplicativoAndroid()) {
    try {
      const iniciado = window.AndroidDownloader.baixarVideo(url, arquivo);
      if (iniciado !== false) {
        mensagem.textContent = 'Download iniciado. Confira a pasta Downloads do celular.';
        return;
      }
    } catch (erro) {
      console.warn('Download nativo indisponível:', erro);
    }
  }
  try {
    const resposta = await fetch(url, { cache: 'no-store', mode: 'cors' });
    if (!resposta.ok) throw new Error('O arquivo não respondeu corretamente.');
    const blob = await resposta.blob();
    if (!blob.size) throw new Error('O arquivo está vazio.');
    const objetoUrl = URL.createObjectURL(blob);
    iniciarDownload(objetoUrl, arquivo);
    window.setTimeout(() => URL.revokeObjectURL(objetoUrl), 60000);
    mensagem.textContent = 'Download iniciado. Confira a pasta Downloads.';
  } catch (erro) {
    console.warn('Download por arquivo local indisponível:', erro);
    window.open(url, '_blank', 'noopener,noreferrer');
    mensagem.textContent = 'Abrimos o MP4 para você concluir o download no navegador.';
  }
}

function mostrarVideoGerado(url, downloadUrl, formato) {
  document.querySelectorAll('[data-modal-colecao="video"]').forEach((modal) => modal.remove());
  const modal = document.createElement('div');
  const arquivo = `${nomeArquivo('video', formato)}.mp4`;
  modal.dataset.modalColecao = 'video';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Vídeo gerado');
  modal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.92);color:#fff;text-align:center;overflow:auto;';
  modal.innerHTML = `<p style="margin:0 0 12px;font-weight:800;">Vídeo MP4 ${formato === 'feed' ? 'Feed' : 'Story'} pronto!</p><video controls playsinline preload="metadata" poster="${IMAGEM_PADRAO}" style="width:min(100%,360px);max-height:58vh;border-radius:12px;background:#111;object-fit:contain;"><source src="${url}" type="video/mp4"></video><button type="button" data-baixar-mp4 style="margin-top:16px;padding:12px 22px;border:0;border-radius:9px;background:#2563eb;color:#fff;font-weight:800;">⬇️ Baixar MP4</button><p data-status-download style="max-width:360px;margin:12px 0;font-size:13px;line-height:1.4;">Toque em Baixar MP4 para salvar no seu celular.</p><button type="button" data-fechar-modal style="padding:11px 24px;border:0;border-radius:8px;background:#ef4444;color:#fff;font-weight:800;">Fechar</button>`;
  const status = modal.querySelector('[data-status-download]');
  modal.querySelector('[data-baixar-mp4]')?.addEventListener('click', () => baixarVideo(downloadUrl || `${url}?download=1`, arquivo, status));
  modal.querySelector('[data-fechar-modal]')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (evento) => { if (evento.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

async function gerarVideo(botao, formato) {
  const card = botao.closest('[data-frase-card]');
  const texto = card?.dataset.texto || '';
  if (!texto) return;
  const rotulo = botao.textContent;
  botao.disabled = true;
  botao.textContent = '⏳ Gerando MP4...';
  try {
    const resposta = await fetch(`${origemApiVideo()}/api/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: IMAGEM_PADRAO, texto, autor: 'Messias', formato })
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok || !dados.ok || !dados.url) throw new Error(dados.error || `Falha HTTP ${resposta.status}.`);
    mostrarVideoGerado(dados.url, dados.downloadUrl, formato);
  } catch (erro) {
    console.error('Erro ao gerar vídeo da coleção:', erro);
    alert(`Não foi possível gerar o vídeo agora. ${erro.message || 'Tente novamente em instantes.'}`);
  } finally {
    botao.disabled = false;
    botao.textContent = rotulo;
  }
}

document.addEventListener('click', async (evento) => {
  const alternar = evento.target.closest('[data-alternar-download]');
  if (alternar) {
    abrirOpcoesDownload(alternar);
    return;
  }

  const imagem = evento.target.closest('[data-baixar-imagem]');
  if (imagem) {
    await gerarImagem(imagem, imagem.dataset.baixarImagem || 'story');
    return;
  }

  const video = evento.target.closest('[data-baixar-video]');
  if (video) {
    await gerarVideo(video, video.dataset.baixarVideo || 'story');
    return;
  }

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
