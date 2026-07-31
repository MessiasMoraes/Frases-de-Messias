// Configuração da API do Gemini
const GEMINI_API_KEY = "AQ.Ab8RN6JwOx1BCXtyFkGYM0Ghuo63JNhh9lDiqo9UdoGdwIYRNQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Envia o tema/prompt para a Gemini API e retorna a frase gerada.
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
                            { text: `Escreva uma frase curta e inspiradora sobre o tema: ${prompt}` }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Erro ${response.status}`);
        }

        const data = await response.json();
        const respostaTexto = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!respostaTexto) {
            throw new Error("Nenhum conteúdo retornado pela API.");
        }

        return respostaTexto;

    } catch (error) {
        console.error("Erro na Gemini API:", error);
        throw error;
    }
}

// Vinculação com os elementos da tela
document.addEventListener('DOMContentLoaded', () => {
    // Busca o botão pelo texto ou tag
    const botoes = Array.from(document.querySelectorAll('button'));
    const btnGerar = botoes.find(b => b.textContent.includes('Gerar Frase')) || document.querySelector('#btn-gerar');
    
    // Busca o input de texto
    const inputTema = document.querySelector('input[placeholder*="Pesquisar"], input[type="text"]') || document.querySelector('#input-tema');

    if (btnGerar && inputTema) {
        btnGerar.addEventListener('click', async () => {
            const tema = inputTema.value.trim();
            if (!tema) {
                alert('Por favor, digite um tema para gerar a frase!');
                return;
            }

            const textoOriginalBotao = btnGerar.textContent;
            btnGerar.textContent = 'Gerando...';
            btnGerar.disabled = true;

            try {
                const fraseGerada = await enviarParaGemini(tema);
                
                // Exibe o resultado na tela (substitui na área de Frase do Dia ou via alert)
                const areaFrase = document.querySelector('blockquote, .frase-resultado, p');
                if (areaFrase) {
                    areaFrase.textContent = `"${fraseGerada.trim()}"`;
                } else {
                    alert(fraseGerada);
                }
            } catch (err) {
                alert('Erro ao gerar a frase. Tente novamente em alguns instantes.');
            } finally {
                btnGerar.textContent = textoOriginalBotao;
                btnGerar.disabled = false;
            }
        });
    }
});
