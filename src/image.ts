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

export function openPosterInBrowser(url: string) {
  if (!url) return;
  try {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
  } catch (e) {
    console.error("Error abriendo poster en el navegador:", e);
  }
}
