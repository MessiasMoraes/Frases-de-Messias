import { app, db } from "./firebase.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp
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
  template: $("templatePendencia")
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
  const nome = textoLimpo(eDenuncia ? dados.autorAlvoNome : eRestricao ? dados.usuarioNome : dados.autorNome) || "Membro da comunidade";
  const rotulo = eDenuncia
    ? `DENÚNCIA · ${textoLimpo(dados.alvoTipo || "conteúdo").toUpperCase()}`
    : eRestricao ? "CONTA RESTRITA" : eComentario ? "COMENTÁRIO PENDENTE" : "FRASE PENDENTE";

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
    botaoAprovar.textContent = eComentario ? "✓ Aprovar comentário" : "✓ Aprovar publicação";
    botaoAprovar.addEventListener("click", async () => {
      const descricaoConteudo = eComentario ? "comentário" : "publicação";
      if (!confirm(`Aprovar este ${descricaoConteudo} e exibi-lo publicamente?`)) return;
      await executarAcao(pendencia, cartao, mensagemCartao, "aprovar");
    });
    botaoRecusar.addEventListener("click", async () => {
      const descricaoConteudo = eComentario ? "comentário" : "publicação";
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
      await updateDoc(pendencia.referencia, {
        status: "publicado",
        publicadoEm: serverTimestamp(),
        moderadoPor: auth.currentUser.uid
      });
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

  if (autorizado) observarPendencias();
  else limparObservadores();
});
