# Diagnóstico da busca da página inicial

**Data:** 15 de agosto de 2026  
**URL testada:** https://frasesdemessias.com.br/?diagnostico-busca=20260815

## Constatações da reprodução pública

| Verificação | Resultado |
|---|---|
| Campos de pesquisa | Os elementos `#pesquisa` e `#pesquisaAutor` estão presentes na página inicial. |
| Base de frases | O carregamento público conclui e a lista contém muitas frases renderizadas. |
| Fluxo inicial | Durante o carregamento, o local da lista mostra “Carregando frases...”, período em que uma busca digitada pode não produzir retorno visível imediato. |
| Risco de usabilidade | Os resultados ficam muito abaixo dos campos de pesquisa em dispositivos móveis, sem indicação de quantidade encontrada ou rolagem automática após a digitação. |

A correção deve manter a filtragem em tempo real, informar que a busca está aguardando o carregamento quando necessário, exibir a quantidade de resultados e levar o visitante até a lista filtrada apenas quando ele iniciar uma pesquisa.

## Confirmação após a publicação da correção

A versão pública identificada pelo parâmetro `versao=d0a73dd` respondeu com HTTP 200 e carregou o acervo normalmente. A nova interface de status está presente após o carregamento das frases e deverá informar a quantidade encontrada ao digitar uma pesquisa, tornando a filtragem visível sem exigir que o visitante procure os cartões abaixo do cabeçalho.

## Testes funcionais publicados

| Tipo de busca | Termo usado | Resultado visível |
|---|---|---|
| Tema/palavra | `gratidão` | `64 frases encontradas para “gratidão”.` e botão “Ver resultados ↓”. |
| Autor | `Messias` (com o tema ativo) | `64 frases encontradas por autor “Messias”.` e botão “Ver resultados ↓”. |

Os cartões exibidos abaixo do cabeçalho foram filtrados de acordo com a consulta. A nova mensagem resolve a falta de confirmação que fazia parecer que o campo não estava buscando.

## Falha reproduzida — consulta por categoria em linguagem natural

Na página publicada, a consulta `frases de amor` exibiu `0 frases encontradas`, embora o acervo local possua 50 frases com a categoria `Amor`. A causa é que o filtro atual procura a expressão completa no texto, autor ou categoria; a categoria contém apenas `amor`, não `frases de amor`. A correção deve interpretar termos contextuais como `frases de`, `frase de`, `mensagens de` e `mensagem de`, preservando a palavra de tema relevante para a busca.

## Validação da publicação da correção

A versão publicada com o identificador `18b3bc4` respondeu com HTTP 200 e carregou o acervo completo de frases antes do teste da consulta em linguagem natural.

A consulta publicada `frases de amor` retornou 64 frases da categoria Amor. Com o autor `Messias` preenchido em conjunto, a busca continuou retornando 64 frases, confirmando a preservação do filtro por autor.
