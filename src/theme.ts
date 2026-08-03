import fs from "fs";
import os from "os";
import path from "path";
import pc from "picocolors";

export type ThemeName = "classic" | "cinex";
export type CliColor = (text: string) => string;

// Paleta de marca extraida de https://www.cinex.com.ve/ (style.min.css)
export const CINEX_PALETTE = {
  navy: "#01105f",
  burgundy: "#a11f3c",
  mint: "#2cdd9b",
  teal: "#1dc8cd",
  skyBlue: "#00b4ff",
  blue: "#316ce8",
  pink: "#ff4d7e",
  coral: "#ff6a5b",
  gold: "#ffc741",
  warning: "#fec500",
  muted: "#8d97ad",
  lightBg: "#edf5f7",
  white: "#ffffff"
} as const;

export interface TuiTheme {
  header: string;
  title: string;
  info: string;
  accent: string;
  success: string;
  warn: string;
  danger: string;
  link: string;
  muted: string;
  text: string;
  selectedBg: string;
  selectedText: string;
  selectedSubText: string;
  tabActiveBg: string;
  tabActiveText: string;
  tabInactiveBg: string;
  tabInactiveText: string;
  footerBg: string;
  borderMain: string;
  borderInner: string;
  borderAccent: string;
}

export interface CliTheme {
  header: CliColor;
  headerAccent: CliColor;
  headerInfo: CliColor;
  headerDanger: CliColor;
  headerWarn: CliColor;
  title: CliColor;
  info: CliColor;
  accent: CliColor;
  success: CliColor;
  warn: CliColor;
  danger: CliColor;
  link: CliColor;
  muted: CliColor;
  text: CliColor;
  badgeA: CliColor;
  badgeB: CliColor;
  badgeC: CliColor;
}

export interface Theme {
  name: ThemeName;
  tui: TuiTheme;
  cli: CliTheme;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function isTruecolor(): boolean {
  if (process.env.NO_COLOR !== undefined) return false;
  const ct = process.env.COLORTERM || "";
  if (ct.toLowerCase().includes("truecolor") || ct.toLowerCase().includes("24bit")) return true;
  const fc = process.env.FORCE_COLOR;
  return fc === "1" || fc === "true";
}

function ansiFg(hex: string, fallback: CliColor): CliColor {
  if (!isTruecolor()) return fallback;
  const { r, g, b } = hexToRgb(hex);
  return (text) => `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

function ansiBgFg(bgHex: string, fgHex: string, fallback: CliColor): CliColor {
  if (!isTruecolor()) return fallback;
  const bg = hexToRgb(bgHex);
  const fg = hexToRgb(fgHex);
  return (text) => `\x1b[48;2;${bg.r};${bg.g};${bg.b}m\x1b[38;2;${fg.r};${fg.g};${fg.b}m${text}\x1b[0m`;
}

const CLASSIC_TUI: TuiTheme = {
  header: "yellow",
  title: "cyan",
  info: "cyan",
  accent: "magenta",
  success: "green",
  warn: "yellow",
  danger: "red",
  link: "blue",
  muted: "gray",
  text: "white",
  selectedBg: "blue",
  selectedText: "yellow",
  selectedSubText: "white",
  tabActiveBg: "cyan",
  tabActiveText: "black",
  tabInactiveBg: "black",
  tabInactiveText: "white",
  footerBg: "blue",
  borderMain: "cyan",
  borderInner: "gray",
  borderAccent: "yellow"
};

const CLASSIC_CLI: CliTheme = {
  header: (s) => pc.bgBlue(pc.white(s)),
  headerAccent: (s) => pc.bgMagenta(pc.white(s)),
  headerInfo: (s) => pc.bgCyan(pc.black(s)),
  headerDanger: (s) => pc.bgRed(pc.white(s)),
  headerWarn: (s) => pc.bgYellow(pc.black(s)),
  title: pc.cyan,
  info: pc.cyan,
  accent: pc.magenta,
  success: pc.green,
  warn: pc.yellow,
  danger: pc.red,
  link: pc.blue,
  muted: pc.gray,
  text: pc.white,
  badgeA: (s) => pc.bgGreen(pc.black(s)),
  badgeB: (s) => pc.bgYellow(pc.black(s)),
  badgeC: (s) => pc.bgRed(pc.white(s))
};

const CINEX_TUI: TuiTheme = {
  header: CINEX_PALETTE.gold,
  title: CINEX_PALETTE.skyBlue,
  info: CINEX_PALETTE.skyBlue,
  accent: CINEX_PALETTE.pink,
  success: CINEX_PALETTE.mint,
  warn: CINEX_PALETTE.gold,
  danger: CINEX_PALETTE.coral,
  link: CINEX_PALETTE.skyBlue,
  muted: CINEX_PALETTE.muted,
  text: CINEX_PALETTE.white,
  selectedBg: CINEX_PALETTE.navy,
  selectedText: CINEX_PALETTE.gold,
  selectedSubText: CINEX_PALETTE.white,
  tabActiveBg: CINEX_PALETTE.skyBlue,
  tabActiveText: CINEX_PALETTE.navy,
  tabInactiveBg: "#0e0e52",
  tabInactiveText: CINEX_PALETTE.muted,
  footerBg: CINEX_PALETTE.navy,
  borderMain: CINEX_PALETTE.skyBlue,
  borderInner: CINEX_PALETTE.muted,
  borderAccent: CINEX_PALETTE.gold
};

const CINEX_CLI: CliTheme = {
  header: ansiBgFg(CINEX_PALETTE.navy, CINEX_PALETTE.white, (s) => pc.bgBlue(pc.white(s))),
  headerAccent: ansiBgFg(CINEX_PALETTE.burgundy, CINEX_PALETTE.white, (s) => pc.bgMagenta(pc.white(s))),
  headerInfo: ansiBgFg(CINEX_PALETTE.skyBlue, CINEX_PALETTE.navy, (s) => pc.bgCyan(pc.black(s))),
  headerDanger: ansiBgFg(CINEX_PALETTE.coral, CINEX_PALETTE.white, (s) => pc.bgRed(pc.white(s))),
  headerWarn: ansiBgFg(CINEX_PALETTE.gold, CINEX_PALETTE.navy, (s) => pc.bgYellow(pc.black(s))),
  title: ansiFg(CINEX_PALETTE.skyBlue, pc.cyan),
  info: ansiFg(CINEX_PALETTE.skyBlue, pc.cyan),
  accent: ansiFg(CINEX_PALETTE.pink, pc.magenta),
  success: ansiFg(CINEX_PALETTE.mint, pc.green),
  warn: ansiFg(CINEX_PALETTE.gold, pc.yellow),
  danger: ansiFg(CINEX_PALETTE.coral, pc.red),
  link: ansiFg(CINEX_PALETTE.skyBlue, pc.blue),
  muted: ansiFg(CINEX_PALETTE.muted, pc.gray),
  text: ansiFg(CINEX_PALETTE.white, pc.white),
  badgeA: ansiBgFg(CINEX_PALETTE.mint, CINEX_PALETTE.navy, (s) => pc.bgGreen(pc.black(s))),
  badgeB: ansiBgFg(CINEX_PALETTE.gold, CINEX_PALETTE.navy, (s) => pc.bgYellow(pc.black(s))),
  badgeC: ansiBgFg(CINEX_PALETTE.coral, CINEX_PALETTE.white, (s) => pc.bgRed(pc.white(s)))
};

const THEMES: Record<ThemeName, Theme> = {
  classic: { name: "classic", tui: CLASSIC_TUI, cli: CLASSIC_CLI },
  cinex: { name: "cinex", tui: CINEX_TUI, cli: CINEX_CLI }
};

function configFilePath(): string {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(base, "cinex-cli", "config.json");
}

function readThemeFromConfig(): ThemeName | undefined {
  try {
    const raw = fs.readFileSync(configFilePath(), "utf-8");
    const parsed = JSON.parse(raw) as { theme?: string };
    if (parsed && (parsed.theme === "cinex" || parsed.theme === "classic")) return parsed.theme;
  } catch (_) {}
  return undefined;
}

// Seleccion del tema: CINEX_THEME (env) > config.json (XDG) > cinex (default)
export function getTheme(): Theme {
  const env = process.env.CINEX_THEME;
  let name: ThemeName;
  if (env === "cinex" || env === "classic") name = env;
  else name = readThemeFromConfig() ?? "cinex";
  return THEMES[name];
}

// Ruta del archivo de configuracion para documentar/crear
export { configFilePath };
