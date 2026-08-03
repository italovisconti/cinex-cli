import fs from "fs";
import path from "path";
import os from "os";
import * as cheerio from "cheerio";
import type { Movie, Showtime, TheaterShowtimes, Cinema, City } from "./types";

const BASE_URL = "https://www.cinex.com.ve";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
const SEATS_TTL_MS = 5 * 60 * 1000; // 5 minutos (los asientos cambian mas seguido)
const CACHE_FILE_PATH = path.join(os.tmpdir(), "cinex_cli_cartelera_cache.json");

interface SeatEntry {
  cinemaid: string;
  sessionid: string;
  sala: string;
  fecha: string;
  hora: string;
  numasientos: number;
  texto: string;
  clase: string;
}

interface PersistentCache {
  timestamp: number;
  movies: Movie[];
  cities: City[];
}

let memoryMovies: Movie[] | null = null;
let memoryCities: City[] | null = null;
let memoryTimestamp: number = 0;

function readCacheFromDisk(): PersistentCache | null {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as PersistentCache;
      if (parsed && typeof parsed.timestamp === "number" && Array.isArray(parsed.movies)) {
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

function writeCacheToDisk(movies: Movie[], cities: City[]) {
  try {
    const data: PersistentCache = {
      timestamp: Date.now(),
      movies,
      cities
    };
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(data), "utf-8");
  } catch (_) {}
}

const seatsMemoryCache = new Map<string, { timestamp: number; data: SeatEntry[] }>();

// Cinex expone la disponibilidad de asientos por cine en syncseats/{CODIGO}.data
async function fetchCinemaSeats(cinemaCode: string): Promise<SeatEntry[]> {
  const cached = seatsMemoryCache.get(cinemaCode);
  if (cached && Date.now() - cached.timestamp < SEATS_TTL_MS) return cached.data;

  try {
    const res = await fetch(`${BASE_URL}/syncseats/${cinemaCode}.data`);
    const data = (await res.json()) as SeatEntry[];
    if (Array.isArray(data)) {
      seatsMemoryCache.set(cinemaCode, { timestamp: Date.now(), data });
      return data;
    }
  } catch (err) {
    console.error(`Error fetching available seats for cinema ${cinemaCode}:`, err);
  }

  return cached ? cached.data : [];
}

// Actualiza los asientos disponibles de todas las funciones de las peliculas dadas.
export async function refreshSeatsForMovies(movies: Movie[]): Promise<void> {
  const codes = new Set<string>();
  for (const m of movies) {
    for (const t of m.theaters) {
      if (t.cinemaCode) codes.add(t.cinemaCode);
    }
  }

  const seatsByCode = new Map<string, Map<string, number>>();
  await Promise.all([...codes].map(async (code) => {
    const entries = await fetchCinemaSeats(code);
    const bySession = new Map<string, number>();
    for (const e of entries) bySession.set(String(e.sessionid), e.numasientos);
    seatsByCode.set(code, bySession);
  }));

  for (const m of movies) {
    for (const t of m.theaters) {
      const bySession = t.cinemaCode ? seatsByCode.get(t.cinemaCode) : undefined;
      if (!bySession) continue;
      for (const st of t.showtimes) {
        if (st.isPassed || !st.sessionId) continue;
        const seats = bySession.get(st.sessionId);
        if (typeof seats === "number") st.seatsAvailable = seats;
      }
    }
  }
}

export function getCacheInfo(): { isCached: boolean; ageMinutes: number } {
  const disk = readCacheFromDisk();
  const ts = memoryTimestamp || (disk ? disk.timestamp : 0);
  if (!ts) return { isCached: false, ageMinutes: 0 };
  const ageMinutes = Math.floor((Date.now() - ts) / 60000);
  return { isCached: ageMinutes < 30, ageMinutes };
}

export function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function fetchCities(forceRefresh = false): Promise<City[]> {
  if (!forceRefresh && memoryCities) return memoryCities;

  if (!forceRefresh) {
    const disk = readCacheFromDisk();
    if (disk && (Date.now() - disk.timestamp < CACHE_TTL_MS)) {
      memoryCities = disk.cities;
      return memoryCities;
    }
  }

  try {
    const res = await fetch(`${BASE_URL}/assets/php/datasource.php?method=getcinemacitieslist`);
    const json = (await res.json()) as { result?: string; data?: { cinema_city: string }[] };
    if (json && json.data && Array.isArray(json.data)) {
      memoryCities = json.data.map((c: { cinema_city: string }) => ({ name: c.cinema_city.toUpperCase() }));
      return memoryCities;
    }
  } catch (err) {
    console.error("Error fetching cities:", err);
  }
  return [
    { name: "CARACAS" },
    { name: "GUATIRE" },
    { name: "MARGARITA" },
    { name: "BARQUISIMETO" },
    { name: "LA GUAIRA" },
    { name: "PARAGUANÁ" },
    { name: "MARACAIBO" },
    { name: "CUMANÁ" },
    { name: "LECHERÍAS" },
    { name: "BARINAS" },
    { name: "VALERA" },
    { name: "MÉRIDA" }
  ];
}

export async function fetchRawCartelera(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/assets/php/datasource.php?method=getcartelera`);
    const json = (await res.json()) as { result?: string; data?: any[] };
    if (json && json.data && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (err) {
    console.error("Error fetching cartelera:", err);
  }
  return [];
}

export async function getSinopsisLinksMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const indexHtml = await fetch(`${BASE_URL}/index.html`).then(r => r.text());
    const $ = cheerio.load(indexHtml);
    $("a[href*='sinopsis-']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const filename = href.split("/").pop() || "";
        const slug = filename.replace("sinopsis-", "").replace(".html", "").toLowerCase();
        map.set(slug, filename);
      }
    });
  } catch (err) {
    console.error("Error building sinopsis links map:", err);
  }
  return map;
}

export function createSlug(title: string): string {
  return normalizeStr(title).replace(/[^a-z0-9]/g, "");
}

export function determineCity(name: string, address: string): string {
  const normName = normalizeStr(name);
  const normAddr = normalizeStr(address);

  if (normAddr.includes("guatire") || normName.includes("buenaventura")) return "GUATIRE";
  if (normAddr.includes("margarita") || normName.includes("costazul")) return "MARGARITA";
  if (normAddr.includes("barquisimeto") || normName.includes("metropolis")) return "BARQUISIMETO";
  if (normAddr.includes("la guaira") || normName.includes("sotavento")) return "LA GUAIRA";
  if (normAddr.includes("paraguana") || normAddr.includes("pto. fijo") || normName.includes("virtudes")) return "PARAGUANÁ";
  if (normAddr.includes("maracaibo") || normAddr.includes("cabimas") || normName.includes("lago mall") || normName.includes("san francisco") || normName.includes("galerias mall") || normName.includes("costa mall")) return "MARACAIBO";
  if (normAddr.includes("cumana") || normName.includes("marina plaza")) return "CUMANÁ";
  if (normAddr.includes("lecherias") || normName.includes("plaza mayor")) return "LECHERÍAS";
  if (normAddr.includes("barinas") || normName.includes("cima plaza")) return "BARINAS";
  if (normAddr.includes("valera") || normAddr.includes("trujillo")) return "VALERA";
  if (normAddr.includes("merida") || normName.includes("alto prado")) return "MÉRIDA";

  return "CARACAS";
}

export async function fetchMovieDetail(sinopsisFilename: string, basicMovie: any): Promise<Movie> {
  const sinopsisUrl = `${BASE_URL}/${sinopsisFilename}`;
  let synopsis = "";
  let durationMinutes = parseInt(basicMovie.duracion) || 0;
  let genre = basicMovie.genero || "";
  let censorship = basicMovie.censura || "";
  let formats: string[] = [];
  let youtubeUrl = basicMovie.youtube || "";
  let posterUrl = basicMovie.poster ? `${BASE_URL}/assets/images/posters/${basicMovie.poster}` : "";
  const theaters: TheaterShowtimes[] = [];

  try {
    const html = await fetch(sinopsisUrl).then(r => r.text());
    const $ = cheerio.load(html);

    const subtextItems = $("ul.movie-subtext li")
      .map((_, el) => $(el).text().trim())
      .get();

    for (const item of subtextItems) {
      if (item.includes("minutos")) {
        const match = item.match(/(\d+)\s*minutos/i);
        if (match && match[1]) durationMinutes = parseInt(match[1]);
      } else if (item.includes("2D") || item.includes("3D") || item.includes("4DX") || item.includes("VIP") || item.includes("SUB") || item.includes("ESP") || item.includes("DIG")) {
        formats = item.split("/").map(s => s.trim()).filter(Boolean);
      } else if (!genre && item.length > 2) {
        genre = item;
      }
    }

    synopsis = $("p[style*='color: black']").text().trim();
    if (!synopsis) {
      synopsis = $(".movie-details p").text().trim() || $("p").first().text().trim();
    }

    if (!youtubeUrl) {
      const trailerHref = $("a[href*='youtube.com']").attr("href");
      if (trailerHref) youtubeUrl = trailerHref;
    }

    const processedTheaters = new Set<string>();

    for (const img of $("img.cinemapic").toArray()) {
      const name = ($(img).attr("title") || $(img).attr("alt") || "CINE").trim().toUpperCase();
      if (!name || processedTheaters.has(name)) continue;
      processedTheaters.add(name);

      const parentRow = $(img).closest(".row");
      const address = parentRow.find("p").text().replace(/\s+/g, " ").trim();
      const city = determineCity(name, address);

      const firstSessionEl = parentRow.find(".cinemasessionpos").first();
      const codeMatch = (firstSessionEl.attr("onclick") || "").match(/checkLogin\('\d+','([A-Z0-9]+)'\)/i);
      const cinemaCode = codeMatch ? codeMatch[1] : "";

      const showtimes: Showtime[] = [];

      parentRow.find(".cinemasessionpos").each((_, bEl) => {
        const btn = $(bEl).find("button");
        const isPassed = btn.hasClass("indicadorfuncionpasada");
        
        const langImg = btn.find("img.icoIdioma").attr("src") || "";
        const lang: "ESP" | "SUB" | "N/A" = langImg.includes("sub.png") ? "SUB" : (langImg.includes("es.png") ? "ESP" : "N/A");

        const htmlContent = btn.html() || "";
        const cleanText = htmlContent.replace(/<img[^>]*>/i, "").replace(/<div[\s\S]*$/i, "");
        const lines = cleanText.split(/<br\s*\/?>/i).map(s => cheerio.load(s).text().trim()).filter(Boolean);

        const room = lines[0] || "Sala";
        const time = lines[1] || lines[0] || "N/A";

        showtimes.push({
          room,
          time,
          lang,
          isPassed,
          status: isPassed ? "Proyectada" : "Disponible",
          sessionId: btn.attr("alt") || undefined
        });
      });

      theaters.push({
        cinemaName: name,
        address: address || "Venezuela",
        city,
        cinemaCode: cinemaCode || undefined,
        showtimes
      });
    }

  } catch (err) {
    console.error(`Error loading movie detail ${sinopsisFilename}:`, err);
  }

  return {
    id: String(basicMovie.id),
    hocode: basicMovie.hocode || "",
    title: basicMovie.nombre.trim(),
    slug: createSlug(basicMovie.nombre),
    sinopsisUrl,
    genre: genre || basicMovie.genero || "Cine",
    censorship: censorship || basicMovie.censura || "A",
    durationMinutes: durationMinutes || parseInt(basicMovie.duracion) || 120,
    releaseDate: basicMovie.fechaestreno,
    posterUrl,
    youtubeUrl,
    formats: formats.length > 0 ? formats : ["2D", "ESP"],
    synopsis: synopsis || `Disfruta de ${basicMovie.nombre} en Cinex.`,
    theaters
  };
}

export async function fetchAllMovies(forceRefresh = false): Promise<Movie[]> {
  const now = Date.now();

  let movies: Movie[];

  if (!forceRefresh && memoryMovies && (now - memoryTimestamp < CACHE_TTL_MS)) {
    movies = memoryMovies;
  } else if (!forceRefresh) {
    const disk = readCacheFromDisk();
    if (disk && (now - disk.timestamp < CACHE_TTL_MS)) {
      memoryMovies = disk.movies;
      memoryCities = disk.cities;
      memoryTimestamp = disk.timestamp;
      movies = memoryMovies;
    } else {
      movies = await fetchMoviesFromSite();
    }
  } else {
    movies = await fetchMoviesFromSite();
  }

  // Los asientos cambian mas seguido que la cartelera, se refrescan en cada llamada.
  await refreshSeatsForMovies(movies);

  if (movies === memoryMovies) return movies;

  const cities = await fetchCities(forceRefresh);
  memoryMovies = movies;
  memoryCities = cities;
  memoryTimestamp = Date.now();

  writeCacheToDisk(movies, cities);

  return movies;
}

async function fetchMoviesFromSite(): Promise<Movie[]> {
  const rawList = await fetchRawCartelera();
  const sinopsisMap = await getSinopsisLinksMap();

  const movies: Movie[] = [];

  for (const raw of rawList) {
    const slug = createSlug(raw.nombre);
    let sinopsisFile = sinopsisMap.get(slug);

    if (!sinopsisFile) {
      for (const [sKey, sFile] of sinopsisMap.entries()) {
        if (sKey.includes(slug) || slug.includes(sKey)) {
          sinopsisFile = sFile;
          break;
        }
      }
    }

    if (!sinopsisFile) {
      sinopsisFile = `sinopsis-${slug}.html`;
    }

    const movie = await fetchMovieDetail(sinopsisFile, raw);
    movies.push(movie);
  }

  return movies;
}

export function extractAllCinemas(movies: Movie[]): Cinema[] {
  const cinemaMap = new Map<string, Cinema>();

  for (const m of movies) {
    for (const t of m.theaters) {
      const key = t.cinemaName;
      if (!cinemaMap.has(key)) {
        cinemaMap.set(key, {
          name: t.cinemaName,
          address: t.address,
          city: t.city || "CARACAS",
          moviesCount: 1
        });
      } else {
        const existing = cinemaMap.get(key)!;
        existing.moviesCount = (existing.moviesCount || 1) + 1;
      }
    }
  }

  return Array.from(cinemaMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Generate clean sharing text for WhatsApp/Telegram/Discord
export function generateShareText(movie: Movie, cinemaName?: string): string {
  let text = `*CINEX VENEZUELA*\n\n`;
  text += `*${movie.title}*\n`;
  text += `Duracion: ${movie.durationMinutes} min | Censura: ${movie.censorship} | ${movie.genre}\n`;
  text += `Formatos: ${movie.formats.join(" / ")}\n\n`;

  const targetTheaters = cinemaName
    ? movie.theaters.filter(t => normalizeStr(t.cinemaName).includes(normalizeStr(cinemaName)))
    : movie.theaters.slice(0, 4);

  text += `Horarios disponibles:\n`;
  targetTheaters.forEach(t => {
    const activeShows = t.showtimes.filter(s => !s.isPassed).map(s => `${s.time} (${s.room} ${s.lang})`).join(", ");
    if (activeShows) {
      text += `• *${t.cinemaName}*: ${activeShows}\n`;
    }
  });

  if (movie.youtubeUrl) {
    text += `\nTrailer: ${movie.youtubeUrl}`;
  }

  return text;
}
