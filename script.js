import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

let frases = [];
let categorias = {};
let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];

// ======================
// FUNÇÕES AUXILIARES
// ======================
function mostrarCarregando(lista) {
    if (lista) {
        lista.innerHTML = `
            <div class="loading" style="text-align:center; padding: 30px; font-weight: bold;">
                ⏳ Carregando frases...
            </div>
        `;
    }
}

function mostrarErro(lista, msg) {
    if (lista) {
        lista.innerHTML = `
            <div class="erro" style="text-align:center; padding: 30px; color: #ef4444; font-weight: bold;">
                ${msg}
            </div>
        `;
    }
}

function sanitizarTexto(texto = "") {
    return texto
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/gu, '')
        .trim();
}

function normalizarParaBusca(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// ======================
// FRASE DO DIA
// ======================
function fraseDoDia(fraseDiaElemento) {
    if (!fraseDiaElemento || frases.length === 0) return;
    const indice = Math.floor(Math.random() * frases.length);
    const f = frases[indice];
    fraseDiaElemento.innerHTML = `"${f.texto}" — ${f.autor || "Messias"}`;
}

// ======================
// CONTADOR DE VISITAS
// ======================
async function contarVisitaGlobal() {
    const chaveVisita = "visita_global_registrada";
    const contadorElemento = document.getElementById("contadorGlobal");
    
    try {
        const docRef = doc(db, "estatisticas", "global");
        
        if (!sessionStorage.getItem(chaveVisita)) {
            await updateDoc(docRef, { visitas: increment(1) });
            sessionStorage.setItem(chaveVisita, "true");
        }
        
        const consulta = await getDocs(collection(db, "estatisticas"));
        consulta.forEach(d => {
            if (d.id === "global" && contadorElemento) {
                contadorElemento.textContent = Number(d.data().visitas || 0).toLocaleString("pt-BR");
            }
        });
    } catch (e) {
        console.error("Erro ao contar visita global:", e);
    }
}

// ======================
// CARREGAR DADOS
// ======================
async function carregarFrases(lista, fraseDiaElemento, listaCategorias, pesquisa) {
    mostrarCarregando(lista);
    frases = [];
    categorias = {};

    try {
        contarVisitaGlobal();

        // Buscar Categorias
        const consultaCategorias = await getDocs(collection(db, "categorias"));
        consultaCategorias.forEach(docSnap => {
            const dados = docSnap.data();
            const nomeLimpo = sanitizarTexto(dados.nome || "");
            if (nomeLimpo) {
                categorias[nomeLimpo] = dados.imagem;
            }
        });

        // Buscar Frases
        const consultaFrases = await getDocs(collection(db, "frases"));
        consultaFrases.forEach(docSnap => {
            frases.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

    } catch (e) {
        console.error("Erro no Firebase:", e);
        mostrarErro(lista, "Erro ao conectar ao banco de dados. Verifique a conexão.");
        return;
    }

    if (frases.length === 0) {
        mostrarErro(lista, "Nenhuma frase cadastrada no momento.");
        return;
    }

    fraseDoDia(fraseDiaElemento);
    mostrarCategorias(listaCategorias, pesquisa, lista);
    mostrarFrases(lista, "");
}

// ======================
// MOSTRAR FRASES
// ======================
function mostrarFrases(lista, filtro = "") {
    if (!lista) return;
    lista.innerHTML = "";
    
    const filtroLimpo = normalizarParaBusca(sanitizarTexto(filtro));

    const resultado = frases.filter(f => {
        if (filtroLimpo === "") return true;
        
        const textoFrase = normalizarParaBusca(f.texto || "");
        const autorFrase = normalizarParaBusca(f.autor || "");
        const categoriaFrase = normalizarParaBusca(sanitizarTexto(f.categoria || ""));

        return textoFrase.includes(filtroLimpo) || autorFrase.includes(filtroLimpo) || categoriaFrase.includes(filtroLimpo);
    });

    if (resultado.length === 0) {
        lista.innerHTML = `
            <div class="semResultado" style="text-align:center; padding: 20px;">
                😔 Nenhuma frase encontrada para a busca realizada.
            </div>
        `;
        return;
    }

    resultado.forEach(f => criarCardFrase(f, lista));
}

// ======================
// CRIAR CARD
// ======================
function criarCardFrase(f, lista) {
    const categoriaLimpa = sanitizarTexto(f.categoria || "");
    const larguraImg = window.innerWidth < 600 ? 400 : 800;
    const alturaImg = window.innerWidth < 600 ? 300 : 600;
    const semente = f.id || "frase-padrao";
    
    const imagem = (f.imagem && f.imagem.trim() !== "")
        ? f.imagem
        : (categorias[categoriaLimpa] || `https://picsum.photos/seed/${encodeURIComponent(semente)}/${larguraImg}/${alturaImg}`);

    const card = document.createElement("div");
    card.className = "cardFrase";
            <p style="font-size:13px; margin-bottom:5px; font-weight:bold;">Escolha o formato:</p>
            <button onclick="baixarImagem(this, 'story')" style="margin-right:5px; font-size:12px; padding:6px 12px;">📱 Story (9:16)</button>
            <button onclick="baixarImagem(this, 'feed')" style="font-size:12px; padding:6px 12px;">📸 Feed (1:1)</button>
        </div>
        <div class="estatisticas">
            <span>❤️ ${Number(f.curtidas || 0).toLocaleString("pt-BR")}</span>
            <span>👁️ ${Number(f.visualizacoes || 0).toLocaleString("pt-BR")}</span>
            <span>📤 ${Number(f.compartilhamentos || 0).toLocaleString("pt-BR")}</span>
        </div>
    `;

    lista.appendChild(card);
    visualizar(f.id);
}

// ======================
// CATEGORIAS
// ======================
function mostrarCategorias(listaCategorias, pesquisa, lista) {
    if (!listaCategorias) return;
    listaCategorias.innerHTML = "";

    Object.keys(categorias).forEach((nome) => {
        const btn = document.createElement("button");
        btn.className = "btn-categoria";
        btn.textContent = nome;
        btn.onclick = () => {
            const categoriaLimpa = sanitizarTexto(nome);
            if (pesquisa) pesquisa.value = categoriaLimpa;
            mostrarFrases(lista, categoriaLimpa);
            const offset = lista.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({ top: offset, behavior: "smooth" });
        };
        listaCategorias.appendChild(btn);
    });
}

function configurarBotoesCategoriasFixos(pesquisa, lista) {
    const botoes = document.querySelectorAll(".grid-botoes .btn-categoria");
    botoes.forEach(btn => {
        btn.onclick = () => {
            const cat = btn.getAttribute("data-categoria") || btn.innerText;
            if (pesquisa) pesquisa.value = sanitizarTexto(cat);
            mostrarFrases(lista, cat);
            const offset = lista.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({ top: offset, behavior: "smooth" });
;
    }
    favoritos.push(texto);
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
    alert("❤️ Adicionado aos favoritos!");
}

async function compartilhar(id, texto) {
    try {
        await updateDoc(doc(db, "frases", id), { compartilhamentos: increment(1) });
        const frase = frases.find(f => f.id === id);
        if (frase) frase.compartilhamentos = Number(frase.compartilhamentos || 0) + 1;

        if (navigator.share) {
            await navigator.share({ title: "Frases de Messias", text: texto, url: location.href });
        } else {
            await navigator.clipboard.writeText(texto);
            alert("📋 Frase copiada para compartilhar.");
        }
        const lista = document.getElementById("listaFrases");
        const pesquisa = document.getElementById("pesquisa");
        mostrarFrases(lista, pesquisa?.value || "");
    } catch (e) {
        console.error(e);
    }
}

async function visualizar(id) {
    const chave = "view_" + id;
    if (localStorage.getItem(chave)) return;
    try {
        await updateDoc(doc(db, "frases", id), { visualizacoes: increment(1) });
        localStorage.setItem(chave, "1");
        const frase = frases.find(f => f.id === id);
        if (frase) frase.visualizacoes = Number(frase.visualizacoes || 0) + 1;
    } catch (e) {
        console.error(e);
    }
}

async function copiar(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        alert("📋 Frase copiada com sucesso!");
    } catch (e) {
        console.error(e);
        alert("Não foi possível copiar a frase.");
    }
}

function mostrarOpcoesDownload(botao) {
    const card = botao.closest(".cardFrase");
    if (!card) return;
    const opcoes = card.querySelector(".opcoesDownload");
    if (opcoes) opcoes.style.display = opcoes.style.display === "none" ? "block" : "none";
}

// ======================
// DOWNLOAD DE IMAGEM
// ======================
async function baixarImagem(botao, formato = "story") {
    const card = botao.closest(".cardFrase");
    if (!card) return;
    const btnOpcoes = card.querySelector(".opcoesDownload");
    if (btnOpcoes) btnOpcoes.style.display = "none";
    const textoBotaoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = "⏳ Gerando...";
    let exportacao = null;

    try {
        const imgElement = card.querySelector(".imagemFrase img");
        const imgSrc = imgElement ? imgElement.src : "";
        const texto = card.querySelector(".textoFrase")?.innerText || "";
        const autor = card.querySelector(".autorFrase")?.innerText || "";
        const largura = 1080;
        const altura = formato === "feed" ? 1080 : 1920;
        const tamanhoFonteTexto = formato === "feed" ? "52px" : "70px";
        const tamanhoFonteAutor = formato === "feed" ? "34px" : "42px";
        const tamanhoFonteMarca = formato === "feed" ? "26px" : "34px";

        exportacao = document.createElement("div");
        exportacao.style.cssText = `position:fixed;left:-9999px;top:0;width:${largura}px;height:${altura}px;overflow:hidden;background:#111;font-family:Arial,sans-serif;z-index:-9999;`;
        exportacao.innerHTML = `
            <img src="${imgSrc}" crossorigin="anonymous" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
            <div style="position:absolute;inset:0;background:rgba(0,0,0,.45);"></div>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px;text-align:center;color:white;">
                <div style="font-size:${tamanhoFonteTexto};font-weight:bold;line-height:1.4;">${texto}</div>
                <div style="margin-top:50px;font-size:${tamanhoFonteAutor};">${autor}</div>
                <div style="position:absolute;bottom:50px;font-size:${tamanhoFonteMarca};">📖 Frases de Messias</div>
            </div>
        `;
        document.body.appendChild(exportacao);
        await new Promise(resolve => setTimeout(resolve, 300));

        if (typeof html2canvas === "undefined") {
            throw new Error("Biblioteca html2canvas não carregada.");
        }

        const canvas = await html2canvas(exportacao, {
            useCORS: true, allowTaint: true, scale: 1, backgroundColor: null, imageTimeout: 4000
        });

        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("Erro ao gerar imagem.");

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `frase-${formato}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Erro ao gerar imagem:", e);
        const textoCard = card.querySelector(".textoFrase")?.innerText || "";
        if (textoCard) {
            await navigator.clipboard.writeText(textoCard);
            alert("⚠️ Não foi possível gerar a imagem, mas o texto foi copiado!");
        } else {
            alert("Erro ao gerar a imagem. Verifique se incluiu a biblioteca html2canvas.");
        }
    } finally {
        if (exportacao && exportacao.parentNode) document.body.removeChild(exportacao);
        botao.disabled = false;
        botao.innerHTML = textoBotaoOriginal;
    }
}

// ======================
// INICIALIZAÇÃO
// ======================
document.addEventListener("DOMContentLoaded", () => {
    const lista = document.getElementById("listaFrases");
    const listaCategorias = document.getElementById("listaCategorias");
    const pesquisa = document.getElementById("pesquisa");
    const fraseDiaElemento = document.getElementById("fraseDia");

    // Busca em tempo real


                             
