import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Cole aqui a mesma configuração do firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyAdPWj_82SH4EqALPRApgUYuLdxGgl-DGA",
  authDomain: "frases-de-messias-ca952.firebaseapp.com",
  projectId: "frases-de-messias-ca952",
  storageBucket: "frases-de-messias-ca952.firebasestorage.app",
  messagingSenderId: "450273738706",
  appId: "1:450273738706:web:da402ceac24dc880f5520b"
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
