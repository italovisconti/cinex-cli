import { execSync, spawn, type ChildProcess } from "child_process";
import readline from "readline";
import pc from "picocolors";
import { openPosterInBrowser } from "./image";

export function getYtDlpPath(): string | null {
  const localBin = `${process.env.HOME || ""}/.local/bin/yt-dlp`;
  try {
    if (execSync(`test -x "${localBin}"`, { stdio: "pipe" })) return localBin;
  } catch (_) {}

  try {
    const res = execSync("which yt-dlp", { stdio: "pipe" }).toString().trim();
    if (res) return res;
  } catch (_) {}

  return null;
}

export function isYtDlpInstalled(): boolean {
  return getYtDlpPath() !== null;
}

export function isTimgInstalled(): boolean {
  try {
    const res = execSync("which timg", { stdio: "pipe" }).toString().trim();
    return Boolean(res);
  } catch (_) {
    return false;
  }
}

function isExitKey(chunk: Buffer): boolean {
  const key = chunk.toString();
  return key.includes("\u001b") || key.includes("\u0003") || /q/i.test(key);
}

function signalProcessTree(child: ChildProcess, signal: NodeJS.Signals) {
  try {
    if (process.platform !== "win32" && child.pid) {
      process.kill(-child.pid, signal);
      return;
    }
  } catch (_) {}

  try {
    child.kill(signal);
  } catch (_) {}
}

function stopProcessTree(child: ChildProcess): () => void {
  signalProcessTree(child, "SIGINT");
  const terminateTimer = setTimeout(() => signalProcessTree(child, "SIGTERM"), 750);
  const killTimer = setTimeout(() => signalProcessTree(child, "SIGKILL"), 1500);

  return () => {
    clearTimeout(terminateTimer);
    clearTimeout(killTimer);
  };
}

async function runPlayback(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve) => {
    const child = spawn(command, args, {
      stdio: ["inherit", "inherit", "inherit"]
    });
    let finished = false;
    let clearKillTimer = () => {};

    const finish = () => {
      if (finished) return;
      finished = true;
      clearKillTimer();
      process.removeListener("SIGINT", onSigint);
      resolve();
    };

    const onSigint = () => {
      try { child.kill("SIGINT"); } catch (_) {}
      const timer = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch (_) {}
      }, 1500);
      clearKillTimer = () => clearTimeout(timer);
    };

    process.on("SIGINT", onSigint);
    child.once("close", finish);
    child.once("error", finish);
  });
}

export async function playTrailerInTerminal(
  movieTitle: string,
  youtubeUrl: string,
  options: { keep?: boolean; tuiMode?: boolean } = {}
): Promise<void> {
  if (!youtubeUrl) {
    console.log(pc.red("[X] No hay enlace de trailer disponible para esta pelicula."));
    return;
  }

  const ytDlpBin = getYtDlpPath();

  // Graceful check for yt-dlp
  if (!ytDlpBin) {
    console.log(pc.yellow("\n[!] Se requiere 'yt-dlp' para reproducir trailers directamente en la terminal."));
    console.log(pc.gray("    Instalacion sugerida: ") + pc.white("curl -sSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp && chmod +x ~/.local/bin/yt-dlp"));
    console.log(pc.cyan(`\n[+] Abriendo trailer oficial en el navegador web: ${youtubeUrl}\n`));
    openPosterInBrowser(youtubeUrl);
    return;
  }

  const sanitizedTitle = movieTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const tmpVideo = `/tmp/cinex_trailer_${sanitizedTitle}.mp4`;

  console.log(pc.cyan(`\n[+] Descargando trailer completo de "${movieTitle}" con yt-dlp...`));
  console.log(pc.gray(`    Presiona [Esc], [q] o [Ctrl+C] en cualquier momento para cancelar y volver.\n`));

  try {
    const dlArgs = [
      "-f", "b/best[ext=mp4]/worst[ext=mp4]/worst/best",
      youtubeUrl,
      "-o", tmpVideo,
      "--playlist-items", "1",
      "--newline",
      "--no-mtime"
    ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn(ytDlpBin, dlArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32"
      });

      let keyHandler: ((chunk: Buffer) => void) | null = null;
      let cancelRequested = false;
      let settled = false;
      let clearStopTimers = () => {};

      const cleanupKeys = () => {
        if (keyHandler && process.stdin.isTTY) {
          try {
            process.stdin.removeListener("data", keyHandler);
            process.stdin.setRawMode(false);
            process.stdin.pause();
          } catch (_) {}
        }
        process.removeListener("SIGINT", onSigint);
        clearStopTimers();
      };

      const rejectOnce = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanupKeys();
        reject(error);
      };

      if (process.stdin.isTTY) {
        try {
          process.stdin.setRawMode(true);
          process.stdin.resume();
          keyHandler = (chunk: Buffer) => {
            if (isExitKey(chunk) && !cancelRequested) {
              cancelRequested = true;
              clearStopTimers = stopProcessTree(child);
              try { execSync(`rm -f "${tmpVideo}"`); } catch (_) {}
            }
          };
          process.stdin.on("data", keyHandler);
        } catch (_) {}
      }
      const onSigint = () => {
        if (cancelRequested) return;
        cancelRequested = true;
        clearStopTimers = stopProcessTree(child);
      };
      process.on("SIGINT", onSigint);

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
        if (settled) return;
        settled = true;
        cleanupKeys();
        if (cancelRequested) {
          reject(new Error("CANCELLED"));
        } else if (code === 0) {
          process.stdout.write("\n\n");
          resolve();
        } else {
          reject(new Error(`yt-dlp exit code ${code}`));
        }
      });

      child.on("error", (err) => {
        rejectOnce(err);
      });
    });

    console.log(pc.bold(pc.green(`[✓] Descarga completa.`)));
    console.log(pc.bold(pc.cyan(`\n[▶] Reproduciendo trailer en la terminal...`)));
    console.log(pc.yellow(`[!] Presiona [q], [Esc] o [Ctrl+C] para salir de la reproduccion.\n`));

    // Play video with timg or mpv
    if (isTimgInstalled()) {
      try {
        await runPlayback("timg", ["-g", "65x30", tmpVideo]);
      } catch (_) {}
    } else {
      try {
        const isMpv = execSync("which mpv", { stdio: "pipe" }).toString().trim();
        if (isMpv) {
          await runPlayback("mpv", ["--vo=caca", tmpVideo]);
        } else {
          console.log(pc.yellow("[!] Instala 'timg' para la mejor reproduccion de video en terminal."));
        }
      } catch (_) {}
    }

    // Auto cleanup in tuiMode or if not keeping file
    if (!options.keep) {
      try { execSync(`rm -f "${tmpVideo}"`); } catch (_) {}
    }

    if (options.tuiMode) {
      return;
    }

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

  } catch (err: any) {
    if (err?.message === "CANCELLED") {
      console.log(pc.yellow(`\n[!] Descarga de trailer cancelada.`));
      return;
    }
    console.log(pc.red(`\n[X] No se pudo completar la descarga del trailer con yt-dlp.`));
    console.log(pc.yellow(`[!] Nota: Es posible que tu version de yt-dlp este desactualizada (YouTube cambia sus algoritmos con frecuencia).`));
    console.log(pc.gray(`    Para actualizar yt-dlp a la ultima version ejecuta:\n    `) + pc.white(`mkdir -p ~/.local/bin && curl -sSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp && chmod +x ~/.local/bin/yt-dlp`));
    console.log(pc.cyan(`\n[+] Abriendo trailer oficial en el navegador web: ${youtubeUrl}\n`));
    openPosterInBrowser(youtubeUrl);
  }
}
