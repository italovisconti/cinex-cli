import { execSync, spawn } from "child_process";
import pc from "picocolors";
import { startCliSpinner } from "./spinner";

export async function playTrailerInTerminal(youtubeUrl: string, seconds = 6): Promise<void> {
  if (!youtubeUrl) {
    console.log(pc.red("[X] No hay enlace de trailer disponible."));
    return;
  }

  const spinner = startCliSpinner("Descargando trailer corto para reproducir en terminal...");
  const tmpVideo = `/tmp/cinex_trailer_${Date.now()}.mp4`;

  try {
    // Download a 5-6 second short clip using yt-dlp
    const cmd = `yt-dlp -f "worst[ext=mp4]/worst" "${youtubeUrl}" -o "${tmpVideo}" --playlist-items 1 --download-sections "*0-${seconds}" --quiet`;
    execSync(cmd, { stdio: "ignore" });
    spinner.stop();

    console.log(pc.bold(pc.cyan(`\n[▶] Reproduciendo trailer en la terminal (${seconds}s)...\n`)));

    // Play with timg if available
    try {
      const isTimgInstalled = execSync("which timg", { stdio: "pipe" }).toString().trim();
      if (isTimgInstalled) {
        execSync(`timg -g 60x28 "${tmpVideo}"`, { stdio: "inherit" });
        return;
      }
    } catch (_) {
      // Fallback to mpv or chafa
    }

    try {
      const isMpvInstalled = execSync("which mpv", { stdio: "pipe" }).toString().trim();
      if (isMpvInstalled) {
        execSync(`mpv --vo=caca "${tmpVideo}"`, { stdio: "inherit" });
        return;
      }
    } catch (_) {}

    console.log(pc.yellow("[!] Instala 'timg' o 'mpv' para la mejor reproduccion de video en terminal."));

  } catch (err) {
    spinner.stop();
    console.log(pc.red("[X] No se pudo descargar el trailer. Abriendo enlace en navegador..."));
  }
}
