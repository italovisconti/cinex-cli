import { Command } from "commander";
import pc from "picocolors";
import { fetchAllMovies, fetchCities, extractAllCinemas, normalizeStr, generateShareText } from "./api";
import { renderPosterInTerminal, openPosterInBrowser } from "./image";
import { playTrailerInTerminal } from "./video";
import { getGlyphs } from "./glyphs";
import { startCliSpinner } from "./spinner";
import { renderTUI } from "./tui";
import { getTheme } from "./theme";
import type { Showtime } from "./types";

function seatsInfo(s: Showtime, T: ReturnType<typeof getTheme>["cli"]): string {
  if (s.seatsAvailable === undefined) return "";
  if (s.seatsAvailable <= 0) return T.danger("[AGOTADA]");
  if (s.seatsAvailable <= 10) return T.warn(`[${s.seatsAvailable} asientos]`);
  return T.success(`[${s.seatsAvailable} asientos]`);
}

export async function runCLI(args: string[]) {
  const program = new Command();
  const NF = getGlyphs();
  const T = getTheme().cli;

  program
    .name("cinex")
    .description(pc.bold(T.title(`${NF.film} CINEX CLI & TUI - Cartelera, peliculas, cines, horarios, sinopsis y posters`)))
    .version("1.1.1");

  program
    .command("tui", { isDefault: args.length <= 2 })
    .description("Abrir la interfaz grafica de terminal (TUI) interactiva")
    .action(async () => {
      await renderTUI();
    });

  program
    .command("cartelera")
    .alias("movies")
    .description("Listar todas las peliculas actualmente en cartelera")
    .option("-c, --city <ciudad>", "Filtrar por ciudad (ej. Caracas, Maracaibo, Lecherias)")
    .option("-g, --genre <genero>", "Filtrar por genero (ej. Accion, Terror, Animacion)")
    .action(async (options) => {
      const spinner = startCliSpinner("Obteniendo cartelera de Cinex Venezuela...");
      let movies = await fetchAllMovies();
      spinner.stop();

      if (options.genre) {
        const g = normalizeStr(options.genre);
        movies = movies.filter(m => normalizeStr(m.genre).includes(g));
      }

      if (options.city) {
        const c = normalizeStr(options.city);
        movies = movies.filter(m => m.theaters.some(t => normalizeStr(t.city || "").includes(c)));
      }

      if (movies.length === 0) {
        console.log(T.warn("[!] No se encontraron peliculas con los filtros especificados."));
        return;
      }

      console.log(T.title("\n[+] Cartelera actual de Cinex Venezuela:\n"));
      console.log(pc.bold(T.text(`   ${"TITULO".padEnd(28)} ${"DURACION".padEnd(12)} ${"CENSURA".padEnd(10)} ${"GENERO".padEnd(15)} FORMATOS`)));
      console.log(T.muted("─".repeat(85)));

      movies.forEach((m) => {
        const dur = `${m.durationMinutes} min`;
        const censBg = m.censorship === "A" ? T.badgeA(` ${m.censorship} `) : (m.censorship === "B" ? T.badgeB(` ${m.censorship} `) : T.badgeC(` ${m.censorship} `));
        const titleStr = pc.bold(T.title(m.title.slice(0, 27).padEnd(28)));
        const formatsStr = pc.dim(m.formats.slice(0, 4).join(", "));
        console.log(`   ${titleStr} ${dur.padEnd(12)} ${censBg.padEnd(10)} ${m.genre.padEnd(15)} ${formatsStr}`);
      });

      console.log(T.muted("\nTip: ") + T.success("cinex show <titulo>") + T.muted(" para ver sinopsis, poster y horarios."));
      console.log(T.muted("     ") + T.success("cinex trailer <titulo>") + T.muted(" para reproducir el trailer en la terminal."));
      console.log(T.muted("     ") + T.success("cinex tui") + T.muted(" para la interfaz grafica interactiva.\n"));
    });

  program
    .command("show <query>")
    .alias("detalles")
    .description("Ver sinopsis completa, poster, trailer y horarios de una pelicula")
    .option("--no-poster", "Desactivar la visualizacion del poster en la terminal")
    .option("-o, --open", "Abrir el poster en el navegador web")
    .action(async (query, options) => {
      const spinner = startCliSpinner(`Buscando detalles para "${query}"...`);
      const movies = await fetchAllMovies();
      const q = normalizeStr(query);
      const movie = movies.find(m => normalizeStr(m.title).includes(q) || m.id === query || m.slug.includes(q));
      spinner.stop();

      if (!movie) {
        console.log(T.danger(`[X] No se encontro ninguna pelicula que coincida con "${query}".`));
        console.log(T.muted("Peliculas disponibles: " + movies.map(m => m.title).join(", ")));
        return;
      }

      if (options.open && movie.posterUrl) {
        openPosterInBrowser(movie.posterUrl);
      }

      console.log(pc.bold(T.header(`  ${NF.film} ${movie.title}  `)));
      console.log(pc.bold(`Duracion: `) + T.warn(`${NF.clock} ${movie.durationMinutes} minutos`) + pc.bold(` | Censura: `) + T.success(movie.censorship) + pc.bold(` | Genero: `) + T.accent(movie.genre));
      console.log(pc.bold(`Formatos: `) + T.info(movie.formats.join(" / ")));
      if (movie.youtubeUrl) {
        console.log(pc.bold(`Trailer YouTube: `) + T.link(pc.underline(`${NF.play} ${movie.youtubeUrl}`)));
      }

      if (options.poster !== false && movie.posterUrl) {
        console.log(T.muted(`\n${NF.image} POSTER DE LA PELICULA:`));
        const art = await renderPosterInTerminal(movie.posterUrl, 42);
        console.log(art);
      }

      console.log(T.muted("\n" + "─".repeat(80)));
      console.log(pc.bold("[SINOPSIS]"));
      console.log(T.text(movie.synopsis));
      console.log(T.muted("─".repeat(80)));

      console.log(pc.bold(`\n${NF.ticket} HORARIOS Y SALAS (${movie.theaters.length} Cines):`));

      movie.theaters.forEach((t) => {
        console.log(`\n  ${NF.arrow} ${pc.bold(T.warn(`${NF.theater} ${t.cinemaName}`))} ${T.muted(`(${t.city || "Venezuela"})`)}`);
        console.log(`    ${pc.dim(t.address)}`);
        
        if (t.showtimes.length === 0) {
          console.log(`    ${T.muted("Sin funciones registradas hoy.")}`);
        } else {
          const formatted = t.showtimes.map(s => {
            const seats = s.isPassed ? "" : seatsInfo(s, T);
            const timeStr = s.isPassed ? T.muted(`${s.time} (${s.room}) [Proyectada]`) : T.success(pc.bold(`${s.time}`)) + pc.dim(` (${s.room} ${s.lang})`);
            return `${timeStr} ${seats}`.trimEnd();
          }).join("  •  ");
          console.log(`    ${formatted}`);
        }
      });
      console.log("\n");
    });

  program
    .command("trailer <pelicula>")
    .alias("video")
    .description("Reproducir el trailer completo de la pelicula en la terminal (requiere yt-dlp)")
    .option("-o, --open", "Abrir enlace de YouTube directamente en el navegador web")
    .option("-k, --keep", "Conservar el archivo de video descargado en /tmp sin preguntar")
    .action(async (pelicula, options) => {
      const spinner = startCliSpinner(`Buscando trailer para "${pelicula}"...`);
      const movies = await fetchAllMovies();
      const q = normalizeStr(pelicula);
      const movie = movies.find(m => normalizeStr(m.title).includes(q));
      spinner.stop();

      if (!movie || !movie.youtubeUrl) {
        console.log(T.danger(`[X] No se encontro trailer para "${pelicula}".`));
        return;
      }

      if (options.open) {
        console.log(T.success(`[+] Abriendo trailer oficial en YouTube: ${movie.youtubeUrl}`));
        openPosterInBrowser(movie.youtubeUrl);
        return;
      }

      await playTrailerInTerminal(movie.title, movie.youtubeUrl, { keep: options.keep });
    });

  program
    .command("4dx")
    .description("Listar unicamente funciones y peliculas disponibles en salas 4DX")
    .action(async () => {
      const spinner = startCliSpinner("Buscando funciones en salas 4DX...");
      const movies = await fetchAllMovies();
      spinner.stop();

      console.log(pc.bold(T.headerDanger(`  ${NF.bolt} CINE 4DX - SALAS DE IMPACTO Y MOVIMIENTO  `)));
      console.log("");

      movies.forEach(m => {
        const matchingTheaters = m.theaters.filter(t => t.showtimes.some(s => s.room.toUpperCase().includes("4DX")));
        if (matchingTheaters.length > 0) {
          console.log(`${NF.film} ${pc.bold(T.warn(m.title))} ${pc.dim(`(${m.durationMinutes} min)`)}`);
          matchingTheaters.forEach(t => {
            const shows = t.showtimes.filter(s => s.room.toUpperCase().includes("4DX")).map(s => `${s.time} [${s.status}]`).join(", ");
            console.log(`   ▸ ${T.info(t.cinemaName)} (${t.city}): ${shows}`);
          });
          console.log("");
        }
      });
    });

  program
    .command("vip")
    .description("Listar unicamente funciones y peliculas disponibles en salas VIP")
    .action(async () => {
      const spinner = startCliSpinner("Buscando funciones en salas VIP...");
      const movies = await fetchAllMovies();
      spinner.stop();

      console.log(pc.bold(T.headerWarn(`  ${NF.sparkle} CINEX VIP - SALAS EXCLUSIVAS  `)));
      console.log("");

      movies.forEach(m => {
        const matchingTheaters = m.theaters.filter(t => t.showtimes.some(s => s.room.toUpperCase().includes("VIP")));
        if (matchingTheaters.length > 0) {
          console.log(`${NF.film} ${pc.bold(T.warn(m.title))} ${pc.dim(`(${m.durationMinutes} min)`)}`);
          matchingTheaters.forEach(t => {
            const shows = t.showtimes.filter(s => s.room.toUpperCase().includes("VIP")).map(s => `${s.time} [${s.status}]`).join(", ");
            console.log(`   ▸ ${T.info(t.cinemaName)} (${t.city}): ${shows}`);
          });
          console.log("");
        }
      });
    });

  program
    .command("compartir <pelicula> [cine]")
    .alias("share")
    .description("Generar un resumen en texto listo para copiar y enviar por WhatsApp/Discord")
    .action(async (pelicula, cine) => {
      const spinner = startCliSpinner(`Generando resumen para compartir "${pelicula}"...`);
      const movies = await fetchAllMovies();
      const q = normalizeStr(pelicula);
      const movie = movies.find(m => normalizeStr(m.title).includes(q) || m.id === pelicula);
      spinner.stop();

      if (!movie) {
        console.log(T.danger(`[X] No se encontro ninguna pelicula que coincida con "${pelicula}".`));
        return;
      }

      console.log(T.title("\n[+] Resumen generado para compartir (copia y pega en WhatsApp):\n"));
      console.log(T.muted("─".repeat(60)));
      const shareText = generateShareText(movie, cine);
      console.log(T.text(shareText));
      console.log(T.muted("─".repeat(60)));
      console.log("");
    });

  program
    .command("poster <query>")
    .alias("imagen")
    .description("Mostrar el poster/imagen de una pelicula directamente en la terminal")
    .option("-o, --open", "Abrir la imagen en el navegador web")
    .option("-w, --width <ancho>", "Ancho en caracteres para el renderizado", "45")
    .action(async (query, options) => {
      const spinner = startCliSpinner(`Cargando poster para "${query}"...`);
      const movies = await fetchAllMovies();
      const q = normalizeStr(query);
      const movie = movies.find(m => normalizeStr(m.title).includes(q) || m.id === query || m.slug.includes(q));
      spinner.stop();

      if (!movie) {
        console.log(T.danger(`[X] No se encontro ninguna pelicula que coincida con "${query}".`));
        return;
      }

      if (options.open && movie.posterUrl) {
        openPosterInBrowser(movie.posterUrl);
        console.log(T.success(`${NF.plus} Abriendo poster en el navegador: ${movie.posterUrl}`));
      }

      console.log(pc.bold(T.headerAccent(`  ${NF.image} ${movie.title} - Poster Oficial  `)));
      console.log(pc.dim(`URL: ${movie.posterUrl}\n`));

      const widthNum = parseInt(options.width) || 45;
      const art = await renderPosterInTerminal(movie.posterUrl, widthNum);
      console.log(art);
      console.log("");
    });

  program
    .command("cines")
    .alias("theaters")
    .description("Listar todos los cines Cinex por ciudad")
    .option("-c, --city <ciudad>", "Filtrar por ciudad (ej. Caracas, Maracaibo)")
    .action(async (options) => {
      const spinner = startCliSpinner("Obteniendo cines Cinex en Venezuela...");
      const movies = await fetchAllMovies();
      spinner.stop();

      let cinemas = extractAllCinemas(movies);

      if (options.city) {
        const c = normalizeStr(options.city);
        cinemas = cinemas.filter(cin => normalizeStr(cin.city).includes(c));
      }

      const byCity = new Map<string, typeof cinemas>();
      cinemas.forEach(c => {
        const list = byCity.get(c.city) || [];
        list.push(c);
        byCity.set(c.city, list);
      });

      console.log(T.title("\n[+] Cines Cinex disponibles:\n"));
      byCity.forEach((list, city) => {
        console.log(pc.bold(T.headerAccent(`  ${NF.city} ${city} (${list.length} Cines)  `)));
        list.forEach(cin => {
          console.log(`   • ${pc.bold(T.info(cin.name.padEnd(25)))} - ${pc.dim(cin.address)}`);
        });
        console.log("");
      });
    });

  program
    .command("cine <nombre>")
    .description("Ver cartelera y funciones de un cine en especifico")
    .action(async (nombre) => {
      const spinner = startCliSpinner(`Buscando funciones en el cine "${nombre}"...`);
      const movies = await fetchAllMovies();
      spinner.stop();

      const q = normalizeStr(nombre);

      let targetCinemaName = "";
      const matches: { movie: typeof movies[0]; theater: typeof movies[0]["theaters"][0] }[] = [];

      movies.forEach(m => {
        m.theaters.forEach(t => {
          if (normalizeStr(t.cinemaName).includes(q)) {
            targetCinemaName = t.cinemaName;
            matches.push({ movie: m, theater: t });
          }
        });
      });

      if (matches.length === 0) {
        console.log(T.danger(`[X] No se encontro ningun cine con el nombre "${nombre}".`));
        return;
      }

      console.log(pc.bold(T.headerInfo(`  ${NF.theater} CINEX ${targetCinemaName}  `)));
      if (matches[0] && matches[0].theater) {
        console.log(pc.dim(`Direccion: ${matches[0].theater.address}\n`));
      }
      console.log(pc.bold("Peliculas y Horarios disponibles:"));
      console.log(T.muted("─".repeat(70)));

      matches.forEach(({ movie, theater }) => {
        console.log(`\n${NF.arrow} ${pc.bold(T.warn(`${NF.film} ${movie.title}`))} ${pc.dim(`(${movie.durationMinutes} min | Censura ${movie.censorship})`)}`);
        if (theater.showtimes.length === 0) {
          console.log(`   ${T.muted("Sin funciones para hoy")}`);
        } else {
          const list = theater.showtimes.map(s => {
            const seats = s.isPassed ? "" : seatsInfo(s, T);
            const base = s.isPassed ? T.muted(`${s.time} (${s.room})`) : T.success(pc.bold(`${s.time}`)) + pc.dim(` (${s.room} ${s.lang})`);
            return `${base} ${seats}`.trimEnd();
          }).join("  •  ");
          console.log(`   ${list}`);
        }
      });
      console.log("\n");
    });

  program
    .command("ciudades")
    .alias("cities")
    .description("Listar ciudades con presencia de Cinex")
    .action(async () => {
      const spinner = startCliSpinner("Obteniendo lista de ciudades...");
      const cities = await fetchCities();
      spinner.stop();

      console.log(T.title(`\n${NF.city} Ciudades disponibles:\n`));
      cities.forEach(c => console.log(`   • ${pc.bold(T.text(c.name))}`));
      console.log("");
    });

  await program.parseAsync(args);
}
