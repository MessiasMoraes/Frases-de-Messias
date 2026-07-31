// Configuração da API do Gemini
const GEMINI_API_KEY = "AQ.Ab8RN6JwOx1BCXtyFkGYM0Ghuo63JNhh9lDiqo9UdoGdwIYRNQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Envia uma mensagem para a Gemini API e retorna o texto gerado.
 * @param {string} prompt Texto ou pergunta enviada pelo usuário.
 * @returns {Promise<string>} Resposta gerada pela IA.
 */
async function enviarParaGemini(prompt) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Erro ${response.status}: Falha na requisição`);
        }

        const data = await response.json();
        
        // Extrai o texto da resposta
        const respostaTexto = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!respostaTexto) {
            throw new Error("Nenhum conteúdo retornado pela API.");
        }

        return respostaTexto;

    } catch (error) {
        console.error("Erro ao chamar a Gemini API:", error);
        throw error;
    }
}

// Exemplo de integração simples com formulário ou interface no PWA
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('user-input');
    const output = document.getElementById('output');

    if (form && input && output) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const prompt = input.value.trim();
            if (!prompt) return;

            output.textContent = 'Pensando...';
            
            try {
                const resposta = await enviarParaGemini(prompt);
                output.textContent = resposta;
            } catch (err) {
                output.textContent = 'Ops! Ocorreu um erro ao obter a resposta. Verifique o console.';
            }
        });
    }
});
