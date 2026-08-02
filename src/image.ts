import terminalImage from "terminal-image";
import { execSync, spawn } from "child_process";

const posterCache = new Map<string, string>();

export async function renderPosterInTerminal(posterUrl: string, width = 40): Promise<string> {
  if (!posterUrl) return "[Sin poster disponible]";

  const cacheKey = `${posterUrl}_${width}`;
  if (posterCache.has(cacheKey)) {
    return posterCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(posterUrl);
    if (!res.ok) return "[No se pudo descargar la imagen]";
    
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    try {
      const isTimgInstalled = execSync("which timg", { stdio: "pipe" }).toString().trim();
      if (isTimgInstalled) {
        const tmpFile = `/tmp/cinex_poster_${Date.now()}_${width}.jpg`;
        await Bun.write(tmpFile, buffer);
        const output = execSync(`timg -g ${width}x0 "${tmpFile}"`, { stdio: "pipe" }).toString();
        posterCache.set(cacheKey, output);
        return output;
      }
    } catch (_) {
      // Fallback to terminal-image
    }

    const renderFn = typeof terminalImage === "function" ? terminalImage : (terminalImage as any).buffer;
    if (typeof renderFn === "function") {
      const ascii = await renderFn(buffer, { width });
      posterCache.set(cacheKey, ascii);
      return ascii;
    }
  } catch (err) {
    console.error("Error al renderizar poster:", err);
  }

  return "[Error al procesar la imagen]";
}

function clearPosterScreen() {
  // Kitty images live outside the terminal character grid, so erase them explicitly.
  process.stdout.write("\x1b_Ga=d,d=A\x1b\\\x1b[2J\x1b[H");
}

async function waitForPosterDismissal(): Promise<void> {
  if (!process.stdin.isTTY) return;

  const wasRaw = process.stdin.isRaw;
  if (!wasRaw) process.stdin.setRawMode(true);
  process.stdin.resume();

  await new Promise<void>((resolve) => {
    const onData = (chunk: Buffer) => {
      const key = chunk.toString();
      if (key.includes("\u001b") || key.toLowerCase().includes("q")) {
        process.stdin.removeListener("data", onData);
        resolve();
      }
    };
    process.stdin.on("data", onData);
  });

  if (!wasRaw) process.stdin.setRawMode(false);
  process.stdin.pause();
}

export async function showPosterInTerminal(title: string, posterUrl: string): Promise<void> {
  clearPosterScreen();
  process.stdout.write(`POSTER: ${title}\n\n`);

  try {
    const width = Math.max(30, Math.min((process.stdout.columns || 80) - 10, 50));
    const art = await renderPosterInTerminal(posterUrl, width);
    if (art) process.stdout.write(`${art}\n`);
  } catch (err) {
    process.stdout.write(`[Error al renderizar el poster: ${String(err)}]\n`);
  }

  process.stdout.write("\n[Esc] o [q] para volver al TUI\n");
  try {
    await waitForPosterDismissal();
  } finally {
    clearPosterScreen();
  }
}

export function openPosterInBrowser(url: string) {
  if (!url) return;
  try {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
  } catch (e) {
    console.error("Error abriendo poster en el navegador:", e);
  }
}
