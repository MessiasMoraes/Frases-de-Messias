# Rede Social Integrada — Primeira Versão

## Objetivo

Evoluir a Comunidade do **Frases de Messias** para uma experiência social integrada ao portal, sem criar um serviço paralelo nem expor dados privados dos membros.

## Recursos incluídos

| Recurso | Implementação | Privacidade e moderação |
|---|---|---|
| Explorar pessoas | Página pública com busca local e cartões de perfis públicos. | Exibe apenas nome, biografia, foto e métricas públicas; nunca e-mail. |
| Feed social | Abas **Para você**, **Seguindo** e **Recentes** na Comunidade. | Mantém somente publicações aprovadas e filtra perfis bloqueados. |
| Seguindo | A aba Seguindo usa a coleção privada do próprio membro. | Cada pessoa consulta apenas a própria lista de perfis seguidos. |
| Notificações | Página privada para avisos de novo seguidor e curtida em publicação. | Somente o destinatário e a moderação podem ler as notificações. |
| Contadores sociais | Seguidores e seguindo nos perfis e nos cartões de descoberta. | Relação de seguidores permanece pública para contagem; lista de seguindo é privada. |

## Modelo de dados complementar

```text
comunidadeUsuarios/{uid}/notificacoes/{notificacaoId}
  tipo: "seguidor" | "curtida"
  atorId: string
  atorNome: string
  publicacaoId: string
  perfilUrl: string
  texto: string
  lida: boolean
  criadoEm: timestamp
```

Os identificadores serão determinísticos: `seguidor_{atorId}` para seguir e `curtida_{publicacaoId}_{atorId}` para curtidas. Assim, uma mesma interação não cria avisos duplicados. Se a pessoa deixar de seguir ou retirar a curtida, o aviso correspondente é removido.

## Proteções mantidas

As publicações e comentários continuam entrando em análise. Bloqueio, denúncia, restrições administrativas e o painel de moderação permanecem ativos. A primeira versão não inclui mensagens privadas, envio de imagens por membros nem notificações de comentários pendentes; esses recursos exigem controles adicionais de moderação e armazenamento.

## Navegação

A Comunidade passa a oferecer atalhos para **Explorar pessoas**, **Notificações** e **Meu perfil**. O restante do site continua apontando para a Comunidade, mantendo a experiência em um único domínio.

## Critérios de validação

A publicação só será concluída após validar o feed para visitantes e membros, os filtros de feed, a lista de perfis, a criação e leitura privada de notificações, as regras do Firestore e a navegação em tela móvel.
