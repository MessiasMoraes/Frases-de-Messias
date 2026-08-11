import { Sandbox } from "@vercel/sandbox";

const SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;
const COMMAND_TIMEOUT_MS = 8 * 60 * 1000;

const setupCommand = [
  "set -euo pipefail",
  "export DEBIAN_FRONTEND=noninteractive",
  "apt-get update -y",
  "apt-get install -y --no-install-recommends ffmpeg ca-certificates",
  "install -D -m 755 \"$(command -v ffmpeg)\" /vercel/sandbox/ffmpeg",
  "/vercel/sandbox/ffmpeg -version | head -n 1",
].join("\n");

let sandbox;

try {
  console.log("Criando um Sandbox temporário com a imagem universal da Vercel...");
  sandbox = await Sandbox.create({
    image: "vercel/sandbox/universal",
    resources: { vcpus: 2 },
    timeout: SANDBOX_TIMEOUT_MS,
    persistent: false,
    networkPolicy: "allow-all",
  });

  console.log("Instalando FFmpeg no Sandbox...");
  const result = await sandbox.runCommand("bash", ["-lc", setupCommand], {
    timeoutMs: COMMAND_TIMEOUT_MS,
  });

  if (result.exitCode !== 0) {
    throw new Error(`A instalação do FFmpeg falhou (código ${result.exitCode}): ${result.stderr || result.stdout || "sem saída"}`);
  }

  console.log("Criando o snapshot do Sandbox...");
  const snapshot = await sandbox.snapshot({ expiration: 0 });

  console.log("\nSnapshot criado com sucesso.");
  console.log(`SANDBOX_SNAPSHOT_ID=${snapshot.snapshotId}`);
  console.log("\nCopie a linha acima para as variáveis de ambiente Production, Preview e Development do projeto na Vercel.");
} catch (error) {
  console.error("\nNão foi possível preparar o snapshot FFmpeg.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (sandbox) {
    try {
      await sandbox.delete();
    } catch {
      // O snapshot interrompe o Sandbox; a limpeza complementar pode não ser necessária.
    }
  }
}
