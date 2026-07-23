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

let frases = [];

// LOGIN
const loginContainer = document.getElementById("loginContainer");
const painel = document.getElementById("painel");

const email = document.getElementById("email");
const senha = document.getElementById("senha");

const btnLogin = document.getElementById("btnLogin");
const btnSair = document.getElementById("btnSair");

// CADASTRO
const autor = document.getElementById("autor");
const categoria = document.getElementById("categoria");
const texto = document.getElementById("texto");
const imagem = document.getElementById("imagem");
const btnSalvar = document.getElementById("btnSalvar");

// LISTA
const listaFrases = document.getElementById("listaFrases");
const totalFrases = document.getElementById("totalFrases");
const totalCategorias = document.getElementById("totalCategorias");
const totalAutores = document.getElementById("totalAutores");
const pesquisa = document.getElementById("pesquisa");
const filtroCategoria = document.getElementById("filtroCategoria");

// MODAL
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
// ==========================
// UPLOAD DE IMAGEM (ImgBB)
// ==========================

async function enviarImagem(arquivo) {

    if (!arquivo) {
        return "";
    }

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

    if (!dados.success) {
        throw new Error("Erro ao enviar a imagem para o ImgBB.");
    }

    return dados.data.url;

}
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

        const categorias = [...new Set(frases.map(f => f.categoria || "Sem categoria"))];
        const autores = [...new Set(frases.map(f => f.autor || "Sem autor"))];

        totalCategorias.textContent = categorias.length;
        totalAutores.textContent = autores.length;

        filtroCategoria.innerHTML =
            '<option value="">📂 Todas as categorias</option>';

        categorias.forEach(cat => {

            const option = document.createElement("option");

            option.value = cat;
            option.textContent = cat;

            filtroCategoria.appendChild(option);

        });

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

            <h3>${f.categoria || "Sem categoria"}</h3>

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

              }
// ==========================
// PESQUISA
// ==========================

pesquisa.addEventListener("input", () => {

    const filtro = pesquisa.value.toLowerCase();

    const resultado = frases.filter((f) =>

        (f.texto || "").toLowerCase().includes(filtro) ||
        (f.autor || "").toLowerCase().includes(filtro) ||
        (f.categoria || "").toLowerCase().includes(filtro)

    );

    mostrarLista(resultado);

});

// ==========================
// FILTRO POR CATEGORIA
// ==========================

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
// ADICIONAR FRASE
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

        alert("✅ Frase adicionada com sucesso!");

        carregarFrases();

    } catch (erro) {

        console.error(erro);

        alert("Erro: " + erro.message);

    }

});
