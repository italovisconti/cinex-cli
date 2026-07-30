export interface Glyphs {
  film: string;
  theater: string;
  city: string;
  clock: string;
  ticket: string;
  play: string;
  image: string;
  search: string;
  arrow: string;
  plus: string;
  check: string;
  star: string;
}

const NERD_GLYPHS: Glyphs = {
  film: "󰿎",
  theater: "󰨄",
  city: "󰈤",
  clock: "󰥔",
  ticket: "󰓓",
  play: "󰐊",
  image: "󰋩",
  search: "󰍉",
  arrow: "󰅂",
  plus: "󰐕",
  check: "󰄬",
  star: "󰓎"
};

const STANDARD_GLYPHS: Glyphs = {
  film: "[PELICULA]",
  theater: "[CINE]",
  city: "[CIUDAD]",
  clock: "[DURACION]",
  ticket: "[HORARIOS]",
  play: "[TRAILER]",
  image: "[POSTER]",
  search: "[BUSCAR]",
  arrow: "›",
  plus: "[+]",
  check: "✓",
  star: "*"
};

export function getGlyphs(): Glyphs {
  // Auto-detect if user terminal supports Nerd Fonts
  // Or fallback if explicitly disabled via NERD_FONTS=0 or NO_NERD_FONTS=1
  const env = process.env;
  if (env.NO_NERD_FONTS === "1" || env.NERD_FONTS === "0" || env.NERD_FONTS === "false") {
    return STANDARD_GLYPHS;
  }

  // Detect common terminals with built-in Nerd Fonts or font patches
  const termProgram = env.TERM_PROGRAM || "";
  const isNerdSupported =
    env.NERD_FONTS === "1" ||
    env.NERD_FONTS === "true" ||
    termProgram.includes("iTerm") ||
    termProgram.includes("WezTerm") ||
    termProgram.includes("kitty") ||
    termProgram.includes("Alacritty") ||
    termProgram.includes("vscode") ||
    env.TERMINAL_EMULATOR?.includes("JetBrains") ||
    Boolean(env.COLORTERM);

  return isNerdSupported ? NERD_GLYPHS : STANDARD_GLYPHS;
}
