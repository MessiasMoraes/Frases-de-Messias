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
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";
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
const storage = getStorage(app);
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
const imagem = document.getElementById("imagem");
const btnSalvar = document.getElementById("btnSalvar");

// Lista
const listaFrases = document.getElementById("listaFrases");
const totalFrases = document.getElementById("totalFrases");
const pesquisa = document.getElementById("pesquisa");
const filtroCategoria = document.getElementById("filtroCategoria");
const totalCategorias = document.getElementById("totalCategorias");
const totalAutores = document.getElementById("totalAutores");
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

  console.error(e);

  alert(
    "Código: " + e.code +
    "\n\nMensagem: " + e.message
  );

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

// Atualiza estatísticas
const categorias = [...new Set(frases.map(f => f.categoria))];
const autores = [...new Set(frases.map(f => f.autor || "Sem autor"))];

totalCategorias.textContent = categorias.length;
totalAutores.textContent = autores.length;

// Preenche o filtro de categorias
filtroCategoria.innerHTML =
'<option value="">📂 Todas as categorias</option>';

categorias.forEach(categoria => {

  const option = document.createElement("option");

  option.value = categoria;
  option.textContent = categoria;

  filtroCategoria.appendChild(option);

});

// Mostra a lista
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
      ${f.imagem ? `<img src="${f.imagem}" class="imagemFrase">` : ""}

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
async function enviarImagem(arquivo) {

    const formData = new FormData();
    formData.append("image", arquivo);

    const resposta = await fetch(
        "https://api.imgbb.com/1/upload?key=1f15b09ceff292f7ce016d4dea88b720",
        {
            method: "POST",
            body: formData
        }
    );

    const dados = await resposta.json();

    return dados.data.url;
}
// ==========================
// ADICIONAR FRASE
// ==========================
async function enviarImagem(arquivo){

    if(!arquivo){
        return "";
    }

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
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";
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
const storage = getStorage(app);
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
const imagem = document.getElementById("imagem");
const btnSalvar = document.getElementById("btnSalvar");

// Lista
const listaFrases = document.getElementById("listaFrases");
const totalFrases = document.getElementById("totalFrases");
const pesquisa = document.getElementById("pesquisa");
const filtroCategoria = document.getElementById("filtroCategoria");
const totalCategorias = document.getElementById("totalCategorias");
const totalAutores = document.getElementById("totalAutores");
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

  console.error(e);

  alert(
    "Código: " + e.code +
    "\n\nMensagem: " + e.message
  );

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

// Atualiza estatísticas
const categorias = [...new Set(frases.map(f => f.categoria))];
const autores = [...new Set(frases.map(f => f.autor || "Sem autor"))];

totalCategorias.textContent = categorias.length;
totalAutores.textContent = autores.length;

// Preenche o filtro de categorias
filtroCategoria.innerHTML =
'<option value="">📂 Todas as categorias</option>';

categorias.forEach(categoria => {

  const option = document.createElement("option");

  option.value = categoria;
  option.textContent = categoria;

  filtroCategoria.appendChild(option);

});

// Mostra a lista
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
      ${f.imagem ? `<img src="${f.imagem}" class="imagemFrase">` : ""}

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
async function enviarImagem(arquivo) {

    const formData = new FormData();
    formData.append("image", arquivo);

    const resposta = await fetch(
        "https://api.imgbb.com/1/upload?key=1f15b09ceff292f7ce016d4dea88b720",
        {
            method: "POST",
            body: formData
        }
    );

    const dados = await resposta.json();

    return dados.data.url;
}
// ==========================
// ADICIONAR FRASE
// ==========================
async function enviarImagem(arquivo){

    if(!arquivo){
        return "";
    }

    const nomeArquivo = `frases/${Date.now()}_${arquivo.name}`;

    const referencia = ref(storage, nomeArquivo);

    await uploadBytes(referencia, arquivo);

    const url = await getDownloadURL(referencia);

    return url;

}
async function enviarImagem(arquivo){

    const apiKey = "1f15b09ceff292f7ce016d4dea88b720";

    const formData = new FormData();

    formData.append("image", arquivo);

    const resposta = await fetch(
        "https://api.imgbb.com/1/upload?key=" + apiKey,
        {
            method: "POST",
            body: formData
        }
    );

    const dados = await resposta.json();

    if(!dados.success){
        throw new Error("Erro ao enviar imagem.");
    }

    return dados.data.url;

}
btnSalvar.addEventListener("click", async () => {

  const novoAutor = autor.value.trim();
  const novaCategoria = categoria.value;
  const novoTexto = texto.value.trim();

  if (novoTexto === "") {
    alert("Digite uma frase.");
    return;
  }

  try {

    let urlImagem = "";

    if (imagem.files.length > 0) {
        urlImagem = await enviarImagem(imagem.files[0]);
    }

    await addDoc(collection(db, "frases"), {
    autor: novoAutor,
    categoria: novaCategoria,
    texto: novoTexto,
    imagem: urlImagem,
    curtidas: 0,
    visualizacoes: 0,
    compartilhamentos: 0,
    data: new Date()
});

    autor.value = "";
categoria.selectedIndex = 0;
texto.value = "";
imagem.value = "";

    alert("✅ Frase adicionada com sucesso!");

    carregarFrases();

  } catch (erro) {

    console.error(erro);

    alert(
        "Erro: " + erro.message +
        "\n\nCódigo: " + (erro.code || "Sem código")
    );

  }

});

// ==========================
// ATUALIZAR FRASE
// ==========================

btnAtualizar.addEventListener("click", async () => {

  try {

    let urlImagem = "";

    if (imagem.files.length > 0) {
        urlImagem = await enviarImagem(imagem.files[0]);
    }

    await updateDoc(
      doc(db, "frases", editId.value),
      {
        autor: editAutor.value.trim(),
        categoria: editCategoria.value,
        texto: editTexto.value.trim(),
        imagem: urlImagem
      }
    );

    modalEditar.style.display = "none";

    alert("✅ Frase atualizada com sucesso!");

    carregarFrases();

  } catch (erro) {

    console.error(erro);

    alert("Erro ao atualizar a frase.");

  }

});

// ==========================
// FECHAR MODAL
// ==========================

btnCancelar.addEventListener("click", () => {

  modalEditar.style.display = "none";

});

// Fechar clicando fora do modal
window.addEventListener("click", (e) => {

  if (e.target === modalEditar) {
    modalEditar.style.display = "none";
  }

});
filtroCategoria.addEventListener("change", () => {

  const categoriaSelecionada = filtroCategoria.value;

  if (categoriaSelecionada === "") {

    mostrarLista(frases);
    return;

  }

  const listaFiltrada = frases.filter(
    f => f.categoria === categoriaSelecionada
  );

  mostrarLista(listaFiltrada);

});
// ==========================
// MODO ESCURO
// ==========================

if (temaBtn) {

    // Carrega a preferência salva
    if (localStorage.getItem("tema") === "dark") {
        document.body.classList.add("dark");
        temaBtn.textContent = "☀️ Modo Claro";
    }

    temaBtn.addEventListener("click", () => {

        document.body.classList.toggle("dark");

        if (document.body.classList.contains("dark")) {
            localStorage.setItem("tema", "dark");
            temaBtn.textContent = "☀️ Modo Claro";
        } else {
            localStorage.setItem("tema", "light");
            temaBtn.textContent = "🌙 Modo Escuro";
        }

    });

}
async function enviarImagem(arquivo){

    const apiKey = "1f15b09ceff292f7ce016d4dea88b720";

    const formData = new FormData();

    formData.append("image", arquivo);

    const resposta = await fetch(
        "https://api.imgbb.com/1/upload?key=" + apiKey,
        {
            method: "POST",
            body: formData
        }
    );

    const dados = await resposta.json();

    if(!dados.success){
        throw new Error("Erro ao enviar imagem.");
    }

    return dados.data.url;

}
btnSalvar.addEventListener("click", async () => {

  const novoAutor = autor.value.trim();
  const novaCategoria = categoria.value;
  const novoTexto = texto.value.trim();

  if (novoTexto === "") {
    alert("Digite uma frase.");
    return;
  }

  try {

    let urlImagem = "";

    if (imagem.files.length > 0) {
        urlImagem = await enviarImagem(imagem.files[0]);
    }

    await addDoc(collection(db, "frases"), {
    autor: novoAutor,
    categoria: novaCategoria,
    texto: novoTexto,
    imagem: urlImagem,
    curtidas: 0,
    visualizacoes: 0,
    compartilhamentos: 0,
    data: new Date()
});

    autor.value = "";
categoria.selectedIndex = 0;
texto.value = "";
imagem.value = "";

    alert("✅ Frase adicionada com sucesso!");

    carregarFrases();

  } catch (erro) {

    console.error(erro);

    alert(
        "Erro: " + erro.message +
        "\n\nCódigo: " + (erro.code || "Sem código")
    );

  }

});

// ==========================
// ATUALIZAR FRASE
// ==========================

btnAtualizar.addEventListener("click", async () => {

  try {

    let urlImagem = "";

    if (imagem.files.length > 0) {
        urlImagem = await enviarImagem(imagem.files[0]);
    }

    await updateDoc(
      doc(db, "frases", editId.value),
      {
        autor: editAutor.value.trim(),
        categoria: editCategoria.value,
        texto: editTexto.value.trim(),
        imagem: urlImagem
      }
    );

    modalEditar.style.display = "none";

    alert("✅ Frase atualizada com sucesso!");

    carregarFrases();

  } catch (erro) {

    console.error(erro);

    alert("Erro ao atualizar a frase.");

  }

});

// ==========================
// FECHAR MODAL
// ==========================

btnCancelar.addEventListener("click", () => {

  modalEditar.style.display = "none";

});

// Fechar clicando fora do modal
window.addEventListener("click", (e) => {

  if (e.target === modalEditar) {
    modalEditar.style.display = "none";
  }

});
filtroCategoria.addEventListener("change", () => {

  const categoriaSelecionada = filtroCategoria.value;

  if (categoriaSelecionada === "") {

    mostrarLista(frases);
    return;

  }

  const listaFiltrada = frases.filter(
    f => f.categoria === categoriaSelecionada
  );

  mostrarLista(listaFiltrada);

});
// ==========================
// MODO ESCURO
// ==========================

if (temaBtn) {

    // Carrega a preferência salva
    if (localStorage.getItem("tema") === "dark") {
        document.body.classList.add("dark");
        temaBtn.textContent = "☀️ Modo Claro";
    }

    temaBtn.addEventListener("click", () => {

        document.body.classList.toggle("dark");

        if (document.body.classList.contains("dark")) {
            localStorage.setItem("tema", "dark");
            temaBtn.textContent = "☀️ Modo Claro";
        } else {
            localStorage.setItem("tema", "light");
            temaBtn.textContent = "🌙 Modo Escuro";
        }

    });

}
