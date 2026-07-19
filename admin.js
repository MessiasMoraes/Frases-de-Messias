import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

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
const auth = getAuth(app);

// Login
const loginContainer = document.getElementById("loginContainer");
const painel = document.getElementById("painel");

const email = document.getElementById("email");
const senha = document.getElementById("senha");

const btnLogin = document.getElementById("btnLogin");
const btnSair = document.getElementById("btnSair");

// Cadastro
const autor = document.getElementById("autor");
const categoria = document.getElementById("categoria");
const texto = document.getElementById("texto");
const btnSalvar = document.getElementById("btnSalvar");

// Lista
const listaFrases = document.getElementById("listaFrases");
const totalFrases = document.getElementById("totalFrases");
const pesquisa = document.getElementById("pesquisa");

// Modal
const modalEditar = document.getElementById("modalEditar");
const editId = document.getElementById("editId");
const editAutor = document.getElementById("editAutor");
const editCategoria = document.getElementById("editCategoria");
const editTexto = document.getElementById("editTexto");

const btnAtualizar = document.getElementById("btnAtualizar");
const btnCancelar = document.getElementById("btnCancelar");

let frases = [];

// LOGIN
btnLogin.addEventListener("click", async () => {

  if (!email.value || !senha.value) {
    alert("Informe o e-mail e a senha.");
    return;
  }

  try {

    await signInWithEmailAndPassword(
      auth,
      email.value,
      senha.value
    );

  } catch (e) {

    alert("E-mail ou senha inválidos.");

  }

});

// LOGOUT
btnSair.addEventListener("click", async () => {

  await signOut(auth);

});

// CONTROLE DE LOGIN
onAuthStateChanged(auth, (user) => {

  if (user) {

    loginContainer.style.display = "none";
    painel.style.display = "block";

    carregarFrases();

  } else {

    loginContainer.style.display = "block";
    painel.style.display = "none";

  }

});
// ==========================
// CARREGAR FRASES
// ==========================

async function carregarFrases() {

  frases = [];

  listaFrases.innerHTML = "<p>Carregando frases...</p>";

  try {

    const consulta = await getDocs(collection(db, "frases"));

    consulta.forEach((item) => {

      frases.push({
        id: item.id,
        ...item.data()
      });

    });

    totalFrases.textContent = frases.length;

    mostrarLista(frases);

  } catch (erro) {

    console.error(erro);

    listaFrases.innerHTML =
      "<p>Erro ao carregar as frases.</p>";

  }

}

// ==========================
// MOSTRAR LISTA
// ==========================

function mostrarLista(lista) {

  listaFrases.innerHTML = "";

  if (lista.length === 0) {

    listaFrases.innerHTML =
      "<p>Nenhuma frase encontrada.</p>";

    return;

  }

  lista.forEach((f) => {

    const card = document.createElement("div");

    card.className = "frase";

    card.innerHTML = `
      <h3>${f.categoria}</h3>

      <p>${f.texto}</p>

      <small>${f.autor || "Sem autor"}</small>

      <br><br>

      <button class="btnEditar">✏️ Editar</button>

      <button class="btnExcluir">🗑️ Excluir</button>
    `;

    // EDITAR
    card.querySelector(".btnEditar").addEventListener("click", () => {

      editId.value = f.id;
      editAutor.value = f.autor || "";
      editCategoria.value = f.categoria;
      editTexto.value = f.texto;

      modalEditar.style.display = "flex";

    });

    // EXCLUIR
    card.querySelector(".btnExcluir").addEventListener("click", async () => {

      if (!confirm("Deseja excluir esta frase?")) return;

      await deleteDoc(doc(db, "frases", f.id));

      carregarFrases();

    });

    listaFrases.appendChild(card);

  });

}

// ==========================
// PESQUISA
// ==========================

pesquisa.addEventListener("input", () => {

  const filtro = pesquisa.value.toLowerCase();

  const resultado = frases.filter((f) =>
    (f.texto || "").toLowerCase().includes(filtro) ||
    (f.categoria || "").toLowerCase().includes(filtro) ||
    (f.autor || "").toLowerCase().includes(filtro)
  );

  mostrarLista(resultado);

});
