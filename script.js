// Integracao do Gerador de Frases com IA (Gemini API)
const GEMINI_API_KEY = "COLE_AQUI_A_SUA_CHAVE_QUE_COMECA_COM_AIzaSy"; 

const promptInput = document.getElementById('promptIA');
const gerarBtn = document.getElementById('gerarIaBtn');
const resultadoIaDiv = document.getElementById('resultadoIA');

if (gerarBtn && promptInput && resultadoIaDiv) {
  gerarBtn.addEventListener('click', async () => {
    const textoUsuario = promptInput.value.trim();

    if (!textoUsuario) {
      resultadoIaDiv.innerText = "Por favor, digite um tema ou sentimento!";
      return;
    }

    resultadoIaDiv.innerText = "🤖 Criando sua frase inspiradora...";

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Escreva uma frase curta, inspiradora e emocionante em português sobre o tema ou sentimento: "${textoUsuario}". Retorne apenas a frase entre aspas e nada mais.`
            }]
          }]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.error?.message || "Erro de autenticação";
        resultadoIaDiv.innerText = `⚠️ Erro na IA: ${msg}`;
        return;
      }

      const fraseGerada = data.candidates[0].content.parts[0].text;

      resultadoIaDiv.innerHTML = `
        <blockquote style="background: white; padding: 15px; border-left: 4px solid #4A90E2; border-radius: 6px; display: inline-block; text-align: left; margin-top: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); color: #333;">
          ${fraseGerada}
        </blockquote>
      `;
    } catch (error) {
      console.error(error);
      resultadoIaDiv.innerText = "Ops! Erro ao conectar com a IA. Tente novamente.";
    }
  });
}
