import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Cole aqui a mesma configuração do firebase.js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const btn = document.getElementById("importar");
const status = document.getElementById("status");

btn.onclick = async () => {
  btn.disabled = true;
  status.innerHTML = "Importando...";

  try {

    const resposta = await fetch("./frases.json");
    const frases = await resposta.json();

    let total = 0;

    for (const frase of frases) {

      await addDoc(collection(db, "frases"), {
        categoria: frase.categoria,
        texto: frase.texto,
        autor: frase.autor || "Messias",
        curtidas: 0,
        visualizacoes: 0,
        compartilhamentos: 0,
        imagem: frase.imagem || ""
      });

      total++;

      status.innerHTML = `Importadas ${total} de ${frases.length}`;
    }

    status.innerHTML =
      `✅ Importação concluída.<br>${total} frases adicionadas.`;

  } catch (e) {
    console.error(e);
    status.innerHTML = "Erro: " + e.message;
  }

  btn.disabled = false;
};
