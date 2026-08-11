import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc
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
let categorias = [];

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

const btnSalvar = document.getElementById("salvarFrase");
const listaFrases = document.getElementById("listaFrases");
const pesquisa = document.getElementById("pesquisa");
const filtroCategoria = document.getElementById("filtroCategoria");

const totalFrases = document.getElementById("totalFrases");
const totalCategorias = document.getElementById("totalCategorias");
const totalAutores = document.getElementById("totalAutores");
const totalVisitas = document.getElementById("totalVisitas");

const modalEditar = document.getElementById("modalEditar");
const editId = document.getElementById("editId");
const editAutor = document.getElementById("editAutor");
const editCategoria = document.getElementById("editCategoria");
const editTexto = document.getElementById("editTexto");

const btnAtualizar = document.getElementById("btnAtualizar");
const btnCancelar = document.getElementById("btnCancelar");

const temaBtn = document.getElementById("temaBtn");

// IA ELEMENTS
const gerarIaBtn = document.getElementById("gerarIaBtn");
const modalIA = document.getElementById("modalIA");
const iaPrompt = document.getElementById("iaPrompt");
const iaCategoria = document.getElementById("iaCategoria");
const btnGerarIA = document.getElementById("btnGerarIA");
const btnCancelarIA = document.getElementById("btnCancelarIA");
const iaResultado = document.getElementById("iaResultado");
const iaTexto = document.getElementById("iaTexto");
const btnUsarIA = document.getElementById("btnUsarIA");

// PREVIEW ELEMENTS
const previewCard = document.getElementById("previewCard");
const cardPreview = document.getElementById("cardPreview");
const previewImg = document.getElementById("previewImg");
const previewTexto = document.getElementById("previewTexto");
const previewAutor = document.getElementById("previewAutor");

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

        carregarCategorias();
        carregarFrases();
        carregarVisitas();

    } else {

        loginContainer.style.display = "block";
        painel.style.display = "none";

    }

});

// ==========================
// CARREGAR CATEGORIAS
// ==========================

async function carregarCategorias() {

    try {

        const consulta = await getDocs(collection(db, "categorias"));
        categorias = [];

        consulta.forEach((docItem) => {
            categorias.push({
                id: docItem.id,
                nome: docItem.data().nome
            });
        });

        // Fallback: Se não houver categorias no banco, usar as padrão
        if (categorias.length === 0) {
            const padrao = ["Motivação", "Fé", "Amor", "Reflexão", "Amizade", "Bom Dia", "Boa Noite", "Esperança", "Gratidão", "Família", "Sucesso", "Vida"];
            categorias = padrao.map(nome => ({ id: nome, nome: nome }));
        }

        // Atualizar selects
        categoria.innerHTML = '<option value="">Selecione uma categoria</option>';
        editCategoria.innerHTML = '<option value="">Selecione uma categoria</option>';
        iaCategoria.innerHTML = '<option value="">Selecione uma categoria</option>';
        filtroCategoria.innerHTML = '<option value="">📂 Todas as categorias</option>';

        categorias.forEach(cat => {
            const opt1 = document.createElement("option");
            opt1.value = cat.nome;
            opt1.textContent = cat.nome;
            categoria.appendChild(opt1);

            const opt2 = document.createElement("option");
            opt2.value = cat.nome;
            opt2.textContent = cat.nome;
            editCategoria.appendChild(opt2);

            const opt3 = document.createElement("option");
            opt3.value = cat.nome;
            opt3.textContent = cat.nome;
            iaCategoria.appendChild(opt3);

            const opt4 = document.createElement("option");
            opt4.value = cat.nome;
            opt4.textContent = cat.nome;
            filtroCategoria.appendChild(opt4);
        });

    } catch (erro) {

        console.error("Erro ao carregar categorias:", erro);

    }

}

// ==========================
// CARREGAR VISITAS
// ==========================

async function carregarVisitas() {

    try {

        const consulta = await getDocs(collection(db, "estatisticas"));

        consulta.forEach(docItem => {
            if (docItem.id === "global") {
                totalVisitas.textContent = Number(docItem.data().visitas || 0).toLocaleString("pt-BR");
            }
        });

    } catch (erro) {

        console.error("Erro ao carregar visitas:", erro);

    }

}

// ==========================
// PRÉ-VISUALIZAÇÃO DA IMAGEM
// ==========================

imagem.addEventListener("change", () => {

    const arquivo = imagem.files[0];

    if (!arquivo) {
        preview.style.display = "none";
        preview.src = "";
        previewImg.style.display = "none";
        return;
    }

    preview.src = URL.createObjectURL(arquivo);
    preview.style.display = "block";

    previewImg.src = preview.src;
    previewImg.style.display = "block";

    atualizarPreview();

});

// ==========================
// ATUALIZAR PREVIEW DO CARD
// ==========================

function atualizarPreview() {

    const textoValue = texto.value.trim();
    const autorValue = autor.value.trim() || "Messias";

    if (textoValue) {
        previewTexto.textContent = `"${textoValue}"`;
        previewAutor.textContent = `— ${autorValue}`;
        previewCard.style.display = "block";
    } else {
        previewCard.style.display = "none";
    }

}

texto.addEventListener("input", atualizarPreview);
autor.addEventListener("input", atualizarPreview);

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
        throw new Error("Erro ao enviar imagem para o ImgBB.");
    }

    return dados.data.url;
}

// ==========================
// GERAR COM IA
// ==========================

gerarIaBtn.addEventListener("click", () => {
    modalIA.style.display = "flex";
});

btnCancelarIA.addEventListener("click", () => {
    modalIA.style.display = "none";
    iaResultado.style.display = "none";
});

btnGerarIA.addEventListener("click", async () => {

    const prompt = iaPrompt.value.trim();
    const cat = iaCategoria.value;

    if (!prompt) {
        alert("Descreva o tipo de frase que deseja gerar.");
        return;
    }

    btnGerarIA.disabled = true;
    btnGerarIA.textContent = "⏳ Gerando...";

    try {

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${window.OPENAI_API_KEY || ""}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "Você é um gerador de frases inspiradoras e motivacionais. Gere uma frase curta, impactante e positiva. Responda APENAS com a frase, sem aspas ou explicações."
                    },
                    {
                        role: "user",
                        content: `Gere uma frase inspiradora sobre: ${prompt}`
                    }
                ],
                max_tokens: 100
            })
        });

        if (!response.ok) {
            const erroDados = await response.json();
            console.error("Erro OpenAI:", erroDados);
            if (response.status === 401) {
                throw new Error("Chave de API inválida ou não configurada.");
            }
            throw new Error(erroDados.error?.message || "Erro ao conectar com a IA.");
        }

        const dados = await response.json();
        const frase = dados.choices[0].message.content.trim();

        iaTexto.textContent = `"${frase}"`;
        iaResultado.style.display = "block";

        btnUsarIA.onclick = () => {
            texto.value = frase;
            categoria.value = cat || "";
            modalIA.style.display = "none";
            iaResultado.style.display = "none";
            atualizarPreview();
        };

    } catch (erro) {

        console.error(erro);
        alert("Erro ao gerar frase: " + erro.message);

    } finally {

        btnGerarIA.disabled = false;
        btnGerarIA.textContent = "🚀 Gerar Frase";

    }

});

// ==========================
// SALVAR FRASE
// ==========================

btnSalvar.addEventListener("click", async () => {

    const novoAutor = autor.value.trim() || "Messias";
    const novaCategoria = categoria.value;
    const novoTexto = texto.value.trim();

    if (!novaCategoria) {
        alert("Selecione uma categoria.");
        return;
    }

    if (novoTexto === "") {
        alert("Digite uma frase.");
        return;
    }

    btnSalvar.disabled = true;
    btnSalvar.textContent = "⏳ Salvando...";

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
        previewImg.style.display = "none";
        previewCard.style.display = "none";

        alert("✅ Frase salva com sucesso!");

        carregarFrases();

    } catch (erro) {

        console.error(erro);
        alert("Erro ao salvar: " + erro.message);

    } finally {

        btnSalvar.disabled = false;
        btnSalvar.textContent = "💾 Salvar Frase";

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

        const categoriasUniques = [...new Set(frases.map(f => f.categoria || "Sem categoria"))];
        const autoresUniques = [...new Set(frases.map(f => f.autor || "Sem autor"))];

        totalCategorias.textContent = categoriasUniques.length;
        totalAutores.textContent = autoresUniques.length;

        listaFrases.innerHTML = "";

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
        listaFrases.innerHTML = "<p>Nenhuma frase encontrada.</p>";
        return;
    }

    lista.forEach((f) => {

        const card = document.createElement("div");
        card.className = "frase";

        card.innerHTML = `
            ${f.imagem ? `<img src="${f.imagem}" class="imagemFrase" alt="Imagem da frase">` : ""}

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

    if (!editCategoria.value) {
        alert("Selecione uma categoria.");
        return;
    }

    await updateDoc(doc(db, "frases", editId.value), {
        autor: editAutor.value || "Messias",
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

// ==========================
// CONFIGURAÇÃO DE API KEY
// ==========================

const btnConfig = document.getElementById("btnConfig");

// Carregar chave salva (localStorage + Firestore)
window.OPENAI_API_KEY = localStorage.getItem("openai_api_key") || "";

async function carregarChaveRemota() {
    try {
        const docSnap = await getDoc(doc(db, "config", "settings"));
        if (docSnap.exists() && docSnap.data().openai_api_key) {
            window.OPENAI_API_KEY = docSnap.data().openai_api_key;
            localStorage.setItem("openai_api_key", window.OPENAI_API_KEY);
        }
    } catch (e) {
        console.error("Erro ao carregar chave remota:", e);
    }
}
carregarChaveRemota();

if (btnConfig) {
    btnConfig.addEventListener("click", async () => {
        const novaChave = prompt("Insira sua API Key da OpenAI:", window.OPENAI_API_KEY);
        if (novaChave !== null) {
            window.OPENAI_API_KEY = novaChave.trim();
            localStorage.setItem("openai_api_key", window.OPENAI_API_KEY);
            try {
                await setDoc(doc(db, "config", "settings"), { openai_api_key: window.OPENAI_API_KEY }, { merge: true });
                alert("✅ Chave de API salva com sucesso no painel e na nuvem!");
            } catch (e) {
                console.error("Erro ao salvar no Firestore:", e);
                alert("✅ Chave salva localmente (erro ao salvar na nuvem).");
            }
        }
    });
}
