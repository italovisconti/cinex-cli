import { execSync, spawn } from "child_process";
import readline from "readline";
import pc from "picocolors";
import { openPosterInBrowser } from "./image";

export function isYtDlpInstalled(): boolean {
  try {
    const res = execSync("which yt-dlp", { stdio: "pipe" }).toString().trim();
    return Boolean(res);
  } catch (_) {
    return false;
  }
}

export function isTimgInstalled(): boolean {
  try {
    const res = execSync("which timg", { stdio: "pipe" }).toString().trim();
    return Boolean(res);
  } catch (_) {
    return false;
  }
}

export async function playTrailerInTerminal(
  movieTitle: string,
  youtubeUrl: string,
  options: { keep?: boolean } = {}
): Promise<void> {
  if (!youtubeUrl) {
    console.log(pc.red("[X] No hay enlace de trailer disponible para esta pelicula."));
    return;
  }

  // Graceful check for yt-dlp
  if (!isYtDlpInstalled()) {
    console.log(pc.yellow("\n[!] Se requiere 'yt-dlp' para reproducir trailers directamente en la terminal."));
    console.log(pc.gray("    Instalacion sugerida: ") + pc.white("brew install yt-dlp") + pc.gray("  o  ") + pc.white("pip install yt-dlp"));
    console.log(pc.cyan(`\n[+] Abriendo trailer oficial en el navegador web: ${youtubeUrl}\n`));
    openPosterInBrowser(youtubeUrl);
    return;
  }

  const sanitizedTitle = movieTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const tmpVideo = `/tmp/cinex_trailer_${sanitizedTitle}.mp4`;

  console.log(pc.cyan(`\n[+] Descargando trailer completo de "${movieTitle}" con yt-dlp...\n`));

  try {
    const dlArgs = [
      "-f", "worst[ext=mp4]/worst",
      youtubeUrl,
      "-o", tmpVideo,
      "--playlist-items", "1",
      "--newline",
      "--no-mtime"
    ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn("yt-dlp", dlArgs, { stdio: ["ignore", "pipe", "pipe"] });

      child.stdout.on("data", (data: Buffer) => {
        const text = data.toString();
        const match = text.match(/\[download\]\s+(\d+\.\d+)%\s+of\s+~?([^\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/);
        if (match && match[1] && match[2] && match[3] && match[4]) {
          const percent = parseFloat(match[1]);
          const size = match[2];
          const speed = match[3];
          const eta = match[4];

          const barLen = 25;
          const filled = Math.round((percent / 100) * barLen);
          const bar = "█".repeat(filled) + "░".repeat(barLen - filled);

          process.stdout.write(`\r${pc.cyan(" [TRAILER] ")} ${pc.bold(pc.white(bar))} ${pc.yellow(`${percent.toFixed(1)}%`)} | ${pc.dim(size)} | ${pc.green(speed)} | ETA ${pc.gray(eta)} `);
        }
      });

      child.on("close", (code) => {
        if (code === 0) {
          process.stdout.write("\n\n");
          resolve();
        } else {
          reject(new Error(`yt-dlp exit code ${code}`));
        }
      });

      child.on("error", (err) => reject(err));
    });

    console.log(pc.bold(pc.green(`[✓] Descarga completa: ${tmpVideo}`)));
    console.log(pc.bold(pc.cyan(`\n[▶] Reproduciendo trailer en la terminal...\n`)));

    // Play video with timg or mpv
    if (isTimgInstalled()) {
      execSync(`timg -g 65x30 "${tmpVideo}"`, { stdio: "inherit" });
    } else {
      try {
        const isMpv = execSync("which mpv", { stdio: "pipe" }).toString().trim();
        if (isMpv) {
          execSync(`mpv --vo=caca "${tmpVideo}"`, { stdio: "inherit" });
        } else {
          console.log(pc.yellow("[!] Instala 'timg' para la mejor reproduccion de video en terminal."));
        }
      } catch (_) {
        console.log(pc.yellow("[!] Instala 'timg' para la mejor reproduccion de video en terminal."));
      }
    }

    // Prompt user to delete or keep file
    if (options.keep) {
      console.log(pc.gray(`\n[+] Archivo conservado en: ${tmpVideo}\n`));
      return;
    }

    if (process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      await new Promise<void>((resolve) => {
        rl.question(pc.bold(pc.yellow(`\n¿Deseas eliminar el video descargado (${tmpVideo})? [Y/n]: `)), (answer) => {
          rl.close();
          const cleanAns = answer.trim().toLowerCase();
          if (cleanAns === "" || cleanAns === "y" || cleanAns === "s" || cleanAns === "si") {
            try {
              execSync(`rm -f "${tmpVideo}"`);
              console.log(pc.green("[✓] Archivo temporal eliminado correctamente.\n"));
            } catch (e) {
              console.error("Error al eliminar archivo:", e);
            }
          } else {
            console.log(pc.gray(`[+] Archivo guardado en: ${tmpVideo}\n`));
          }
          resolve();
        });
      });
    }

  } catch (err) {
    console.log(pc.red(`\n[X] No se pudo completar la descarga del trailer.`));
    console.log(pc.cyan(`[+] Abriendo trailer oficial en el navegador web: ${youtubeUrl}\n`));
    openPosterInBrowser(youtubeUrl);
  }
}
