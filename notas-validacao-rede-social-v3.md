# Validação local — Rede Social V3

Data: 20 de agosto de 2026.

## Privacidade de perfil

- O editor `meu-perfil.html` preserva o acesso privado: visitante não autenticado recebe a orientação para entrar na Comunidade antes de editar qualquer dado.
- Foram incluídas três preferências públicas no editor: aparecer em Explorar, aceitar novos seguidores e mostrar contagens sociais.

## Descoberta e conteúdo público

- A página `explorar.html` carregou normalmente no servidor local.
- Foram exibidos apenas perfis públicos e publicações já aprovadas.
- A página mantém as buscas separadas por perfil e por publicação, sem listar dados de conta, salvos ou relações privadas de seguimento.

## Observações de segurança

- A ocultação de métricas atua na interface pública e cancela as consultas de contagem para visitantes.
- A recusa a novos seguidores também será aplicada diretamente nas regras do Firestore durante a implantação da V3.
- A atividade do perfil usa somente contagens de publicações e comentários com status `publicado`.

## Limite do teste visual

O navegador local estava sem uma sessão autenticada; por isso, a edição efetiva das preferências será verificada por validação de sintaxe, revisão das regras e implantação no Firebase.

A primeira consulta de contagem de comentários por `collectionGroup` retornou `permission-denied`; a regra recursiva específica para comentários publicados foi adicionada e implantada. Após a primeira recarga, as contagens ainda exibiram traço, portanto a validação continuará separando as consultas de publicações e comentários para identificar a origem exata sem mostrar valores incorretos ao visitante.

A validação posterior confirmou que a regra de comentários foi aceita. O retorno passou a indicar que o índice composto de comentários está em criação, em vez de negar a leitura. A interface será ajustada para tratar as duas métricas de forma independente: a contagem de publicações aprovadas não ficará indisponível enquanto o Firebase conclui o índice de comentários.

Na validação visual, o perfil público passou a exibir corretamente **4 publicações** aprovadas. A contagem de comentários permanece temporariamente como `—` até a finalização do índice composto que o Firebase já aceitou para criação. O comportamento independente evita dados falsos e preserva a métrica de publicações durante esse período.
