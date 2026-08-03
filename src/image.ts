import terminalImage from "terminal-image";
import { execSync, spawn } from "child_process";

const posterCache = new Map<string, string>();
const posterPreviewCache = new Map<string, PosterPreview | null>();

export interface PosterPreviewSpan {
  text: string;
  fg?: string;
  bg?: string;
}

export type PosterPreview = PosterPreviewSpan[][];

function parseAnsiPosterPreview(output: string): PosterPreview {
  // ANSI block output lets OpenTUI redraw the poster as regular terminal cells.
  let fg: string | undefined;
  let bg: string | undefined;
  let line: PosterPreviewSpan[] = [];
  const lines: PosterPreview = [];
  const appendText = (text: string) => {
    const parts = text.replace(/\r/g, "").split("\n");
    parts.forEach((part, index) => {
      if (part) {
        const previous = line.at(-1);
        if (previous && previous.fg === fg && previous.bg === bg) {
          previous.text += part;
        } else {
          line.push({ text: part, fg, bg });
        }
      }
      if (index < parts.length - 1) {
        if (line.length) lines.push(line);
        line = [];
      }
    });
  };
  const applySgr = (parameters: string) => {
    const codes = (parameters || "0").split(";").map(Number);
    for (let index = 0; index < codes.length; index += 1) {
      const code = codes[index];
      if (code === 0) {
        fg = undefined;
        bg = undefined;
      } else if (code === 39) {
        fg = undefined;
      } else if (code === 49) {
        bg = undefined;
      } else if ((code === 38 || code === 48) && codes[index + 1] === 2) {
        const color = `#${codes.slice(index + 2, index + 5).map((value) => value.toString(16).padStart(2, "0")).join("")}`;
        if (code === 38) fg = color;
        else bg = color;
        index += 4;
      }
    }
  };

  const csi = /\x1b\[([?0-9;]*)([ -/]*)([@-~])/g;
  let cursor = 0;
  for (const match of output.matchAll(csi)) {
    appendText(output.slice(cursor, match.index));
    if (match[3] === "m") applySgr((match[1] ?? "").replace("?", ""));
    cursor = (match.index ?? 0) + match[0].length;
  }
  appendText(output.slice(cursor));
  if (line.length) lines.push(line);
  return lines;
}

export async function renderPosterPreview(posterUrl: string, width: number, height: number): Promise<PosterPreview | null> {
  if (!posterUrl || width < 20 || height < 10) return null;

  const cacheKey = `${posterUrl}_${width}x${height}`;
  if (posterPreviewCache.has(cacheKey)) return posterPreviewCache.get(cacheKey)!;

  try {
    const response = await fetch(posterUrl);
    if (!response.ok) throw new Error("No se pudo descargar el poster");
    const renderFn = typeof terminalImage === "function" ? terminalImage : (terminalImage as any).buffer;
    if (typeof renderFn !== "function") throw new Error("terminal-image no disponible");

    const output = await renderFn(Buffer.from(await response.arrayBuffer()), {
      width,
      height,
      preferNativeRender: false
    });
    const preview = parseAnsiPosterPreview(output);
    const result = preview.length ? preview : null;
    posterPreviewCache.set(cacheKey, result);
    return result;
  } catch (_) {
    posterPreviewCache.set(cacheKey, null);
    return null;
  }
}

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
