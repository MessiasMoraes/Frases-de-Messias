// Configuração da API do Gemini
const GEMINI_API_KEY = "AQ.Ab8RN6JwOx1BCXtyFkGYM0Ghuo63JNhh9lDiqo9UdoGdwIYRNQ";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Banco de Dados de Frases Local
const bancoDeFrases = [
  { texto: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", categoria: "sucesso" },
  { texto: "Acredite que você pode e você já está no meio do caminho.", categoria: "motivacao" },
  { texto: "A gratidão transforma o que temos em suficiente.", categoria: "gratidao" },
  { texto: "Fé é dar o primeiro passo mesmo quando você não vê a escada inteira.", categoria: "fe" },
  { texto: "A amizade duplica as alegrias e divide as tristezas.", categoria: "amizade" },
  { texto: "O amor é a força mais abstrata, e também a mais potente que há no mundo.", categoria: "amor" },
  { texto: "A esperança é o sonho do homem acordado.", categoria: "esperanca" },
  { texto: "A família é o bem mais precioso que Deus nos deu.", categoria: "familia" },
  { texto: "Que a noite traga paz e renove as suas energias para amanhã.", categoria: "boa-noite" },
  { texto: "Um novo dia é uma nova oportunidade para recomeçar.", categoria: "bom-dia" }
];

// --- 1. FUNÇÃO DA IA GEMINI ---
async function gerarFraseComIA(promptUsuario) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ 
          text: `Escreva uma frase inspiradora, curta e marcante sobre o tema: ${promptUsuario}. Retorne apenas a frase, sem explicações adicionais.` 
        }]
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `Erro ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar a frase.";
}

// --- 2. RENDERIZAR FRASES NA TELA ---
function renderizarFrases(frasesParaExibir) {
  const container = document.getElementById('listaFrases');
  if (!container) return;

  container.innerHTML = '';

  if (frasesParaExibir.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px;">Nenhuma frase encontrada.</p>';
    return;
  }

  frasesParaExibir.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card-frase';
    card.style.cssText = "background: #fff; padding: 15px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); color: #333;";
    
    card.innerHTML = `
      <p style="font-size: 1.1rem; margin-bottom: 10px;">"${item.texto}"</p>
      <small style="color: #666; text-transform: capitalize;">Tag: ${item.categoria}</small>
    `;
    container.appendChild(card);
  });
}

// --- 3. INICIALIZAÇÃO DOS EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
  
  // Renderiza as frases estáticas inicialmente
  renderizarFrases(bancoDeFrases);

  // Evento do Gerador IA
  const inputPrompt = document.getElementById('promptIA');
  const btnGerar = document.getElementById('gerarIaBtn');
  const divResultado = document.getElementById('resultadoIA');

  if (btnGerar && inputPrompt && divResultado) {
    btnGerar.addEventListener('click', async () => {
      const tema = inputPrompt.value.trim();
      
      if (!tema) {
        divResultado.style.color = "#d9534f";
        divResultado.textContent = "Por favor, digite um tema ou sentimento!";
        return;
      }

      btnGerar.disabled = true;
      btnGerar.textContent = "Gerando...";
      divResultado.style.color = "#333";
      divResultado.textContent = "✨ Criando uma frase especial para você...";

      try {
        const frase = await gerarFraseComIA(tema);
        divResultado.innerHTML = `<strong>"${frase.trim()}"</strong>`;
      } catch (error) {
        console.error("Erro na API Gemini:", error);
        divResultado.style.color = "#d9534f";
        divResultado.textContent = "Ops! Ocorreu um erro ao gerar a frase. Tente novamente.";
      } finally {
        btnGerar.disabled = false;
        btnGerar.textContent = "Gerar Frase";
      }
    });
  }

  // Evento da Barra de Pesquisa
  const inputPesquisa = document.getElementById('pesquisa');
  if (inputPesquisa) {
    inputPesquisa.addEventListener('input', (e) => {
      const termo = e.target.value.toLowerCase();
      const filtradas = bancoDeFrases.filter(f => 
        f.texto.toLowerCase().includes(termo) || f.categoria.toLowerCase().includes(termo)
      );
      renderizarFrases(filtradas);
    });
  }

  // Evento Botão Copiar Frase do Dia
  const btnCopiar = document.getElementById('copiarBtn');
  const fraseDia = document.getElementById('fraseDia');
  if (btnCopiar && fraseDia) {
    btnCopiar.addEventListener('click', () => {
      navigator.clipboard.writeText(fraseDia.textContent.trim());
      alert('Frase copiada com sucesso!');
    });
  }

  // Evento Alternar Modo Escuro
  const temaBtn = document.getElementById('temaBtn');
  if (temaBtn) {
    temaBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
    });
  }
});
