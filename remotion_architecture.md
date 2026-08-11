# Arquitetura de Renderização Remotion para Vercel

Este documento define a estratégia técnica para renderizar vídeos reais em formato MP4 na Vercel sem depender de simulações ou gravadores de tela.

## 1. Visão Geral
O motor **Remotion** permite criar composições em React que podem ser renderizadas na nuvem usando AWS Lambda ou funções serverless otimizadas. Para o portal **Frases de Messias**, a composição consistirá em:
- Fundo com a imagem do card e sobreposição escura (`overlay`).
- Texto da frase centralizado com fonte elegante e tamanho responsivo.
- Nome do autor e marca d'água discretos.
- Animação de entrada suave (fade-in e zoom sutil).

## 2. Configuração do Projeto Remotion
Para integrar ao projeto existente, criaremos uma pasta `remotion/` contendo:
- `Root.jsx`: Registro da composição (Story 9:16 e Feed 1:1).
- `Composition.jsx`: Componente visual que renderiza a frase sobre a imagem.

## 3. Fluxo de Execução
1. O usuário clica em "Baixar Vídeo MP4".
2. O frontend envia os dados (frase, autor, URL da imagem) para a API da Vercel.
3. A API aciona o processo de renderização e retorna o link temporário do arquivo gerado no Vercel Blob.
4. O navegador dispara o download automático do MP4 para a galeria do usuário.
