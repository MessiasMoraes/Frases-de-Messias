# Referências técnicas — mídia no bot do Telegram

## Telegram Bot API

Fonte: <https://core.telegram.org/bots/api#sending-files>

A documentação do Telegram informa que fotos e vídeos podem ser enviados por URL HTTP pública. Para o envio por URL, o limite indicado é de 5 MB para fotos e 20 MB para outros conteúdos. O método `sendPhoto` aceita uma URL de imagem e o método `sendVideo` aceita uma URL de vídeo pública.

Fonte: <https://core.telegram.org/bots/faq>

O Telegram entrega mensagens privadas aos bots e permite o uso de webhooks. Para webhooks, o serviço requer HTTPS válido e não permite redirecionamentos no endereço configurado.

## Vercel Functions

Fonte: <https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package>

A função `waitUntil()` do pacote `@vercel/functions` permite responder ao webhook sem aguardar a conclusão de uma tarefa posterior. A tarefa em segundo plano usa o mesmo limite de duração configurado para a função; se esse tempo terminar, a tarefa é cancelada. Por isso, o webhook de mídia precisa ter duração compatível com a renderização e o processador deve avisar o usuário em caso de falha.

## Decisão aplicada

O webhook confirma imediatamente o pedido de imagem ou vídeo e agenda uma chamada autenticada a um processador de mídia. O processador utiliza o snapshot FFmpeg já usado pelo portal, salva o resultado no Vercel Blob e entrega o arquivo ao Telegram por URL pública. Os limites iniciais definidos são 10 imagens e 2 vídeos por chat por hora.
