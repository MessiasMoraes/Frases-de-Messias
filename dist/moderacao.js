import { app, db } from "./firebase.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const EMAIL_ADMINISTRADOR = "moraesoficialll@gmail.com";
const auth = getAuth(app);
const $ = (id) => document.getElementById(id);
const refs = {
  login: $("loginModeracao"),
  painel: $("painelModeracao"),
  formulario: $("formularioLoginModeracao"),
  email: $("emailModeracao"),
  senha: $("senhaModeracao"),
  mensagem: $("mensagemLoginModeracao"),
  sair: $("sairModeracao"),
  total: $("totalPendencias"),
  lista: $("listaPendencias"),
  template: $("templatePendencia"),
  atualizarEstatisticas: $("atualizarEstatisticas"),
  atualizacaoEstatisticas: $("atualizacaoEstatisticas"),
  membros: $("estatisticaMembros"),
  publicacoes: $("estatisticaPublicacoes"),
  comentarios: $("estatisticaComentarios"),
  seguidores: $("estatisticaSeguidores"),
  visitas: $("estatisticaVisitas"),
  publicacoesPendentes: $("estatisticaPublicacoesPendentes"),
  comentariosPendentes: $("estatisticaComentariosPendentes"),
  denuncias: $("estatisticaDenuncias"),
  restricoes: $("estatisticaRestricoes"),
  resumoPublicadas: $("resumoPublicadas"),
  resumoPendentes: $("resumoPendentes"),
  resumoRemovidas: $("resumoRemovidas"),
  barraPublicadas: $("barraPublicadas"),
  barraPendentes: $("barraPendentes"),
  barraRemovidas: $("barraRemovidas")
};

let cancelarPublicacoes = null;
let cancelarComentarios = null;
let cancelarDenuncias = null;
let cancelarRestricoes = null;
let pendenciasPublicacoes = [];
let pendenciasComentarios = [];
let denunciasAbertas = [];
let restricoesAtivas = [];

function textoLimpo(valor = "") {
  return String(valor).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function iniciais(nome) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((item) => item[0]).join("").toUpperCase() || "FM";
}

function dataFormatada(valor) {
  const data = valor?.toDate?.();
  return data ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(data) : "Enviada agora";
}

function valorData(valor) {
  return valor?.toMillis?.() || 0;
}

function mensagem(texto = "", erro = false) {
  refs.mensagem.textContent = texto;
  refs.mensagem.classList.toggle("erro", erro);
}

function eAdministrador(usuario) {
  return usuario?.email?.toLowerCase() === EMAIL_ADMINISTRADOR;
}

function formatarNumero(valor) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(Math.max(0, Number(valor) || 0));
}

function definirIndicador(referencia, valor) {
  referencia.textContent = Number.isFinite(valor) ? formatarNumero(valor) : "—";
}

async function contarRegistros(consulta) {
  const resultado = await getCountFromServer(consulta);
  return Number(resultado.data().count || 0);
}

function atualizarResumoDePublicacoes(publicadas, pendentes, removidas) {
  definirIndicador(refs.resumoPublicadas, publicadas);
  definirIndicador(refs.resumoPendentes, pendentes);
  definirIndicador(refs.resumoRemovidas, removidas);

  const total = publicadas + pendentes + removidas;
  const largura = (valor) => `${total ? Math.max(0, (valor / total) * 100) : 0}%`;
  refs.barraPublicadas.style.width = largura(publicadas);
  refs.barraPendentes.style.width = largura(pendentes);
  refs.barraRemovidas.style.width = largura(removidas);
  const descricao = `${formatarNumero(publicadas)} publicadas, ${formatarNumero(pendentes)} pendentes e ${formatarNumero(removidas)} removidas.`;
  refs.barraPublicadas.parentElement.setAttribute("aria-label", descricao);
}

async function carregarEstatisticas() {
  refs.atualizarEstatisticas.disabled = true;
  refs.atualizacaoEstatisticas.textContent = "Atualizando indicadores...";

  const publicacoes = collection(db, "comunidadePublicacoes");
  const resultados = await Promise.allSettled([
    contarRegistros(collection(db, "comunidadePerfis")),
    contarRegistros(query(publicacoes, where("status", "==", "publicado"))),
    contarRegistros(query(collectionGroup(db, "comentarios"), where("status", "==", "publicado"))),
    contarRegistros(collectionGroup(db, "seguidores")),
    contarRegistros(query(publicacoes, where("status", "==", "pendente"))),
    contarRegistros(query(collectionGroup(db, "comentarios"), where("status", "==", "pendente"))),
    contarRegistros(query(collection(db, "comunidadeDenuncias"), where("status", "==", "aberta"))),
    contarRegistros(collection(db, "comunidadeRestricoes")),
    contarRegistros(query(publicacoes, where("status", "==", "removido"))),
    getDoc(doc(db, "estatisticas", "global"))
  ]);

  const valor = (indice) => resultados[indice]?.status === "fulfilled" ? resultados[indice].value : NaN;
  const membros = valor(0);
  const publicadas = valor(1);
  const comentarios = valor(2);
  const seguidores = valor(3);
  const publicacoesPendentes = valor(4);
  const comentariosPendentes = valor(5);
  const denuncias = valor(6);
  const restricoes = valor(7);
  const removidas = valor(8);
  const documentoVisitas = resultados[9]?.status === "fulfilled" ? resultados[9].value : null;
  const visitas = documentoVisitas?.exists?.() ? Number(documentoVisitas.data()?.visitas || 0) : 0;

  definirIndicador(refs.membros, membros);
  definirIndicador(refs.publicacoes, publicadas);
  definirIndicador(refs.comentarios, comentarios);
  definirIndicador(refs.seguidores, seguidores);
  definirIndicador(refs.visitas, visitas);
  definirIndicador(refs.publicacoesPendentes, publicacoesPendentes);
  definirIndicador(refs.comentariosPendentes, comentariosPendentes);
  definirIndicador(refs.denuncias, denuncias);
  definirIndicador(refs.restricoes, restricoes);

  if ([publicadas, publicacoesPendentes, removidas].every(Number.isFinite)) {
    atualizarResumoDePublicacoes(publicadas, publicacoesPendentes, removidas);
  }

  const falhas = resultados.filter((resultado) => resultado.status === "rejected").length;
  refs.atualizacaoEstatisticas.textContent = falhas
    ? `Atualizado com ${falhas} indicador(es) indisponível(is).`
    : `Dados atualizados em ${new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date())}.`;
  refs.atualizarEstatisticas.disabled = false;
}

function limparObservadores() {
  if (cancelarPublicacoes) cancelarPublicacoes();
  if (cancelarComentarios) cancelarComentarios();
  if (cancelarDenuncias) cancelarDenuncias();
  if (cancelarRestricoes) cancelarRestricoes();
  cancelarPublicacoes = null;
  cancelarComentarios = null;
  cancelarDenuncias = null;
  cancelarRestricoes = null;
  pendenciasPublicacoes = [];
  pendenciasComentarios = [];
  denunciasAbertas = [];
  restricoesAtivas = [];
}

function renderizarPendencias() {
  const pendencias = [...denunciasAbertas, ...restricoesAtivas, ...pendenciasPublicacoes, ...pendenciasComentarios]
    .sort((primeira, segunda) => valorData(segunda.dados.criadoEm || segunda.dados.restritoEm) - valorData(primeira.dados.criadoEm || primeira.dados.restritoEm));

  refs.total.textContent = String(pendencias.length);
  refs.lista.innerHTML = "";

  if (!pendencias.length) {
    refs.lista.innerHTML = '<div class="estado-feed">Tudo em ordem. Não há conteúdos nem denúncias aguardando análise.</div>';
    return;
  }

  pendencias.forEach((pendencia) => refs.lista.appendChild(criarPendencia(pendencia)));
}

function observarPendencias() {
  limparObservadores();

  const consultaPublicacoes = query(
    collection(db, "comunidadePublicacoes"),
    where("status", "==", "pendente")
  );
  const consultaComentarios = query(
    collectionGroup(db, "comentarios"),
    where("status", "==", "pendente")
  );
  const consultaDenuncias = query(
    collection(db, "comunidadeDenuncias"),
    where("status", "==", "aberta")
  );
  const consultaRestricoes = collection(db, "comunidadeRestricoes");

  cancelarPublicacoes = onSnapshot(consultaPublicacoes, (resultado) => {
    pendenciasPublicacoes = resultado.docs.map((item) => ({
      tipo: "publicacao",
      referencia: item.ref,
      dados: item.data()
    }));
    renderizarPendencias();
  }, (erro) => {
    console.error("Erro ao carregar publicações pendentes.", erro);
    refs.lista.innerHTML = '<div class="estado-feed">Não foi possível carregar a fila de publicações. Verifique as regras do Firestore e tente novamente.</div>';
  });

  cancelarComentarios = onSnapshot(consultaComentarios, (resultado) => {
    pendenciasComentarios = resultado.docs.map((item) => ({
      tipo: "comentario",
      referencia: item.ref,
      dados: item.data(),
      publicacaoId: item.ref.parent.parent?.id || ""
    }));
    renderizarPendencias();
  }, (erro) => {
    console.error("Erro ao carregar comentários pendentes.", erro);
    refs.lista.innerHTML = '<div class="estado-feed">Não foi possível carregar a fila de comentários. Verifique as regras do Firestore e tente novamente.</div>';
  });

  cancelarDenuncias = onSnapshot(consultaDenuncias, (resultado) => {
    denunciasAbertas = resultado.docs.map((item) => ({
      tipo: "denuncia",
      referencia: item.ref,
      dados: item.data()
    }));
    renderizarPendencias();
  }, (erro) => {
    console.error("Erro ao carregar denúncias.", erro);
    refs.lista.innerHTML = '<div class="estado-feed">Não foi possível carregar a fila de denúncias. Verifique as regras do Firestore e tente novamente.</div>';
  });

  cancelarRestricoes = onSnapshot(consultaRestricoes, (resultado) => {
    restricoesAtivas = resultado.docs.map((item) => ({
      tipo: "restricao",
      referencia: item.ref,
      dados: item.data()
    }));
    renderizarPendencias();
  }, (erro) => {
    console.error("Erro ao carregar restrições.", erro);
    refs.lista.innerHTML = '<div class="estado-feed">Não foi possível carregar as contas restritas. Verifique as regras do Firestore e tente novamente.</div>';
  });
}

function criarPendencia(pendencia) {
  const { dados, tipo, publicacaoId } = pendencia;
  const fragmento = refs.template.content.cloneNode(true);
  const cartao = fragmento.querySelector(".cartao-pendencia");
  const eDenuncia = tipo === "denuncia";
  const eRestricao = tipo === "restricao";
  const eComentario = tipo === "comentario";
  const eResposta = eComentario && Boolean(textoLimpo(dados.parentId));
  const nome = textoLimpo(eDenuncia ? dados.autorAlvoNome : eRestricao ? dados.usuarioNome : dados.autorNome) || "Membro da comunidade";
  const rotulo = eDenuncia
    ? `DENÚNCIA · ${textoLimpo(dados.alvoTipo || "conteúdo").toUpperCase()}`
    : eRestricao ? "CONTA RESTRITA" : eComentario ? (eResposta ? "RESPOSTA PENDENTE" : "COMENTÁRIO PENDENTE") : "FRASE PENDENTE";

  fragmento.querySelector(".avatar-publicacao").textContent = iniciais(nome);
  fragmento.querySelector(".nome-pendencia").textContent = nome;
  fragmento.querySelector(".meta-pendencia").textContent = eDenuncia
    ? `Denunciado em ${dataFormatada(dados.criadoEm)}`
    : eRestricao ? `Restrita em ${dataFormatada(dados.restritoEm)}` : dataFormatada(dados.criadoEm);
  fragmento.querySelector(".selo-categoria").textContent = eDenuncia || eRestricao
    ? textoLimpo(dados.motivo || "Denúncia")
    : eComentario
      ? `Comentário${publicacaoId ? ` · Publicação ${publicacaoId.slice(0, 6)}` : ""}`
      : textoLimpo(dados.categoria || "Inspiração");
  fragmento.querySelector(".tipo-pendencia").textContent = rotulo;
  const descricao = eDenuncia
    ? `Conteúdo denunciado: “${textoLimpo(dados.conteudo)}”${dados.detalhes ? `\n\nDetalhes informados: ${textoLimpo(dados.detalhes)}` : ""}`
    : eRestricao
      ? "Esta conta está impedida de criar novas publicações, comentários, curtidas, salvos e relações de seguimento na Comunidade."
      : `“${textoLimpo(dados.texto)}”`;
  fragmento.querySelector(".texto-pendencia").textContent = descricao;

  const mensagemCartao = fragmento.querySelector(".mensagem-moderacao");
  const botaoAprovar = fragmento.querySelector(".botao-aprovar");
  const botaoRecusar = fragmento.querySelector(".botao-recusar");
  const botaoBloquear = fragmento.querySelector(".botao-bloquear-conta");

  if (eRestricao) {
    botaoAprovar.textContent = "Liberar conta";
    botaoRecusar.hidden = true;
    botaoBloquear.hidden = true;
    botaoAprovar.addEventListener("click", async () => {
      if (!confirm(`Liberar a conta de ${nome} para voltar a interagir na Comunidade?`)) return;
      await executarAcao(pendencia, cartao, mensagemCartao, "liberar");
    });
  } else if (eDenuncia) {
    botaoAprovar.textContent = dados.publicacaoId || dados.comentarioId ? "Ocultar conteúdo" : "Concluir análise";
    botaoRecusar.textContent = "Arquivar denúncia";
    botaoBloquear.hidden = !dados.autorAlvoId;
    botaoAprovar.addEventListener("click", async () => {
      const texto = dados.publicacaoId || dados.comentarioId
        ? "Ocultar este conteúdo do portal? A denúncia será marcada como resolvida."
        : "Concluir esta denúncia sem ocultar conteúdo?";
      if (!confirm(texto)) return;
      await executarAcao(pendencia, cartao, mensagemCartao, "ocultar");
    });
    botaoRecusar.addEventListener("click", async () => {
      if (!confirm("Arquivar esta denúncia sem aplicar nenhuma medida ao conteúdo?")) return;
      await executarAcao(pendencia, cartao, mensagemCartao, "arquivar");
    });
    botaoBloquear.addEventListener("click", async () => {
      if (!confirm(`Restringir a conta de ${nome}? Ela não poderá criar novas publicações, comentários, curtidas ou seguir perfis até que a restrição seja removida.`)) return;
      await executarAcao(pendencia, cartao, mensagemCartao, "bloquear");
    });
  } else {
    botaoAprovar.textContent = eComentario ? (eResposta ? "✓ Aprovar resposta" : "✓ Aprovar comentário") : "✓ Aprovar publicação";
    botaoAprovar.addEventListener("click", async () => {
      const descricaoConteudo = eComentario ? (eResposta ? "resposta" : "comentário") : "publicação";
      if (!confirm(`Aprovar este ${descricaoConteudo} e exibi-lo publicamente?`)) return;
      await executarAcao(pendencia, cartao, mensagemCartao, "aprovar");
    });
    botaoRecusar.addEventListener("click", async () => {
      const descricaoConteudo = eComentario ? (eResposta ? "resposta" : "comentário") : "publicação";
      if (!confirm(`Recusar e excluir este ${descricaoConteudo} pendente? Esta ação não pode ser desfeita.`)) return;
      await executarAcao(pendencia, cartao, mensagemCartao, "recusar");
    });
  }

  return fragmento;
}

function referenciaDoConteudoDenunciado(dados) {
  if (dados.alvoTipo === "publicacao" && dados.publicacaoId) {
    return doc(db, "comunidadePublicacoes", dados.publicacaoId);
  }
  if (dados.alvoTipo === "comentario" && dados.publicacaoId && dados.comentarioId) {
    return doc(db, "comunidadePublicacoes", dados.publicacaoId, "comentarios", dados.comentarioId);
  }
  return null;
}

async function executarAcao(pendencia, cartao, alvoMensagem, acao) {
  const botoes = cartao.querySelectorAll("button");
  botoes.forEach((botao) => { botao.disabled = true; });
  const mensagens = {
    aprovar: "Publicando...",
    recusar: "Recusando...",
    ocultar: "Ocultando conteúdo...",
    arquivar: "Arquivando denúncia...",
    bloquear: "Restringindo conta...",
    liberar: "Liberando conta..."
  };
  alvoMensagem.textContent = mensagens[acao] || "Processando...";

  try {
    if (pendencia.tipo === "restricao") {
      if (acao === "liberar") await deleteDoc(pendencia.referencia);
      return;
    }

    if (pendencia.tipo === "denuncia") {
      const dados = pendencia.dados;
      if (acao === "arquivar") {
        await updateDoc(pendencia.referencia, {
          status: "arquivada",
          resolvidaEm: serverTimestamp(),
          moderadoPor: auth.currentUser.uid
        });
      } else if (acao === "ocultar") {
        const conteudo = referenciaDoConteudoDenunciado(dados);
        if (conteudo) {
          await updateDoc(conteudo, {
            status: "removido",
            removidoEm: serverTimestamp(),
            removidoPor: auth.currentUser.uid,
            motivoRemocao: dados.motivo || "Denúncia da comunidade"
          });
        }
        await updateDoc(pendencia.referencia, {
          status: conteudo ? "conteudo_ocultado" : "concluida_sem_conteudo",
          resolvidaEm: serverTimestamp(),
          moderadoPor: auth.currentUser.uid
        });
      } else if (acao === "bloquear") {
        await setDoc(doc(db, "comunidadeRestricoes", dados.autorAlvoId), {
          usuarioId: dados.autorAlvoId,
          motivo: textoLimpo(dados.motivo || "Violação das regras da Comunidade").slice(0, 120),
          origemDenunciaId: pendencia.referencia.id,
          usuarioNome: textoLimpo(dados.autorAlvoNome || "Membro da comunidade").slice(0, 48),
          restritoEm: serverTimestamp(),
          restritoPor: auth.currentUser.uid
        });
        await updateDoc(pendencia.referencia, {
          status: "conta_restrita",
          resolvidaEm: serverTimestamp(),
          moderadoPor: auth.currentUser.uid
        });
      }
      return;
    }

    if (acao === "aprovar") {
      const atualizacao = {
        status: "publicado",
        publicadoEm: serverTimestamp(),
        moderadoPor: auth.currentUser.uid
      };

      if (pendencia.tipo === "comentario") {
        const autorId = textoLimpo(pendencia.dados.autorId);
        const publicacaoId = textoLimpo(pendencia.publicacaoId);
        const comentarioId = textoLimpo(pendencia.referencia.id);
        const lote = writeBatch(db);
        lote.update(pendencia.referencia, atualizacao);
        if (autorId && autorId !== auth.currentUser.uid && publicacaoId && comentarioId) {
          lote.set(doc(db, "comunidadeUsuarios", autorId, "notificacoes", `comentario_${comentarioId}`), {
            tipo: "comentario_aprovado",
            atorId: auth.currentUser.uid,
            atorNome: "Moderação Frases de Messias",
            publicacaoId,
            comentarioId,
            texto: textoLimpo(pendencia.dados.parentId)
              ? "Sua resposta foi aprovada e já está visível."
              : "Seu comentário foi aprovado e já está visível.",
            lida: false,
            criadoEm: serverTimestamp()
          });
        }
        await lote.commit();
      } else {
        await updateDoc(pendencia.referencia, atualizacao);
      }
    } else {
      await updateDoc(pendencia.referencia, {
        status: "removido",
        removidoEm: serverTimestamp(),
        removidoPor: auth.currentUser.uid,
        motivoRemocao: "Recusado pela moderação"
      });
    }
  } catch (erro) {
    console.error("Erro de moderação.", erro);
    alvoMensagem.textContent = "Não foi possível concluir esta ação. Verifique sua conexão e as regras do Firestore.";
    botoes.forEach((botao) => { botao.disabled = false; });
  }
}

refs.formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagem("Entrando...");
  try {
    await signInWithEmailAndPassword(auth, refs.email.value.trim(), refs.senha.value);
  } catch (erro) {
    console.error("Erro no login da moderação.", erro);
    mensagem("Não foi possível entrar com este e-mail e senha.", true);
  }
});

refs.sair.addEventListener("click", () => signOut(auth));
refs.atualizarEstatisticas.addEventListener("click", () => { void carregarEstatisticas(); });

onAuthStateChanged(auth, (usuario) => {
  const autorizado = eAdministrador(usuario);
  refs.login.hidden = Boolean(usuario);
  refs.painel.hidden = !autorizado;
  refs.sair.hidden = !autorizado;

  if (usuario && !autorizado) {
    refs.login.hidden = false;
    refs.painel.hidden = true;
    mensagem("Esta conta não possui permissão de moderação.", true);
    signOut(auth);
    return;
  }

  if (autorizado) {
    observarPendencias();
    void carregarEstatisticas();
  } else {
    limparObservadores();
  }
});
