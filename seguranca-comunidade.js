import { db } from "./firebase.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

export const MOTIVOS_DENUNCIA = [
  "Ofensa, assédio ou ameaça",
  "Discriminação ou discurso de ódio",
  "Spam, golpe ou publicidade indevida",
  "Conteúdo impróprio ou violento",
  "Violação de direitos autorais",
  "Outro motivo"
];

function textoLimpo(valor = "") {
  return String(valor).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function idSeguro(valor = "") {
  return String(valor).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 180);
}

function identificadorDenuncia(denuncianteId, alvoTipo, publicacaoId, comentarioId, autorAlvoId) {
  const alvo = idSeguro(comentarioId || publicacaoId || autorAlvoId || "perfil");
  return `${idSeguro(denuncianteId)}_${idSeguro(alvoTipo)}_${alvo}`.slice(0, 380);
}

export async function registrarDenuncia({
  denuncianteId,
  alvoTipo,
  publicacaoId = "",
  comentarioId = "",
  autorAlvoId,
  autorAlvoNome = "",
  conteudo = "",
  motivo,
  detalhes = ""
}) {
  const id = identificadorDenuncia(denuncianteId, alvoTipo, publicacaoId, comentarioId, autorAlvoId);
  const dados = {
    denuncianteId: idSeguro(denuncianteId),
    alvoTipo: textoLimpo(alvoTipo).slice(0, 20),
    publicacaoId: idSeguro(publicacaoId),
    comentarioId: idSeguro(comentarioId),
    autorAlvoId: idSeguro(autorAlvoId),
    autorAlvoNome: textoLimpo(autorAlvoNome).slice(0, 48),
    conteudo: textoLimpo(conteudo).slice(0, 360),
    motivo: textoLimpo(motivo).slice(0, 80),
    detalhes: textoLimpo(detalhes).slice(0, 240),
    status: "aberta",
    criadoEm: serverTimestamp()
  };

  await setDoc(doc(db, "comunidadeDenuncias", id), dados);
}

export async function carregarBloqueios(usuarioId) {
  const resultado = await getDocs(collection(db, "comunidadeUsuarios", usuarioId, "bloqueados"));
  return new Set(resultado.docs.map((item) => item.id));
}

export async function alternarBloqueio(usuarioId, usuarioAlvoId, deveBloquear) {
  const alvo = idSeguro(usuarioAlvoId);
  if (!alvo || alvo === usuarioId) throw new Error("Perfil inválido para bloqueio.");
  const referencia = doc(db, "comunidadeUsuarios", usuarioId, "bloqueados", alvo);
  if (deveBloquear) {
    await setDoc(referencia, { usuarioId: alvo, criadoEm: serverTimestamp() });
  } else {
    await deleteDoc(referencia);
  }
}

export function mensagemDeErroSeguranca(erro, padrao) {
  const codigo = String(erro?.code || "");
  if (codigo.includes("permission-denied")) {
    return "Esta ação não está disponível para sua conta no momento.";
  }
  if (codigo.includes("already-exists")) {
    return "Esta denúncia já foi enviada e está em análise.";
  }
  return padrao;
}
