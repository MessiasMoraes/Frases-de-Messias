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
  setDoc,
  writeBatch
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

// IMPORTAÇÃO EM LOTE
const arquivoLote = document.getElementById("arquivoLote");
const analisarLote = document.getElementById("analisarLote");
const importarLote = document.getElementById("importarLote");
const statusLote = document.getElementById("statusLote");
const resultadoLote = document.getElementById("resultadoLote");
const resumoLote = document.getElementById("resumoLote");
const errosLote = document.getElementById("errosLote");
const previewLote = document.getElementById("previewLote");
let loteAprovado = [];
let dadosDoPainelCarregados = false;

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

// SELETOR DE CATEGORIAS PRÓPRIO
const seletorCategoriaModal = document.getElementById("seletorCategoriaModal");
const seletorCategoriaTitulo = document.getElementById("seletorCategoriaTitulo");
const opcoesSeletorCategoria = document.getElementById("opcoesSeletorCategoria");
const fecharSeletorCategoria = document.getElementById("fecharSeletorCategoria");
const selectsCategoria = [categoria, editCategoria, iaCategoria, filtroCategoria];
const CATEGORIAS_PADRAO = [
    "Motivação", "Fé", "Amor", "Reflexão", "Amizade", "Bom Dia", "Boa Noite",
    "Esperança", "Gratidão", "Família", "Sucesso", "Vida", "Sabedoria", "Deus"
];
let selectCategoriaAtivo = null;

function textoDoSelect(select) {
    const opcaoSelecionada = select.options[select.selectedIndex];
    return opcaoSelecionada?.textContent || "Selecione uma categoria";
}

function atualizarBotaoCategoria(select) {
    const botao = document.getElementById(`botao-${select.id}`);
    if (!botao) return;

    botao.textContent = textoDoSelect(select);
    botao.setAttribute("aria-label", `Categoria selecionada: ${textoDoSelect(select)}`);
}

function fecharListaCategoria() {
    seletorCategoriaModal.classList.remove("ativo");
    seletorCategoriaModal.setAttribute("aria-hidden", "true");

    if (selectCategoriaAtivo) {
        document.getElementById(`botao-${selectCategoriaAtivo.id}`)?.setAttribute("aria-expanded", "false");
    }

    selectCategoriaAtivo = null;
}

function abrirListaCategoria(select) {
    selectCategoriaAtivo = select;
    const eFiltro = select.id === "filtroCategoria";
    seletorCategoriaTitulo.textContent = eFiltro ? "Filtrar por categoria" : "Selecione uma categoria";
    opcoesSeletorCategoria.innerHTML = "";

    Array.from(select.options).forEach((opcao) => {
        const botaoOpcao = document.createElement("button");
        botaoOpcao.type = "button";
        botaoOpcao.className = "opcao-seletor-categoria";
        botaoOpcao.textContent = opcao.textContent;
        botaoOpcao.setAttribute("role", "option");
        botaoOpcao.setAttribute("aria-selected", String(opcao.selected));

        if (opcao.selected) botaoOpcao.classList.add("selecionada");

        botaoOpcao.addEventListener("click", () => {
            select.value = opcao.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            atualizarBotaoCategoria(select);
            fecharListaCategoria();
        });

        opcoesSeletorCategoria.appendChild(botaoOpcao);
    });

    seletorCategoriaModal.classList.add("ativo");
    seletorCategoriaModal.setAttribute("aria-hidden", "false");
    document.getElementById(`botao-${select.id}`)?.setAttribute("aria-expanded", "true");
}

function prepararSelecionadoresCategoria() {
    selectsCategoria.forEach((select) => {
        if (!select) return;

        let botao = document.getElementById(`botao-${select.id}`);
        if (!botao) {
            botao = document.createElement("button");
            botao.type = "button";
            botao.id = `botao-${select.id}`;
            botao.className = "botao-seletor-categoria";
            botao.setAttribute("aria-haspopup", "listbox");
            botao.setAttribute("aria-expanded", "false");
            select.insertAdjacentElement("afterend", botao);
            select.hidden = true;

            botao.addEventListener("click", () => abrirListaCategoria(select));
            select.addEventListener("change", () => atualizarBotaoCategoria(select));
        }

        atualizarBotaoCategoria(select);
    });
}

fecharSeletorCategoria.addEventListener("click", fecharListaCategoria);
seletorCategoriaModal.addEventListener("click", (event) => {
    if (event.target === seletorCategoriaModal) fecharListaCategoria();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && seletorCategoriaModal.classList.contains("ativo")) {
        fecharListaCategoria();
    }
});

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

function preencherCamposDeCategoria() {
    categoria.innerHTML = '<option value="">Selecione uma categoria</option>';
    editCategoria.innerHTML = '<option value="">Selecione uma categoria</option>';
    iaCategoria.innerHTML = '<option value="">Selecione uma categoria</option>';
    filtroCategoria.innerHTML = '<option value="">📂 Todas as categorias</option>';

    categorias.forEach((cat) => {
        [categoria, editCategoria, iaCategoria, filtroCategoria].forEach((select) => {
            const opcao = document.createElement("option");
            opcao.value = cat.nome;
            opcao.textContent = cat.nome;
            select.appendChild(opcao);
        });
    });

    prepararSelecionadoresCategoria();
}

function mesclarCategorias(nomesDoBanco) {
    const mapa = new Map();
    [...CATEGORIAS_PADRAO, ...nomesDoBanco].forEach((nome) => {
        const nomeLimpo = String(nome || "").trim();
        if (!nomeLimpo) return;
        mapa.set(nomeLimpo.toLocaleLowerCase("pt-BR"), nomeLimpo);
    });

    categorias = Array.from(mapa.values()).map((nome) => ({ id: nome, nome }));
}

async function carregarCategorias() {
    // As categorias essenciais entram de imediato, sem depender do tempo de resposta do banco.
    mesclarCategorias([]);
    preencherCamposDeCategoria();

    try {
        const consulta = await getDocs(collection(db, "categorias"));
        const nomesDoBanco = [];

        consulta.forEach((docItem) => {
            const dadosCategoria = docItem.data();
            const nomeCategoria = String(
                dadosCategoria.nome ?? dadosCategoria["nome "] ?? dadosCategoria.Nome ?? ""
            ).trim();

            if (nomeCategoria) nomesDoBanco.push(nomeCategoria);
        });

        // Mantém a lista inicial e acrescenta categorias novas cadastradas no banco.
        mesclarCategorias(nomesDoBanco);
        preencherCamposDeCategoria();
    } catch (erro) {
        // A lista local já está disponível, portanto uma falha de rede não deixa o seletor vazio.
        console.error("Erro ao atualizar categorias do banco; usando a lista local:", erro);
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
            atualizarBotaoCategoria(categoria);
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
        atualizarBotaoCategoria(categoria);
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
// IMPORTAÇÃO EM LOTE
// ==========================

const LIMITE_LOTE = 500;
const LIMITE_PREVIA = 25;

function normalizarLote(texto = "") {
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase("pt-BR");
}

function textoSeguroDaCelula(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor).replace(/\uFEFF/g, "").trim();
}

function valorDaLinha(linha, campo) {
    const chave = Object.keys(linha || {}).find((nome) => normalizarLote(nome) === campo);
    return chave ? textoSeguroDaCelula(linha[chave]) : "";
}

function definirStatusLote(mensagem, tipo = "") {
    statusLote.textContent = mensagem;
    statusLote.className = `status-lote ${tipo}`.trim();
}

function limparResultadoLote() {
    loteAprovado = [];
    resultadoLote.hidden = true;
    importarLote.disabled = true;
    resumoLote.replaceChildren();
    previewLote.replaceChildren();
    errosLote.replaceChildren();
    errosLote.hidden = true;
}

function lerArquivoLote(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
        leitor.onload = () => {
            try {
                const nome = arquivo.name.toLocaleLowerCase("pt-BR");
                if (nome.endsWith(".json")) {
                    const dados = JSON.parse(String(leitor.result));
                    resolve(Array.isArray(dados) ? dados : (Array.isArray(dados.frases) ? dados.frases : []));
                    return;
                }
                if (!window.XLSX) throw new Error("O leitor de planilhas não foi carregado. Atualize a página e tente novamente.");
                const planilha = window.XLSX.read(leitor.result, { type: "array" });
                const primeiraAba = planilha.SheetNames[0];
                if (!primeiraAba) throw new Error("A planilha não possui uma aba com dados.");
                resolve(window.XLSX.utils.sheet_to_json(planilha.Sheets[primeiraAba], { defval: "" }));
            } catch (erro) {
                reject(new Error(erro.message || "O arquivo não está em um formato válido."));
            }
        };
        if (arquivo.name.toLocaleLowerCase("pt-BR").endsWith(".json")) leitor.readAsText(arquivo, "UTF-8");
        else leitor.readAsArrayBuffer(arquivo);
    });
}

function exibirResultadoLote(resultado) {
    resultadoLote.hidden = false;
    resumoLote.replaceChildren();
    previewLote.replaceChildren();
    errosLote.replaceChildren();

    const resumo = document.createElement("p");
    resumo.innerHTML = `<strong>${resultado.aprovadas.length}</strong> frase(s) aprovada(s) para importar de ${resultado.total} linha(s) lida(s).`;
    resumoLote.appendChild(resumo);

    const porCategoria = new Map();
    resultado.aprovadas.forEach((frase) => porCategoria.set(frase.categoria, (porCategoria.get(frase.categoria) || 0) + 1));
    if (porCategoria.size) {
        const lista = document.createElement("p");
        lista.className = "contagem-categorias-lote";
        lista.textContent = Array.from(porCategoria, ([categoriaLote, total]) => `${categoriaLote}: ${total}`).join(" · ");
        resumoLote.appendChild(lista);
    }

    resultado.aprovadas.slice(0, LIMITE_PREVIA).forEach((frase) => {
        const linha = document.createElement("tr");
        [frase.categoria, frase.texto, frase.autor].forEach((conteudo) => {
            const celula = document.createElement("td");
            celula.textContent = conteudo;
            linha.appendChild(celula);
        });
        previewLote.appendChild(linha);
    });

    if (resultado.aprovadas.length > LIMITE_PREVIA) {
        const aviso = document.createElement("p");
        aviso.className = "aviso-previa-lote";
        aviso.textContent = `A prévia mostra as primeiras ${LIMITE_PREVIA} frases aprovadas.`;
        resumoLote.appendChild(aviso);
    }

    if (resultado.erros.length) {
        errosLote.hidden = false;
        const titulo = document.createElement("strong");
        titulo.textContent = `${resultado.erros.length} linha(s) não serão importadas:`;
        const lista = document.createElement("ul");
        resultado.erros.slice(0, 12).forEach((erro) => {
            const item = document.createElement("li");
            item.textContent = erro;
            lista.appendChild(item);
        });
        if (resultado.erros.length > 12) {
            const item = document.createElement("li");
            item.textContent = `… e mais ${resultado.erros.length - 12} ocorrência(s).`;
            lista.appendChild(item);
        }
        errosLote.append(titulo, lista);
    }
}

function validarLote(linhas) {
    const nomesCategorias = new Map(categorias.map((item) => [normalizarLote(item.nome), item.nome]));
    const textosExistentes = new Set(frases.map((frase) => normalizarLote(frase.texto)).filter(Boolean));
    const textosDoLote = new Set();
    const aprovadas = [];
    const erros = [];

    if (!Array.isArray(linhas) || !linhas.length) {
        return { total: 0, aprovadas, erros: ["O arquivo não contém linhas para importar."] };
    }
    if (linhas.length > LIMITE_LOTE) {
        return { total: linhas.length, aprovadas, erros: [`O lote possui ${linhas.length} linhas. O limite por importação é ${LIMITE_LOTE}.`] };
    }

    linhas.forEach((linha, indice) => {
        const numeroLinha = indice + 2;
        const nomeCategoria = valorDaLinha(linha, "categoria");
        const textoFrase = valorDaLinha(linha, "texto");
        const autorFrase = valorDaLinha(linha, "autor") || "Messias";
        const imagemFrase = valorDaLinha(linha, "imagem");
        const categoriaCanonica = nomesCategorias.get(normalizarLote(nomeCategoria));
        const textoNormalizado = normalizarLote(textoFrase);

        if (!categoriaCanonica) {
            erros.push(`Linha ${numeroLinha}: categoria inválida ou ausente (${nomeCategoria || "sem categoria"}).`);
            return;
        }
        if (!textoNormalizado) {
            erros.push(`Linha ${numeroLinha}: a frase está vazia.`);
            return;
        }
        if (textosExistentes.has(textoNormalizado)) {
            erros.push(`Linha ${numeroLinha}: a frase já existe no site.`);
            return;
        }
        if (textosDoLote.has(textoNormalizado)) {
            erros.push(`Linha ${numeroLinha}: frase repetida dentro do próprio arquivo.`);
            return;
        }

        textosDoLote.add(textoNormalizado);
        aprovadas.push({ categoria: categoriaCanonica, texto: textoFrase, autor: autorFrase, imagem: imagemFrase });
    });

    return { total: linhas.length, aprovadas, erros };
}

arquivoLote.addEventListener("change", () => {
    limparResultadoLote();
    analisarLote.disabled = !arquivoLote.files?.length;
    definirStatusLote(arquivoLote.files?.[0] ? `Arquivo selecionado: ${arquivoLote.files[0].name}` : "Selecione um arquivo para começar.");
});

analisarLote.addEventListener("click", async () => {
    const arquivo = arquivoLote.files?.[0];
    if (!arquivo) return;
    if (!dadosDoPainelCarregados) {
        definirStatusLote("Aguarde o painel terminar de carregar as frases existentes.", "erro");
        return;
    }

    analisarLote.disabled = true;
    limparResultadoLote();
    definirStatusLote("Analisando arquivo e comparando com as frases cadastradas…");
    try {
        const linhas = await lerArquivoLote(arquivo);
        const resultado = validarLote(linhas);
        loteAprovado = resultado.aprovadas;
        exibirResultadoLote(resultado);
        importarLote.disabled = !loteAprovado.length;
        definirStatusLote(loteAprovado.length ? "Prévia pronta. Revise as frases aprovadas antes de importar." : "Nenhuma frase foi aprovada para importação.", loteAprovado.length ? "sucesso" : "erro");
    } catch (erro) {
        console.error("Erro ao analisar lote:", erro);
        definirStatusLote(`Erro ao analisar arquivo: ${erro.message}`, "erro");
    } finally {
        analisarLote.disabled = false;
    }
});

importarLote.addEventListener("click", async () => {
    if (!loteAprovado.length) return;
    const total = loteAprovado.length;
    if (!confirm(`Importar ${total} frase(s) aprovada(s)? Esta ação adicionará somente as frases mostradas na prévia.`)) return;

    importarLote.disabled = true;
    analisarLote.disabled = true;
    let importadas = 0;
    try {
        for (let inicio = 0; inicio < loteAprovado.length; inicio += 400) {
            const grupo = loteAprovado.slice(inicio, inicio + 400);
            const loteFirestore = writeBatch(db);
            grupo.forEach((frase) => {
                const referencia = doc(collection(db, "frases"));
                loteFirestore.set(referencia, {
                    autor: frase.autor,
                    categoria: frase.categoria,
                    texto: frase.texto,
                    imagem: frase.imagem,
                    curtidas: 0,
                    visualizacoes: 0,
                    compartilhamentos: 0,
                    data: new Date()
                });
            });
            await loteFirestore.commit();
            importadas += grupo.length;
            definirStatusLote(`Importadas ${importadas} de ${total} frase(s)…`);
        }

        definirStatusLote(`✅ ${importadas} frase(s) importada(s) com sucesso.`, "sucesso");
        alert(`✅ ${importadas} frase(s) importada(s) com sucesso!`);
        arquivoLote.value = "";
        limparResultadoLote();
        analisarLote.disabled = true;
        dadosDoPainelCarregados = false;
        await carregarFrases();
    } catch (erro) {
        console.error("Erro ao importar lote:", erro);
        loteAprovado = [];
        importarLote.disabled = true;
        definirStatusLote(`Importação interrompida após ${importadas} de ${total} frase(s): ${erro.message}. Analise o arquivo novamente antes de tentar importar.`, "erro");
        alert("A importação não foi concluída. O painel atualizará as frases cadastradas para impedir duplicidades em uma nova tentativa.");
        dadosDoPainelCarregados = false;
        await carregarFrases();
    } finally {
        importarLote.disabled = !loteAprovado.length;
        analisarLote.disabled = !arquivoLote.files?.length;
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
        dadosDoPainelCarregados = true;

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
            atualizarBotaoCategoria(editCategoria);
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
