# Auditoria inicial de SEO e indexação — Frases de Messias

## Descoberta técnica

Em 14 de agosto de 2026, a URL `https://frasesdemessias.com.br/robots.txt` respondeu com **404 — File not found** no GitHub Pages. Portanto, o domínio não disponibiliza um arquivo `robots.txt` para orientar rastreadores nem contém, nesse ponto, uma referência pública ao sitemap.

Este arquivo deve ser criado na raiz do portal com uma política simples que permita o rastreamento e informe a localização do sitemap, desde que o sitemap também seja criado e publicado.

Fonte observada: https://frasesdemessias.com.br/robots.txt

A URL `https://frasesdemessias.com.br/sitemap.xml` também respondeu com **404 — File not found**. Portanto, o domínio ainda não expõe um sitemap XML, recurso recomendado para apresentar ao Google as URLs relevantes e suas relações.

Fonte observada: https://frasesdemessias.com.br/sitemap.xml

## Presença atual no Google

Uma busca por `site:frasesdemessias.com.br` retornou a página inicial `https://frasesdemessias.com.br/` com o título **Frases de Messias** e a descrição `As melhores frases de motivação, amor, fé e reflexão selecionadas por Messias.`. Assim, o domínio principal já foi descoberto e indexado pelo Google, mas a auditoria não identificou `robots.txt` nem `sitemap.xml`, e os metadados canônicos da página ainda apontam para o antigo domínio GitHub Pages.

Fonte observada: resultado de busca `site:frasesdemessias.com.br` em 14 de agosto de 2026.

## Referências técnicas oficiais

[1]: https://developers.google.com/search/docs/crawling-indexing/robots/intro "Introdução ao robots.txt"
[2]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap "Criar e enviar um sitemap"
[3]: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl "Pedir novo rastreamento de URLs"
[4]: https://developers.google.com/search/docs/fundamentals/seo-starter-guide "Guia inicial de SEO do Google"

A documentação do Google confirma que o `robots.txt` deve ficar na raiz do site; que sitemaps devem listar URLs absolutas e canônicas que se deseja exibir nos resultados; e que o envio do sitemap ou o pedido de indexação são sinais, não garantias de rastreamento imediato. O pedido individual de indexação é feito na ferramenta Inspeção de URL por proprietários ou usuários com acesso completo ao Search Console.[1] [2] [3]

## Google Search Console

A propriedade de domínio `frasesdemessias.com.br` foi iniciada no Google Search Console com a conta administradora `moraesoficialll@gmail.com`. O Console solicitou a verificação por registro DNS TXT. O token exibido foi:

```text
google-site-verification=gZPDE7dqNN0_yAk_MBfj7MdnM15hGkXlRx8SOYlwqzc
```

Para concluir a verificação, esse TXT deve ser criado no DNS autoritativo do domínio, administrado no Registro.br. Após a verificação, o próximo passo é enviar `https://frasesdemessias.com.br/sitemap.xml` pela seção Sitemaps do Search Console.

## Validação pública após a implantação

Em 15 de agosto de 2026, os dois recursos técnicos de rastreamento foram confirmados como acessíveis no domínio público:

- `https://frasesdemessias.com.br/robots.txt` permite o rastreamento geral, bloqueia áreas privadas/administrativas e aponta para o sitemap.
- `https://frasesdemessias.com.br/sitemap.xml` lista as URLs canônicas públicas da página inicial, Sobre, Contato, Comunidade e Política de Privacidade.

A pendência restante para o acompanhamento dentro do Google é somente a verificação da propriedade de domínio no Search Console por meio do registro DNS TXT.
