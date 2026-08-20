# Validação — botões sociais

- A Comunidade local foi carregada em `http://localhost:4174/comunidade.html` com cabeçalho, filtros e feed responsivos.
- Neste ambiente local, o feed retornou o estado vazio; portanto, a faixa de ações de uma publicação não ficou disponível para inspeção direta nessa rota.
- A tentativa de abrir o perfil público com parâmetro `uid` teve o parâmetro removido pelo navegador de teste, resultando em “Perfil inválido ou não informado”.
- A sintaxe de `comunidade.js` e `perfil.js`, assim como a consistência do diff, foram validadas com êxito antes do teste visual.

Próximo teste: inserir temporariamente um cartão local de demonstração no DOM para conferir os quatro botões e o estado ativo no layout móvel, sem alterar dados do Firebase.

A demonstração visual confirmou o alinhamento das quatro ações em uma linha, com o estado Curtido destacado. A inspeção também revelou que um estilo específico do perfil aplica fundo escuro à faixa de ações, reduzindo o contraste dos botões inativos. Esse estilo será substituído por uma faixa clara, semelhante aos controles de redes sociais, preservando o contraste no tema escuro.

A primeira tentativa de recarregamento não substituiu o documento de demonstração já injetado, portanto ainda exibiu o estilo anterior. A página será aberta novamente para carregar a folha de estilos atualizada e repetir a conferência.

A nova demonstração carregou a regra corrigida: a faixa de ações ficou transparente sobre o cartão branco, os quatro botões permanecem em uma linha e o estado Curtido aparece em rosa suave. Os rótulos Salvar, Comentar e Compartilhar mantêm contraste adequado e áreas de toque compactas, no padrão de redes sociais.
