# Configuração de vídeo MP4 na Vercel

O site já possui a interface de download e o endpoint `/api/render-video`. Para gerar MP4 de verdade, a Vercel precisa de dois recursos conectados ao projeto: um **Blob store**, que receberá os arquivos `.mp4`, e um **snapshot de Sandbox com FFmpeg**, que executará a renderização em ambiente isolado.

> A imagem padrão do Sandbox não deve ser tratada como uma instalação pronta de FFmpeg. O fluxo oficial da Vercel recomenda preparar uma vez um snapshot contendo o binário, usar esse snapshot em cada renderização e guardar o resultado no Blob.[1]

| Item | Onde configurar | Variável esperada | Finalidade |
|---|---|---|---|
| Vercel Blob | Projeto → **Storage** | `BLOB_READ_WRITE_TOKEN` | Guarda e serve o MP4 para download. |
| Snapshot de FFmpeg | Criado pelo comando deste projeto | `SANDBOX_SNAPSHOT_ID` | Inicia o Sandbox com FFmpeg já disponível. |

## 1. Conectar o Vercel Blob

No painel da Vercel, abra o projeto **frasesdemessiascombr**. Entre em **Storage**, escolha **Create Database** ou **Create**, selecione **Blob**, dê um nome como `frases-mp4` e conecte-o ao projeto. Ao finalizar, confirme em **Settings → Environment Variables** que `BLOB_READ_WRITE_TOKEN` foi incluída para **Production**, **Preview** e **Development**. O token é secreto e não deve ser colocado no `script.js`, no Firebase ou no GitHub.

## 2. Criar o snapshot que contém FFmpeg

No computador que tenha acesso à conta da Vercel, abra um terminal na pasta do projeto e execute os comandos abaixo. O comando `vercel env pull` prepara a autenticação local usada pelo SDK do Sandbox.[1]

```bash
npm install
npx vercel link
npx vercel env pull .env.local
npm run snapshot:ffmpeg
```

Ao concluir, o último comando imprime uma linha neste formato:

```text
SANDBOX_SNAPSHOT_ID=snap_xxxxxxxxxxxxxxxxx
```

Copie apenas o valor à direita do sinal de igual. No painel da Vercel, abra **Settings → Environment Variables**, crie a variável `SANDBOX_SNAPSHOT_ID`, cole o valor e marque os três ambientes: **Production**, **Preview** e **Development**. Salve a variável.

O script `scripts/build-ffmpeg-snapshot.mjs` instala o FFmpeg na imagem universal do Sandbox, cria o snapshot e imprime o identificador. O endpoint de vídeo utiliza `/vercel/sandbox/ffmpeg`, que é o caminho fixado durante essa preparação.

## 3. Publicar e testar

Depois de salvar as variáveis, abra **Deployments**, escolha o último deploy e use **Redeploy**. Em seguida, visite `https://frasesdemessiascombr.vercel.app`, abra uma frase e escolha **Vídeo Feed (1:1)**. Repita com **Vídeo Story (9:16)**. O resultado esperado é o aviso de processamento e, ao final, o download de um arquivo `.mp4` hospedado no Blob.

| Resultado observado | Significado | Próxima ação |
|---|---|---|
| `Configuração pendente: SANDBOX_SNAPSHOT_ID` | O endpoint está online, mas falta criar/salvar o snapshot. | Execute a etapa 2 e adicione a variável. |
| Erro citando `BLOB_READ_WRITE_TOKEN` | O Blob ainda não foi conectado ao projeto ou a variável não alcançou o deploy. | Conecte o Blob e faça redeploy. |
| Download de `.mp4` | Fluxo completo validado. | Teste em Android e iOS. |

## 4. Retenção recomendada

Cada vídeo gerado ocupa armazenamento e transferência no Blob. Para o plano Hobby, mantenha uma política simples: vídeos de teste devem ser removidos depois de alguns dias e os vídeos definitivos só devem permanecer enquanto forem necessários. A operação de exclusão de blobs não tem custo, e a área de observabilidade da Vercel mostra armazenamento, operações e transferências.[2]

## Referências

[1]: https://vercel.com/kb/guide/user-uploaded-files-vercel-sandbox-and-blob "Vercel — Processar arquivos com Sandbox e Blob"
[2]: https://vercel.com/docs/vercel-blob/usage-and-pricing "Vercel Blob — Uso e preços"
