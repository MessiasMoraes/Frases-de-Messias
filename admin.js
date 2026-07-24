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
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let frases = [];

const loginContainer = document.getElementById("loginContainer");
const painel = document.getElementById("painel");

const email = document.getElementById("email");
const senha = document.getElementById("senha");

const btnLogin = document.getElementById("btnLogin");
const btnSair = document.getElementById("btnSair");

const autor = document.getElementById("autor");
const categoria = document.getElementById("categoria");
const texto = document.getElementById("texto");
const imagem = document.getElementById("imagem");
const preview = document.getElementById("preview");

const btnSalvar = document.getElementById("btnSalvar");

const listaFrases = document.getElementById("listaFrases");
const pesquisa = document.getElementById("pesquisa");
const filtroCategoria = document.getElementById("filtroCategoria");

const totalFrases = document.getElementById("totalFrases");
const totalCategorias = document.getElementById("totalCategorias");
const totalAutores = document.getElementById("totalAutores");

const modalEditar = document.getElementById("modalEditar");
const editId = document.getElementById("editId");
const editAutor = document.getElementById("editAutor");
const editCategoria = document.getElementById("editCategoria");
const editTexto = document.getElementById("editTexto");

const btnAtualizar = document.getElementById("btnAtualizar");
const btnCancelar = document.getElementById("btnCancelar");

const temaBtn = document.getElementById("temaBtn");
// ==========================
// LOGIN
// ==========================

btnLogin.addEventListener("click", async () => {

    if (!email.value.trim() || !senha.value.trim()) {
        alert("Informe o e-mail e a senha.");
        return;
    }

    try {

        await signInWithEmailAndPassword(
            auth,
            email.value.trim(),
            senha.value
        );

    } catch (erro) {

        console.error(erro);

        alert(
            "Erro ao entrar.\n\n" +
            erro.message
        );

    }

});

// ==========================
// LOGOUT
// ==========================

btnSair.addEventListener("click", async () => {

    await signOut(auth);

});

// ==========================
// CONTROLE DE LOGIN
// ==========================

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
// PRÉ-VISUALIZAÇÃO DA IMAGEM
// ==========================

imagem.addEventListener("change", () => {

    const arquivo = imagem.files[0];

    if (!arquivo) {
        preview.style.display = "none";
        preview.src = "";
        return;
    }

    preview.src = URL.createObjectURL(arquivo);
    preview.style.display = "block";

});

// ==========================
// UPLOAD PARA IMGBB
// ==========================

async function enviarImagem(arquivo) {

    if (!arquivo) return "";

    const apiKey = "1f15b09ceff292f7ce016d4dea88b720";

    const formData = new FormData();
    formData.append("image", arquivo);

    const resposta = await fetch(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        {
            method: "POST",
            body: formData
        }
    );

    const dados = await resposta.json();

    if (!dados.success) {
        throw new Error("Erro ao enviar imagem.");
    }

    return dados.data.url;
}
// ==========================
// SALVAR FRASE
// ==========================

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

        preview.src = "";
        preview.style.display = "none";

        alert("✅ Frase salva com sucesso!");

        carregarFrases();

    } catch (erro) {

        console.error(erro);
        alert("Erro ao salvar: " + erro.message);

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

        consulta.forEach((docItem) => {

            frases.push({
                id: docItem.id,
                ...docItem.data()
            });

        });

        totalFrases.textContent = frases.length;

        const categorias = [...new Set(frases.map(f => f.categoria || "Sem categoria"))];
        const autores = [...new Set(frases.map(f => f.autor || "Sem autor"))];

        totalCategorias.textContent = categorias.length;
        totalAutores.textContent = autores.length;

        listaFrases.innerHTML = "";

        frases.forEach((f) => {

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
card.querySelector(".btnEditar").addEventListener("click", () => {

    editId.value = f.id;
    editAutor.value = f.autor || "";
    editCategoria.value = f.categoria || "";
    editTexto.value = f.texto;

    modalEditar.style.display = "flex";

});

card.querySelector(".btnExcluir").addEventListener("click", async () => {

    if (!confirm("Deseja excluir esta frase?")) return;

    await deleteDoc(doc(db, "frases", f.id));

    carregarFrases();

});
            listaFrases.appendChild(card);

        });

    } catch (erro) {

        console.error(erro);

        listaFrases.innerHTML =
            "<p>Erro ao carregar as frases.</p>";

    }

    }
// ==========================
// PESQUISA
// ==========================

pesquisa.addEventListener("input", () => {

    const filtro = pesquisa.value.toLowerCase();

    mostrarLista(
        frases.filter(f =>
            (f.texto || "").toLowerCase().includes(filtro) ||
            (f.autor || "").toLowerCase().includes(filtro) ||
            (f.categoria || "").toLowerCase().includes(filtro)
        )
    );

});

// ==========================
// FILTRO
// ==========================

filtroCategoria.addEventListener("change", () => {

    if (filtroCategoria.value === "") {
        mostrarLista(frases);
        return;
    }

    mostrarLista(
        frases.filter(f => f.categoria === filtroCategoria.value)
    );

});

// ==========================
// ATUALIZAR
// ==========================

btnAtualizar.addEventListener("click", async () => {

    await updateDoc(doc(db, "frases", editId.value), {
        autor: editAutor.value,
        categoria: editCategoria.value,
        texto: editTexto.value
    });

    modalEditar.style.display = "none";

    carregarFrases();

});

// ==========================
// FECHAR MODAL
// ==========================

btnCancelar.addEventListener("click", () => {

    modalEditar.style.display = "none";

});

// ==========================
// MODO ESCURO
// ==========================

if (temaBtn) {

    if (localStorage.getItem("tema") === "dark") {
        document.body.classList.add("dark");
    }

    temaBtn.addEventListener("click", () => {

        document.body.classList.toggle("dark");

        localStorage.setItem(
            "tema",
            document.body.classList.contains("dark") ? "dark" : "light"
        );

    });

}
