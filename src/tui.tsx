import React, { useState, useEffect } from "react";
import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import { fetchAllMovies, extractAllCinemas, fetchCities } from "./api";
import { renderPosterInTerminal } from "./image";
import { getGlyphs } from "./glyphs";
import { getSpinnerFrames } from "./spinner";
import type { Movie, Cinema, City, Showtime, TheaterShowtimes } from "./types";

function CinexApp() {
  const renderer = useRenderer();
  const dims = useTerminalDimensions();
  const columns = dims.width || 80;
  const rows = dims.height || 24;
  const NF = getGlyphs();
  const spinnerFrames = getSpinnerFrames();

  const [loading, setLoading] = useState(true);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [activeTab, setActiveTab] = useState<"movies" | "cinemas" | "cities">("movies");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [detailModalMovie, setDetailModalMovie] = useState<Movie | null>(null);
  const [showPosterView, setShowPosterView] = useState(false);
  const [posterArt, setPosterArt] = useState<string>("");
  const [loadingPoster, setLoadingPoster] = useState(false);

  const [spinnerIdx, setSpinnerIdx] = useState(0);

  // Animated loader timer
  useEffect(() => {
    if (!loading && !loadingPoster) return;
    const timer = setInterval(() => {
      setSpinnerIdx((prev) => (prev + 1) % spinnerFrames.length);
    }, 80);
    return () => clearInterval(timer);
  }, [loading, loadingPoster, spinnerFrames.length]);

  const loadData = async (force = false) => {
    setLoading(true);
    try {
      const fetchedMovies = await fetchAllMovies(force);
      const fetchedCities = await fetchCities();
      const extractedCinemas = extractAllCinemas(fetchedMovies);

      setMovies(fetchedMovies);
      setCities([{ name: "TODAS" }, ...fetchedCities]);
      setCinemas(extractedCinemas);
    } catch (err) {
      console.error("Error in TUI data load:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMovies = movies.filter((m: Movie) => {
    const matchesSearch = !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.genre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === "TODAS" || m.theaters.some((t: TheaterShowtimes) => t.city?.toUpperCase() === selectedCity.toUpperCase());
    return matchesSearch && matchesCity;
  });

  const filteredCinemas = cinemas.filter((c: Cinema) => {
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === "TODAS" || c.city.toUpperCase() === selectedCity.toUpperCase();
    return matchesSearch && matchesCity;
  });

  const currentListLength = activeTab === "movies" ? filteredMovies.length : activeTab === "cinemas" ? filteredCinemas.length : cities.length;
  const currentMovie = activeTab === "movies" ? filteredMovies[selectedIndex] : null;

  const openTerminalPoster = async (movie: Movie) => {
    if (!movie || !movie.posterUrl) return;
    setShowPosterView(true);
    setLoadingPoster(true);
    try {
      const targetWidth = Math.max(30, Math.min(columns - 10, 50));
      const art = await renderPosterInTerminal(movie.posterUrl, targetWidth);
      setPosterArt(art);
    } catch (e) {
      setPosterArt("[Error al renderizar el poster]");
    } finally {
      setLoadingPoster(false);
    }
  };

  useKeyboard((event: { name: string }) => {
    if (event.name === "q" && !isSearching && !detailModalMovie && !showPosterView) {
      renderer.destroy();
      process.exit(0);
      return;
    }

    if (event.name === "r" && !isSearching) {
      loadData(true);
      return;
    }

    if (event.name === "p") {
      if (showPosterView) {
        setShowPosterView(false);
        return;
      }
      const targetMovie = detailModalMovie || currentMovie;
      if (targetMovie) {
        openTerminalPoster(targetMovie);
      }
      return;
    }

    if (event.name === "escape") {
      if (showPosterView) {
        setShowPosterView(false);
        return;
      }
      if (detailModalMovie) {
        setDetailModalMovie(null);
        return;
      }
      if (isSearching) {
        setIsSearching(false);
        setSearchQuery("");
        return;
      }
    }

    if (event.name === "tab") {
      if (activeTab === "movies") setActiveTab("cinemas");
      else if (activeTab === "cinemas") setActiveTab("cities");
      else setActiveTab("movies");
      setSelectedIndex(0);
      return;
    }

    if (event.name === "1") { setActiveTab("movies"); setSelectedIndex(0); return; }
    if (event.name === "2") { setActiveTab("cinemas"); setSelectedIndex(0); return; }
    if (event.name === "3") { setActiveTab("cities"); setSelectedIndex(0); return; }
    if (event.name === "/") { setIsSearching(true); return; }

    if (event.name === "up" || event.name === "k") {
      setSelectedIndex((prev: number) => Math.max(0, prev - 1));
      return;
    }

    if (event.name === "down" || event.name === "j") {
      setSelectedIndex((prev: number) => Math.min(currentListLength - 1, prev + 1));
      return;
    }

    if (event.name === "return" || event.name === "enter") {
      if (activeTab === "movies" && filteredMovies[selectedIndex]) {
        setDetailModalMovie(filteredMovies[selectedIndex]);
      } else if (activeTab === "cities" && cities[selectedIndex]) {
        setSelectedCity(cities[selectedIndex].name);
        setActiveTab("movies");
        setSelectedIndex(0);
      }
    }
  });

  // Render Full Terminal Poster View Modal inside TUI!
  if (showPosterView && (detailModalMovie || currentMovie)) {
    const movie = detailModalMovie || currentMovie!;
    const currentSpinnerFrame = spinnerFrames[spinnerIdx];
    return (
      <box width={columns} height={rows} flexDirection="column" padding={1} border style={{ borderColor: "magenta" }}>
        <box border padding={1} marginBottom={1} style={{ borderColor: "yellow" }}>
          <text fg="yellow">
            <strong>{NF.image} POSTER DE LA PELICULA: {movie.title.toUpperCase()}</strong>
          </text>
        </box>

        <box flexGrow={1} justifyContent="center" alignItems="center" flexDirection="column">
          {loadingPoster ? (
            <text fg="cyan"><strong>{currentSpinnerFrame} Renderizando poster en la terminal...</strong></text>
          ) : (
            <scrollbox height={rows - 8}>
              <text fg="white">{posterArt}</text>
            </scrollbox>
          )}
        </box>

        <box marginTop={1} style={{ backgroundColor: "blue" }} padding={1}>
          <text fg="white"><strong> Presiona [Esc], [p] o [q] para regresar a los detalles</strong></text>
        </box>
      </box>
    );
  }

  // Render Full Screen Movie Detail Modal
  if (detailModalMovie) {
    return (
      <box width={columns} height={rows} flexDirection="column" padding={1} border style={{ borderColor: "cyan" }}>
        <box border padding={1} marginBottom={1} style={{ borderColor: "yellow" }}>
          <text fg="yellow">
            <strong>{NF.film} {detailModalMovie.title.toUpperCase()}</strong>
          </text>
          <text fg="gray"> | {NF.clock} {detailModalMovie.durationMinutes} min | Censura: {detailModalMovie.censorship} | Genero: {detailModalMovie.genre}</text>
        </box>

        <box flexDirection="row" flexGrow={1}>
          <box width="45%" flexDirection="column" paddingRight={1} border style={{ borderColor: "gray" }}>
            <text fg="cyan"><strong>[SINOPSIS]</strong></text>
            <scrollbox height={8} marginBottom={1}>
              <text fg="white">{detailModalMovie.synopsis}</text>
            </scrollbox>

            <text fg="cyan"><strong>[FORMATOS]</strong></text>
            <text fg="magenta">{detailModalMovie.formats.join("  •  ")}</text>

            <box marginTop={1} flexDirection="column">
              <text fg="yellow"><strong>{NF.image} Presiona [p] para ver el poster en la terminal!</strong></text>
              {detailModalMovie.youtubeUrl && (
                <text fg="blue">{NF.play} Trailer YouTube: {detailModalMovie.youtubeUrl}</text>
              )}
            </box>
          </box>

          <box width="55%" flexDirection="column" paddingLeft={1} border style={{ borderColor: "gray" }}>
            <text fg="green"><strong>{NF.ticket} CINES Y HORARIOS ({detailModalMovie.theaters.length} salas):</strong></text>
            <scrollbox height={rows - 10}>
              {detailModalMovie.theaters.map((t: TheaterShowtimes, idx: number) => (
                <box key={idx} flexDirection="column" marginBottom={1}>
                  <text fg="yellow"><strong>{NF.theater} {t.cinemaName} ({t.city || "VE"})</strong></text>
                  <text fg="gray">{t.address.slice(0, 50)}</text>
                  <box flexDirection="row" flexWrap="wrap" marginTop={1}>
                    {t.showtimes.length === 0 ? (
                      <text fg="gray">Sin funciones programadas hoy</text>
                    ) : (
                      t.showtimes.map((st: Showtime, sIdx: number) => (
                        <box key={sIdx} marginRight={1} marginBottom={1}>
                          <text fg={st.isPassed ? "gray" : "green"}>
                            [{st.time} {st.room} {st.lang}]
                          </text>
                        </box>
                      ))
                    )}
                  </box>
                </box>
              ))}
            </scrollbox>
          </box>
        </box>

        <box marginTop={1} style={{ backgroundColor: "blue" }} padding={1}>
          <text fg="white"><strong> Presiona [Esc] o [q] para volver | [p] {NF.image} Ver Poster en Terminal</strong></text>
        </box>
      </box>
    );
  }

  const activeMovie = activeTab === "movies" ? filteredMovies[selectedIndex] : null;
  const activeCinema = activeTab === "cinemas" ? filteredCinemas[selectedIndex] : null;
  const currentSpinnerFrame = spinnerFrames[spinnerIdx];

  return (
    <box width={columns} height={rows} flexDirection="column" padding={1}>
      {/* Header */}
      <box border padding={1} flexDirection="row" justifyContent="space-between" style={{ borderColor: "cyan" }}>
        <box flexDirection="row">
          <text fg="yellow"><strong>{NF.film} CINEX VENEZUELA TUI</strong></text>
          <text fg="gray">  | {NF.city} Ciudad: </text>
          <text fg="cyan"><strong>{selectedCity}</strong></text>
        </box>
        <box flexDirection="row">
          <text fg="gray">Categoria: </text>
          <text fg="green">
            <strong>{activeTab === "movies" ? `${NF.film} Peliculas` : activeTab === "cinemas" ? `${NF.theater} Cines` : `${NF.city} Ciudades`}</strong>
          </text>
        </box>
      </box>

      {/* Tabs bar */}
      <box flexDirection="row" marginY={1}>
        <box paddingX={2} style={{ backgroundColor: activeTab === "movies" ? "cyan" : "black" }}>
          <text fg={activeTab === "movies" ? "black" : "white"}>
            <strong>[1] {NF.film} Peliculas ({filteredMovies.length})</strong>
          </text>
        </box>
        <box paddingX={2} style={{ backgroundColor: activeTab === "cinemas" ? "cyan" : "black" }}>
          <text fg={activeTab === "cinemas" ? "black" : "white"}>
            <strong>[2] {NF.theater} Cines ({filteredCinemas.length})</strong>
          </text>
        </box>
        <box paddingX={2} style={{ backgroundColor: activeTab === "cities" ? "cyan" : "black" }}>
          <text fg={activeTab === "cities" ? "black" : "white"}>
            <strong>[3] {NF.city} Ciudades ({cities.length})</strong>
          </text>
        </box>
      </box>

      {searchQuery && (
        <box marginBottom={1}>
          <text fg="magenta">{NF.search} Filtro busqueda: "{searchQuery}" (Presiona Esc para limpiar)</text>
        </box>
      )}

      {loading ? (
        <box flexGrow={1} justifyContent="center" alignItems="center">
          <text fg="yellow"><strong>{currentSpinnerFrame} Cargando cartelera y funciones de Cinex Venezuela...</strong></text>
        </box>
      ) : (
        <box flexDirection="row" flexGrow={1}>
          {/* Left Master List */}
          <box width="45%" border padding={1} flexDirection="column" style={{ borderColor: "white" }}>
            <scrollbox height={rows - 10}>
              {activeTab === "movies" &&
                filteredMovies.map((m: Movie, idx: number) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <box
                      key={m.id}
                      paddingX={1}
                      marginBottom={1}
                      style={{ backgroundColor: isSelected ? "blue" : "transparent" }}
                    >
                      <text fg={isSelected ? "yellow" : "white"}>
                        <strong>
                          {isSelected ? `${NF.arrow} ` : "  "}
                          [{m.censorship}] {m.title}
                        </strong>
                      </text>
                      <text fg={isSelected ? "white" : "gray"}>
                        {" "} | {m.durationMinutes} min • {m.genre}
                      </text>
                    </box>
                  );
                })}

              {activeTab === "cinemas" &&
                filteredCinemas.map((c: Cinema, idx: number) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <box
                      key={idx}
                      paddingX={1}
                      marginBottom={1}
                      style={{ backgroundColor: isSelected ? "blue" : "transparent" }}
                    >
                      <text fg={isSelected ? "yellow" : "white"}>
                        <strong>
                          {isSelected ? `${NF.arrow} ` : "  "}
                          {NF.theater} {c.name}
                        </strong>
                      </text>
                      <text fg={isSelected ? "white" : "gray"}>
                        {" "} | {c.city}
                      </text>
                    </box>
                  );
                })}

              {activeTab === "cities" &&
                cities.map((city: City, idx: number) => {
                  const isSelected = idx === selectedIndex;
                  const isCurrentCity = city.name === selectedCity;
                  return (
                    <box
                      key={idx}
                      paddingX={1}
                      marginBottom={1}
                      style={{ backgroundColor: isSelected ? "blue" : "transparent" }}
                    >
                      <text fg={isSelected ? "yellow" : isCurrentCity ? "green" : "white"}>
                        <strong>
                          {isSelected ? `${NF.arrow} ` : "  "}
                          {NF.city} {city.name} {isCurrentCity ? `${NF.check} (Activa)` : ""}
                        </strong>
                      </text>
                    </box>
                  );
                })}
            </scrollbox>
          </box>

          {/* Right Detail Inspector */}
          <box width="55%" border padding={1} flexDirection="column" style={{ borderColor: "gray" }}>
            {activeTab === "movies" && activeMovie && (
              <scrollbox height={rows - 10}>
                <text fg="yellow"><strong>{NF.film} {activeMovie.title}</strong></text>
                <text fg="gray">{NF.clock} Duracion: {activeMovie.durationMinutes} mins | Censura: {activeMovie.censorship} | Genero: {activeMovie.genre}</text>
                <text fg="magenta">Formatos: {activeMovie.formats.join(" / ")}</text>
                
                <box height={1} />
                <text fg="cyan"><strong>[SINOPSIS]</strong></text>
                <text fg="white">{activeMovie.synopsis.slice(0, 250)}...</text>
                <box height={1} />
                <text fg="green"><strong>{NF.ticket} SALAS Y HORARIOS ({activeMovie.theaters.length} cines):</strong></text>
                {activeMovie.theaters.slice(0, 5).map((t: TheaterShowtimes, idx: number) => (
                  <box key={idx} flexDirection="column" marginTop={1}>
                    <text fg="yellow"><strong>• {t.cinemaName} ({t.city || "VE"})</strong></text>
                    <text fg="gray">
                      {t.showtimes
                        .slice(0, 5)
                        .map((s: Showtime) => `${s.time} (${s.room})`)
                        .join("  •  ") || "Sin funciones hoy"}
                    </text>
                  </box>
                ))}
                <box height={1} />
                <text fg="yellow">💡 Presiona [ENTER] para detalle o [p] {NF.image} para ver el poster en la terminal.</text>
              </scrollbox>
            )}

            {activeTab === "cinemas" && activeCinema && (
              <scrollbox height={rows - 10}>
                <text fg="yellow"><strong>{NF.theater} CINEX {activeCinema.name}</strong></text>
                <text fg="cyan">Ciudad: {activeCinema.city}</text>
                <text fg="gray">Direccion: {activeCinema.address}</text>
                <box height={1} />
                <text fg="green"><strong>[PELICULAS EN CARTELERA EN ESTE CINE]</strong></text>
                {movies
                  .filter((m: Movie) => m.theaters.some((t: TheaterShowtimes) => t.cinemaName.toUpperCase() === activeCinema.name.toUpperCase()))
                  .map((m: Movie, idx: number) => {
                    const th = m.theaters.find((t: TheaterShowtimes) => t.cinemaName.toUpperCase() === activeCinema.name.toUpperCase());
                    return (
                      <box key={idx} flexDirection="column" marginTop={1}>
                        <text fg="yellow"><strong>• {m.title} ({m.durationMinutes} min)</strong></text>
                        <text fg="gray">
                          Horarios:{" "}
                          {th?.showtimes
                            .slice(0, 6)
                            .map((s: Showtime) => `${s.time} (${s.room})`)
                            .join("  •  ") || "Consultar"}
                        </text>
                      </box>
                    );
                  })}
              </scrollbox>
            )}

            {activeTab === "cities" && (
              <box flexDirection="column">
                <text fg="yellow"><strong>[FILTRO POR CIUDAD]</strong></text>
                <text fg="white">Selecciona una ciudad en la lista izquierda y presiona [ENTER] para filtrar las peliculas y cines de esa localidad.</text>
                <box height={1} />
                <text fg="green">Ciudad activa actualmente: {selectedCity}</text>
              </box>
            )}
          </box>
        </box>
      )}

      {/* Footer Hotkeys Bar */}
      <box border marginTop={1} paddingX={1} flexDirection="row" justifyContent="space-between" style={{ borderColor: "cyan" }}>
        <text fg="yellow">
          <strong>[Tab/1-3] Cambiar vista  |  [↑/↓] Navegar  |  [Enter] Detalle  |  [p] {NF.image} Poster  |  [r] Recargar  |  [q] Salir</strong>
        </text>
      </box>
    </box>
  );
}

export async function renderTUI() {
  const renderer = await createCliRenderer();
  createRoot(renderer).render(<CinexApp />);
}
