import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
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

const loginContainer = document.getElementById("loginContainer");
const painel = document.getElementById("painel");

const email = document.getElementById("email");
const senha = document.getElementById("senha");

const btnLogin = document.getElementById("btnLogin");
const btnSair = document.getElementById("btnSair");

const autor = document.getElementById("autor");
const categoria = document.getElementById("categoria");
const texto = document.getElementById("texto");

const btnSalvar = document.getElementById("btnSalvar");

const listaFrases = document.getElementById("listaFrases");
const totalFrases = document.getElementById("totalFrases");

let frases = [];
const modalEditar = document.getElementById("modalEditar");
const editId = document.getElementById("editId");
const editAutor = document.getElementById("editAutor");
const editCategoria = document.getElementById("editCategoria");
const editTexto = document.getElementById("editTexto");

const btnAtualizar = document.getElementById("btnAtualizar");
const btnCancelar = document.getElementById("btnCancelar");
btnLogin.addEventListener("click", async () => {

  if (email.value.trim() === "" || senha.value.trim() === "") {
    alert("Informe o e-mail e a senha.");
    return;
  }

  try {

    await signInWithEmailAndPassword(
      auth,
      email.value,
      senha.value
    );

  } catch (erro) {

    alert("E-mail ou senha inválidos.");

  }

});

btnSair.addEventListener("click", async () => {

  await signOut(auth);

});

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
async function carregarFrases() {

  frases = [];

  listaFrases.innerHTML = "Carregando...";

  const consulta = await getDocs(collection(db, "frases"));

  consulta.forEach((item) => {

    frases.push({
      id: item.id,
      ...item.data()
    });

  });

  totalFrases.textContent = frases.length;

  listaFrases.innerHTML = "";

  frases.forEach((f) => {

    const card = document.createElement("div");

    card.className = "frase";

    card.innerHTML = `
      <h3>${f.categoria}</h3>
      <p>${f.texto}</p>
      <small>${f.autor || "Sem autor"}</small>
      <br><br>

      <button class="btnEditar">
  ✏️ Editar
</button>

<button class="btnExcluir">
  🗑️ Excluir
</button>
card.querySelector(".btnEditar").addEventListener("click", () => {

    editId.value = f.id;
    editAutor.value = f.autor || "";
    editCategoria.value = f.categoria;
    editTexto.value = f.texto;

    modalEditar.style.display = "flex";

});


  alert("Frase atualizada!");

  carregarFrases();

});
    `;

    card.querySelector(".btnExcluir").addEventListener("click", async () => {

      if (!confirm("Deseja excluir esta frase?")) return;

      await deleteDoc(doc(db, "frases", f.id));

      carregarFrases();

    });

    listaFrases.appendChild(card);

  });

}

btnSalvar.addEventListener("click", async () => {

  if (texto.value.trim() === "") {

    alert("Digite uma frase.");

    return;

  }

  await addDoc(collection(db, "frases"), {

    autor: autor.value,
    categoria: categoria.value,
    texto: texto.value,
    data: new Date()

  });

  autor.value = "";
  texto.value = "";

  alert("Frase cadastrada com sucesso!");

  carregarFrases();

});
btnAtualizar.addEventListener("click", async () => {

    await updateDoc(
        doc(db, "frases", editId.value),
        {
            autor: editAutor.value,
            categoria: editCategoria.value,
            texto: editTexto.value
        }
    );

    modalEditar.style.display = "none";

    alert("Frase atualizada com sucesso!");

    carregarFrases();

});
