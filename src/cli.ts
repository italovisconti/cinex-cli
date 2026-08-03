import { Command } from "commander";
import pc from "picocolors";
import { fetchAllMovies, fetchCities, extractAllCinemas, normalizeStr, generateShareText } from "./api";
import { renderPosterInTerminal, openPosterInBrowser } from "./image";
import { playTrailerInTerminal } from "./video";
import { getGlyphs } from "./glyphs";
import { startCliSpinner } from "./spinner";
import { renderTUI } from "./tui";

export async function runCLI(args: string[]) {
  const program = new Command();
  const NF = getGlyphs();

  program
    .name("cinex")
    .description(pc.bold(pc.cyan(`${NF.film} CINEX CLI & TUI - Cartelera, peliculas, cines, horarios, sinopsis y posters`)))
    .version("1.1.0");

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
        console.log(pc.yellow("[!] No se encontraron peliculas con los filtros especificados."));
        return;
      }

      console.log(pc.cyan("\n[+] Cartelera actual de Cinex Venezuela:\n"));
      console.log(pc.bold(pc.white(`   ${"TITULO".padEnd(28)} ${"DURACION".padEnd(12)} ${"CENSURA".padEnd(10)} ${"GENERO".padEnd(15)} FORMATOS`)));
      console.log(pc.gray("─".repeat(85)));

      movies.forEach((m) => {
        const dur = `${m.durationMinutes} min`;
        const censBg = m.censorship === "A" ? pc.bgGreen(pc.black(` ${m.censorship} `)) : (m.censorship === "B" ? pc.bgYellow(pc.black(` ${m.censorship} `)) : pc.bgRed(pc.white(` ${m.censorship} `)));
        const titleStr = pc.bold(pc.cyan(m.title.slice(0, 27).padEnd(28)));
        const formatsStr = pc.dim(m.formats.slice(0, 4).join(", "));
        console.log(`   ${titleStr} ${dur.padEnd(12)} ${censBg.padEnd(10)} ${m.genre.padEnd(15)} ${formatsStr}`);
      });

      console.log(pc.gray("\nTip: ") + pc.green("cinex show <titulo>") + pc.gray(" para ver sinopsis, poster y horarios."));
      console.log(pc.gray("     ") + pc.green("cinex trailer <titulo>") + pc.gray(" para reproducir el trailer en la terminal."));
      console.log(pc.gray("     ") + pc.green("cinex tui") + pc.gray(" para la interfaz grafica interactiva.\n"));
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
        console.log(pc.red(`[X] No se encontro ninguna pelicula que coincida con "${query}".`));
        console.log(pc.gray("Peliculas disponibles: " + movies.map(m => m.title).join(", ")));
        return;
      }

      if (options.open && movie.posterUrl) {
        openPosterInBrowser(movie.posterUrl);
      }

      console.log(pc.bold(pc.bgBlue(pc.white(`  ${NF.film} ${movie.title}  `))));
      console.log(pc.bold(`Duracion: `) + pc.yellow(`${NF.clock} ${movie.durationMinutes} minutos`) + pc.bold(` | Censura: `) + pc.green(movie.censorship) + pc.bold(` | Genero: `) + pc.magenta(movie.genre));
      console.log(pc.bold(`Formatos: `) + pc.cyan(movie.formats.join(" / ")));
      if (movie.youtubeUrl) {
        console.log(pc.bold(`Trailer YouTube: `) + pc.blue(pc.underline(`${NF.play} ${movie.youtubeUrl}`)));
      }

      if (options.poster !== false && movie.posterUrl) {
        console.log(pc.gray(`\n${NF.image} POSTER DE LA PELICULA:`));
        const art = await renderPosterInTerminal(movie.posterUrl, 42);
        console.log(art);
      }

      console.log(pc.gray("\n" + "─".repeat(80)));
      console.log(pc.bold("[SINOPSIS]"));
      console.log(pc.white(movie.synopsis));
      console.log(pc.gray("─".repeat(80)));

      console.log(pc.bold(`\n${NF.ticket} HORARIOS Y SALAS (${movie.theaters.length} Cines):`));

      movie.theaters.forEach((t) => {
        console.log(`\n  ${NF.arrow} ${pc.bold(pc.yellow(`${NF.theater} ${t.cinemaName}`))} ${pc.gray(`(${t.city || "Venezuela"})`)}`);
        console.log(`    ${pc.dim(t.address)}`);
        
        if (t.showtimes.length === 0) {
          console.log(`    ${pc.gray("Sin funciones registradas hoy.")}`);
        } else {
          const formatted = t.showtimes.map(s => {
            const timeStr = s.isPassed ? pc.gray(`${s.time} (${s.room}) [Proyectada]`) : pc.green(pc.bold(`${s.time}`)) + pc.dim(` (${s.room} ${s.lang})`);
            return timeStr;
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
        console.log(pc.red(`[X] No se encontro trailer para "${pelicula}".`));
        return;
      }

      if (options.open) {
        console.log(pc.green(`[+] Abriendo trailer oficial en YouTube: ${movie.youtubeUrl}`));
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

      console.log(pc.bold(pc.bgRed(pc.white(`  ⚡ CINE 4DX - SALAS DE IMPACTO Y MOVIMIENTO  `))));
      console.log("");

      movies.forEach(m => {
        const matchingTheaters = m.theaters.filter(t => t.showtimes.some(s => s.room.toUpperCase().includes("4DX")));
        if (matchingTheaters.length > 0) {
          console.log(`🎬 ${pc.bold(pc.yellow(m.title))} ${pc.dim(`(${m.durationMinutes} min)`)}`);
          matchingTheaters.forEach(t => {
            const shows = t.showtimes.filter(s => s.room.toUpperCase().includes("4DX")).map(s => `${s.time} [${s.status}]`).join(", ");
            console.log(`   ▸ ${pc.cyan(t.cinemaName)} (${t.city}): ${shows}`);
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

      console.log(pc.bold(pc.bgYellow(pc.black(`  ✨ CINEX VIP - SALAS EXCLUSIVAS  `))));
      console.log("");

      movies.forEach(m => {
        const matchingTheaters = m.theaters.filter(t => t.showtimes.some(s => s.room.toUpperCase().includes("VIP")));
        if (matchingTheaters.length > 0) {
          console.log(`🎬 ${pc.bold(pc.yellow(m.title))} ${pc.dim(`(${m.durationMinutes} min)`)}`);
          matchingTheaters.forEach(t => {
            const shows = t.showtimes.filter(s => s.room.toUpperCase().includes("VIP")).map(s => `${s.time} [${s.status}]`).join(", ");
            console.log(`   ▸ ${pc.cyan(t.cinemaName)} (${t.city}): ${shows}`);
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
        console.log(pc.red(`[X] No se encontro ninguna pelicula que coincida con "${pelicula}".`));
        return;
      }

      console.log(pc.cyan("\n[+] Resumen generado para compartir (copia y pega en WhatsApp):\n"));
      console.log(pc.gray("─".repeat(60)));
      const shareText = generateShareText(movie, cine);
      console.log(pc.white(shareText));
      console.log(pc.gray("─".repeat(60)));
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
        console.log(pc.red(`[X] No se encontro ninguna pelicula que coincida con "${query}".`));
        return;
      }

      if (options.open && movie.posterUrl) {
        openPosterInBrowser(movie.posterUrl);
        console.log(pc.green(`${NF.plus} Abriendo poster en el navegador: ${movie.posterUrl}`));
      }

      console.log(pc.bold(pc.bgMagenta(pc.white(`  ${NF.image} ${movie.title} - Poster Oficial  `))));
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

      console.log(pc.cyan("\n[+] Cines Cinex disponibles:\n"));
      byCity.forEach((list, city) => {
        console.log(pc.bold(pc.bgMagenta(pc.white(`  ${NF.city} ${city} (${list.length} Cines)  `))));
        list.forEach(cin => {
          console.log(`   • ${pc.bold(pc.cyan(cin.name.padEnd(25)))} - ${pc.dim(cin.address)}`);
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
        console.log(pc.red(`[X] No se encontro ningun cine con el nombre "${nombre}".`));
        return;
      }

      console.log(pc.bold(pc.bgCyan(pc.black(`  ${NF.theater} CINEX ${targetCinemaName}  `))));
      if (matches[0] && matches[0].theater) {
        console.log(pc.dim(`Direccion: ${matches[0].theater.address}\n`));
      }
      console.log(pc.bold("Peliculas y Horarios disponibles:"));
      console.log(pc.gray("─".repeat(70)));

      matches.forEach(({ movie, theater }) => {
        console.log(`\n${NF.arrow} ${pc.bold(pc.yellow(`${NF.film} ${movie.title}`))} ${pc.dim(`(${movie.durationMinutes} min | Censura ${movie.censorship})`)}`);
        if (theater.showtimes.length === 0) {
          console.log(`   ${pc.gray("Sin funciones para hoy")}`);
        } else {
          const list = theater.showtimes.map(s => {
            return s.isPassed ? pc.gray(`${s.time} (${s.room})`) : pc.green(pc.bold(`${s.time}`)) + pc.dim(` (${s.room} ${s.lang})`);
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

      console.log(pc.cyan(`\n${NF.city} Ciudades disponibles:\n`));
      cities.forEach(c => console.log(`   • ${pc.bold(pc.white(c.name))}`));
      console.log("");
    });

  await program.parseAsync(args);
}
