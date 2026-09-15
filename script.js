import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy, limit, documentId } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

let frases = [];
let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];

const categoriasFixas = ["Amizade", "Amor", "Boa Noite", "Bom Dia", "Esperança", "Família", "Fé", "Gratidão", "Motivação", "Reflexão", "Sucesso", "Vida"];

// MONTAR CATEGORIAS NA TELA
function carregarCategorias() {
    const listaCat = document.getElementById("listaCategorias");
    if (!listaCat) return;
    listaCat.innerHTML = "";
    
    categoriasFixas.forEach(cat => {
        const btn = document.createElement("div");
        btn.className = "itemCategoria";
        btn.textContent = cat;
        btn.onclick = () => {
            const filtradas = frases.filter(f => (f.categoria || "").toLowerCase() === cat.toLowerCase());
            renderizarFrases(filtradas.length > 0 ? filtradas : frases);
        };
        listaCat.appendChild(btn);
    });
}

// CARREGAR FRASES DO BANCO
async function carregarFrases() {
    const lista = document.getElementById("listaFrases");
    const fraseDiaEl = document.getElementById("fraseDia");

    if (lista) lista.innerHTML = `<p style="text-align:center;">⏳ Carregando frases...</p>`;

    try {
        const consulta = await getDocs(query(collection(db, "frases"), orderBy(documentId()), limit(20)));
        frases = [];
        consulta.forEach(docSnap => frases.push({ id: docSnap.id, ...docSnap.data() }));

        if (frases.length === 0) {
            if (lista) lista.innerHTML = `<p style="text-align:center;">Nenhuma frase encontrada.</p>`;
            return;
        }

        if (fraseDiaEl) {
            const aleatoria = frases[Math.floor(Math.random() * frases.length)];
            fraseDiaEl.textContent = `"${aleatoria.texto}" — ${aleatoria.autor || "Messias"}`;
        }

        renderizarFrases(frases);
    } catch (erro) {
        console.error("Erro Firebase:", erro);
        if (lista) lista.innerHTML = `<p style="text-align:center; color:red;">Erro ao carregar dados.</p>`;
    }
}

// RENDERIZAR CARDS
function renderizarFrases(listaDeFrases) {
    const lista = document.getElementById("listaFrases");
    if (!lista) return;
    lista.innerHTML = "";

    listaDeFrases.forEach(f => {
        const card = document.createElement("div");
        card.className = "cardFrase";

        const semente = f.id || "messias";
        const imagemUrl = f.imagem && f.imagem.trim() !== "" ? f.imagem : `https://picsum.photos/seed/${encodeURIComponent(semente)}/600/600`;

        card.innerHTML = `
            <div class="imagemFrase">
                <img src="${imagemUrl}" alt="Frase de Messias" loading="lazy" onerror="this.onerror=null; this.src='https://picsum.photos/seed/${encodeURIComponent(semente)}/600/600';">
                <div class="overlay">
                    <p class="textoFrase">"${f.texto}"</p>
                    <p class="autorFrase">— ${f.autor || "Messias"}</p>
                    <div class="marca">📖 Frases de Messias</div>
                </div>
            </div>
            <div class="botoes">
                <button type="button" class="btnAcao btnFavorito">${favoritos.includes(f.id) ? "❤️" : "🤍"}</button>
                <button type="button" class="btnAcao btnCopiar">📋 Copiar</button>
                <button type="button" class="btnAcao btnBaixar">🖼️ Baixar</button>
            </div>
        `;

        const btnCopiar = card.querySelector(".btnCopiar");
        const btnFavorito = card.querySelector(".btnFavorito");
        const btnBaixar = card.querySelector(".btnBaixar");

        btnCopiar.addEventListener("click", () => {
            navigator.clipboard.writeText(`"${f.texto}" — ${f.autor || "Messias"}`);
            btnCopiar.textContent = "✅ Copiado!";
            setTimeout(() => { btnCopiar.textContent = "📋 Copiar"; }, 2000);
        });

        btnFavorito.addEventListener("click", () => {
            if (favoritos.includes(f.id)) {
                favoritos = favoritos.filter(id => id !== f.id);
                btnFavorito.textContent = "🤍";
            } else {
                favoritos.push(f.id);
                btnFavorito.textContent = "❤️";
            }
            localStorage.setItem("favoritos", JSON.stringify(favoritos));
        });

        btnBaixar.addEventListener("click", () => baixarCardComoImagem(f, imagemUrl, btnBaixar));

        lista.appendChild(card);
    });
}

// DOWNLOAD VIA CANVAS
async function baixarCardComoImagem(f, urlImagem, botao) {
    const textoOriginal = botao.textContent;
    botao.textContent = "⏳ Gerando...";
    botao.disabled = true;

    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 800;
        canvas.height = 800;

        let imagemCarregada = false;

        if (urlImagem) {
            try {
                const imgTemp = new Image();
                imgTemp.crossOrigin = "anonymous";
                imgTemp.src = urlImagem;

                await new Promise((resolve, reject) => {
                    imgTemp.onload = () => resolve();
                    imgTemp.onerror = () => reject();
                });

                const escala = Math.max(canvas.width / imgTemp.width, canvas.height / imgTemp.height);
                const x = (canvas.width / 2) - (imgTemp.width / 2) * escala;
                const y = (canvas.height / 2) - (imgTemp.height / 2) * escala;
                ctx.drawImage(imgTemp, x, y, imgTemp.width * escala, imgTemp.height * escala);
                imagemCarregada = true;
            } catch (_) {
                imagemCarregada = false;
            }
        }

        if (!imagemCarregada) {
            const gradiente = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradiente.addColorStop(0, "#1e293b");
            gradiente.addColorStop(1, "#0f172a");
            ctx.fillStyle = gradiente;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 32px sans-serif";

        const palavras = `"${f.texto}"`.split(" ");
        let linha = "";
        const linhas = [];
        const larguraMaxima = 680;

        for (let n = 0; n < palavras.length; n++) {
            const linhaTeste = linha + palavras[n] + " ";
            if (ctx.measureText(linhaTeste).width > larguraMaxima && n > 0) {
                linhas.push(linha);
                linha = palavras[n] + " ";
            } else {
                linha = linhaTeste;
            }
        }
        linhas.push(linha);

        const alturaLinha = 44;
        let inicioY = (canvas.height / 2) - ((linhas.length * alturaLinha) / 2) - 20;

        linhas.forEach(l => {
            ctx.fillText(l.trim(), canvas.width / 2, inicioY);
            inicioY += alturaLinha;
        });

        ctx.font = "italic 24px sans-serif";
        ctx.fillText(`— ${f.autor || "Messias"}`, canvas.width / 2, inicioY + 30);

        ctx.font = "18px sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillText("📖 Frases de Messias", canvas.width / 2, canvas.height - 40);

        const link = document.createElement("a");
        link.download = `frase-${f.id || "messias"}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

    } catch (erro) {
        alert("Erro no download.");
    } finally {
        botao.textContent = textoOriginal;
        botao.disabled = false;
    }
}

// EVENTOS DE PESQUISA E TEMA
const pesquisaInput = document.getElementById("pesquisa");
if (pesquisaInput) {
    pesquisaInput.addEventListener("input", () => {
        const termo = pesquisaInput.value.toLowerCase().trim();
        const filtradas = frases.filter(f => 
            (f.texto || "").toLowerCase().includes(termo) || 
            (f.autor || "").toLowerCase().includes(termo)
        );
        renderizarFrases(filtradas);
    });
}

const temaBtn = document.getElementById("temaBtn");
if (temaBtn) {
    temaBtn.addEventListener("click", () => document.body.classList.toggle("dark"));
}

carregarCategorias();
carregarFrases();
