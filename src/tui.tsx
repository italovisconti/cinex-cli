import React, { useState, useEffect, useRef } from "react";
import { createCliRenderer, type ScrollBoxRenderable } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import { fetchAllMovies, extractAllCinemas, fetchCities, getCacheInfo, normalizeStr } from "./api";
import { showPosterInTerminal, openPosterInBrowser } from "./image";
import { playTrailerInTerminal } from "./video";
import { getGlyphs } from "./glyphs";
import { getSpinnerFrames } from "./spinner";
import type { Movie, Cinema, City, Showtime, TheaterShowtimes } from "./types";

interface TuiViewState {
  activeTab: "movies" | "cinemas" | "cities";
  selectedIndex: number;
  selectedCity: string;
  searchQuery: string;
  detailModalMovie: Movie | null;
}

const defaultTuiViewState: TuiViewState = {
  activeTab: "movies",
  selectedIndex: 0,
  selectedCity: "TODAS",
  searchQuery: "",
  detailModalMovie: null
};

function CinexApp({ initialState = defaultTuiViewState }: { initialState?: TuiViewState }) {
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

  const [activeTab, setActiveTab] = useState<"movies" | "cinemas" | "cities">(initialState.activeTab);
  const [selectedIndex, setSelectedIndex] = useState(initialState.selectedIndex);
  const [selectedCity, setSelectedCity] = useState<string>(initialState.selectedCity);
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [isSearching, setIsSearching] = useState(false);

  const [detailModalMovie, setDetailModalMovie] = useState<Movie | null>(initialState.detailModalMovie);
  const [modalScrollTop, setModalScrollTop] = useState(0);
  const theatersScrollRef = useRef<ScrollBoxRenderable>(null);

  const [spinnerIdx, setSpinnerIdx] = useState(0);

  // Animated loader timer
  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setSpinnerIdx((prev) => (prev + 1) % spinnerFrames.length);
    }, 80);
    return () => clearInterval(timer);
  }, [loading, spinnerFrames.length]);

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

  useEffect(() => {
    theatersScrollRef.current?.scrollTo({ x: 0, y: modalScrollTop });
  }, [modalScrollTop, detailModalMovie]);

  const normalizedSearchQuery = normalizeStr(searchQuery);
  const matchesSearch = (value: string) => !normalizedSearchQuery || normalizeStr(value).includes(normalizedSearchQuery);

  const filteredMovies = movies.filter((m: Movie) => {
    const matchesSearchQuery = matchesSearch(`${m.title} ${m.genre}`);
    const matchesCity = selectedCity === "TODAS" || m.theaters.some((t: TheaterShowtimes) => t.city?.toUpperCase() === selectedCity.toUpperCase());
    return matchesSearchQuery && matchesCity;
  });

  const filteredCinemas = cinemas.filter((c: Cinema) => {
    const matchesSearchQuery = matchesSearch(`${c.name} ${c.address} ${c.city}`);
    const matchesCity = selectedCity === "TODAS" || c.city.toUpperCase() === selectedCity.toUpperCase();
    return matchesSearchQuery && matchesCity;
  });

  const filteredCities = cities.filter((city: City) => matchesSearch(city.name));
  const currentListLength = activeTab === "movies" ? filteredMovies.length : activeTab === "cinemas" ? filteredCinemas.length : filteredCities.length;
  const currentMovie = activeTab === "movies" ? filteredMovies[selectedIndex] : null;

  const getViewState = (): TuiViewState => ({
    activeTab,
    selectedIndex,
    selectedCity,
    searchQuery,
    detailModalMovie
  });

  const openTerminalPoster = (movie: Movie) => {
    if (!movie || !movie.posterUrl) return;
    const previousView = getViewState();
    renderer.destroy();
    void (async () => {
      try {
        await showPosterInTerminal(movie.title, movie.posterUrl);
      } finally {
        await renderTUI(previousView);
      }
    })();
  };

  useKeyboard((event) => {
    if (isSearching) {
      if (event.name === "escape") {
        setIsSearching(false);
        setSearchQuery("");
        setSelectedIndex(0);
        return;
      }

      if (event.name === "backspace") {
        setSearchQuery((query) => query.slice(0, -1));
        setSelectedIndex(0);
        return;
      }

      if (event.name === "return" || event.name === "enter") {
        setIsSearching(false);
        return;
      }

      if (!event.ctrl && !event.meta && !event.option && Array.from(event.sequence).length === 1 && !/[\u0000-\u001f\u007f]/.test(event.sequence)) {
        setSearchQuery((query) => query + event.sequence);
        setSelectedIndex(0);
      }
      return;
    }

    if (event.name === "q") {
      if (detailModalMovie) {
        setDetailModalMovie(null);
        setModalScrollTop(0);
        return;
      }
      renderer.destroy();
      process.exit(0);
      return;
    }

    if (event.name === "r" && !isSearching) {
      loadData(true);
      return;
    }

    if (event.name === "p") {
      const targetMovie = detailModalMovie || currentMovie;
      if (targetMovie) {
        openTerminalPoster(targetMovie);
      }
      return;
    }

    if (event.name === "t" && !isSearching) {
      const targetMovie = detailModalMovie || currentMovie;
      if (targetMovie && targetMovie.youtubeUrl) {
        const previousView = getViewState();
        renderer.destroy();
        void (async () => {
          try {
            await playTrailerInTerminal(targetMovie.title, targetMovie.youtubeUrl, { tuiMode: true });
          } finally {
            await renderTUI(previousView);
          }
        })();
      }
      return;
    }

    if (event.name === "o" && !isSearching) {
      const targetMovie = detailModalMovie || currentMovie;
      if (targetMovie && targetMovie.youtubeUrl) {
        openPosterInBrowser(targetMovie.youtubeUrl);
      }
      return;
    }

    if (event.name === "escape") {
      if (detailModalMovie) {
        setDetailModalMovie(null);
        setModalScrollTop(0);
        return;
      }
      if (searchQuery) {
        setSearchQuery("");
        setSelectedIndex(0);
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
    if (event.name === "/" && !detailModalMovie) { setIsSearching(true); setSelectedIndex(0); return; }

    if (event.name === "up" || event.name === "k") {
      if (detailModalMovie) {
        setModalScrollTop((prev: number) => Math.max(0, prev - 2));
      } else {
        setSelectedIndex((prev: number) => Math.max(0, prev - 1));
      }
      return;
    }

    if (event.name === "down" || event.name === "j") {
      if (detailModalMovie) {
        setModalScrollTop((prev: number) => prev + 2);
      } else {
        setSelectedIndex((prev: number) => Math.min(currentListLength - 1, prev + 1));
      }
      return;
    }

    if (event.name === "pageup") {
      if (detailModalMovie) {
        setModalScrollTop((prev: number) => Math.max(0, prev - 8));
      }
      return;
    }

    if (event.name === "pagedown") {
      if (detailModalMovie) {
        setModalScrollTop((prev: number) => prev + 8);
      }
      return;
    }

    if (event.name === "return" || event.name === "enter") {
      if (activeTab === "movies" && filteredMovies[selectedIndex]) {
        setDetailModalMovie(filteredMovies[selectedIndex]);
        setModalScrollTop(0);
      } else if (activeTab === "cities" && filteredCities[selectedIndex]) {
        setSelectedCity(filteredCities[selectedIndex].name);
        setActiveTab("movies");
        setSelectedIndex(0);
      }
    }
  });

  // Render Full Screen Movie Detail Modal
  if (detailModalMovie) {
    const synopsisHeight = Math.max(3, Math.min(8, rows - 12));

    return (
      // A distinct key prevents the main view's layout nodes from being reused by the modal.
      <box key="movie-detail" width={columns} height={rows} flexDirection="column" padding={0} border overflow="hidden" style={{ borderColor: "cyan" }}>
        {/* Header */}
        <box height={3} flexShrink={0} border paddingX={1} marginBottom={0} flexDirection="row" justifyContent="space-between" alignItems="center" style={{ borderColor: "yellow" }}>
          <box flexDirection="row">
            <text fg="yellow">
              <strong>{NF.film} {detailModalMovie.title.toUpperCase()}</strong>
            </text>
          </box>
          <box flexDirection="row">
            <text fg="gray">
              {NF.clock} {detailModalMovie.durationMinutes} min  |  Censura: {detailModalMovie.censorship}  |  Genero: {detailModalMovie.genre}
            </text>
          </box>
        </box>

        {/* Middle Body */}
        <box height={0} flexDirection="row" flexGrow={1} overflow="hidden">
          {/* Left Column */}
          <box width="45%" flexDirection="column" paddingX={1} border style={{ borderColor: "gray" }}>
            <text fg="cyan"><strong>[SINOPSIS]</strong></text>
            <scrollbox height={synopsisHeight} marginBottom={1}>
              <text fg="white">{detailModalMovie.synopsis}</text>
            </scrollbox>

            <text fg="cyan"><strong>[FORMATOS DISPONIBLES]</strong></text>
            <box flexDirection="row" flexWrap="wrap" marginY={1}>
              {detailModalMovie.formats.map((fmt: string, fIdx: number) => {
                let fmtColor = "white";
                if (fmt.includes("4DX")) fmtColor = "magenta";
                else if (fmt.includes("VIP")) fmtColor = "yellow";
                else if (fmt.includes("3D")) fmtColor = "cyan";
                else if (fmt.includes("DIG")) fmtColor = "green";
                return (
                  <box key={fIdx} marginRight={1} marginBottom={1}>
                    <text fg={fmtColor}><strong>[{fmt}]</strong></text>
                  </box>
                );
              })}
            </box>

            <box marginTop={1} flexDirection="column">
              <text fg="yellow"><strong>{NF.image} Presiona [p] poster | [t] {NF.play} trailer | [o] web</strong></text>
              {detailModalMovie.youtubeUrl && (
                <text fg="blue">{NF.play} YouTube: {detailModalMovie.youtubeUrl}</text>
              )}
            </box>
          </box>

          {/* Right Column (With Scroller & Colored Badges) */}
          <box width="55%" flexDirection="column" paddingX={1} border style={{ borderColor: "gray" }}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg="green"><strong>{NF.ticket} CINES Y HORARIOS ({detailModalMovie.theaters.length} salas):</strong></text>
              <text fg="gray"><strong>[↑/↓ Scroll]</strong></text>
            </box>

            <scrollbox ref={theatersScrollRef} flexGrow={1}>
              {detailModalMovie.theaters.map((t: TheaterShowtimes, idx: number) => (
                <box key={idx} flexDirection="column" marginBottom={1} border style={{ borderColor: "gray" }} paddingX={1}>
                  <text fg="yellow"><strong>{NF.theater} {t.cinemaName} ({t.city || "VE"})</strong></text>
                  <text fg="gray">{t.address.slice(0, 55)}</text>
                  <box flexDirection="row" flexWrap="wrap" marginTop={1}>
                    {t.showtimes.length === 0 ? (
                      <text fg="gray">Sin funciones programadas hoy</text>
                    ) : (
                      t.showtimes.map((st: Showtime, sIdx: number) => {
                        let badgeColor = st.isPassed ? "gray" : "green";
                        if (!st.isPassed) {
                          if (st.room.includes("4DX")) badgeColor = "magenta";
                          else if (st.room.includes("VIP")) badgeColor = "yellow";
                          else if (st.lang.includes("SUB")) badgeColor = "cyan";
                        }
                        const cleanLang = st.lang && st.lang !== "N/A" ? ` ${st.lang}` : "";
                        return (
                          <box key={sIdx} marginRight={1} marginBottom={1}>
                            <text fg={badgeColor}>
                              <strong>[{st.time} {st.room}{cleanLang}]</strong>
                            </text>
                          </box>
                        );
                      })
                    )}
                  </box>
                </box>
              ))}
            </scrollbox>
          </box>
        </box>

        {/* Footer Bar */}
        <box flexShrink={0} paddingX={1} style={{ backgroundColor: "blue" }}>
          <text fg="white"><strong> Presiona [Esc/q] Volver | [↑/↓] Navegar salas | [p] Poster | [t] Trailer | [o] Abrir Web</strong></text>
        </box>
      </box>
    );
  }

  const activeMovie = activeTab === "movies" ? filteredMovies[selectedIndex] : null;
  const activeCinema = activeTab === "cinemas" ? filteredCinemas[selectedIndex] : null;
  const currentSpinnerFrame = spinnerFrames[spinnerIdx];
  const cacheInfo = getCacheInfo();

  return (
    // Keep the dashboard in its own reconciliation tree when closing the detail modal.
    <box key="dashboard" width={columns} height={rows} flexDirection="column" padding={1}>
      {/* Header */}
      <box border padding={1} flexDirection="row" justifyContent="space-between" style={{ borderColor: "cyan" }}>
        <box flexDirection="row">
          <text fg="yellow"><strong>{NF.film} CINEX</strong></text>
          <text fg="gray">  | {NF.city} Ciudad: </text>
          <text fg="cyan"><strong>{selectedCity}</strong></text>
          <text fg="gray">  | Cache: </text>
          <text fg={cacheInfo.ageMinutes < 30 ? "green" : "yellow"}>
            <strong>{cacheInfo.ageMinutes === 0 ? "En vivo" : `hace ${cacheInfo.ageMinutes} min`}</strong>
          </text>
        </box>
        <box flexDirection="row">
          <text fg="gray">Categoria: </text>
          <text fg="green">
            <strong>{activeTab === "movies" ? `${NF.film} Peliculas` : activeTab === "cinemas" ? `${NF.theater} Cines` : `${NF.city} Ciudades`}</strong>
          </text>
        </box>
      </box>

      {/* Tabs bar */}
      <box flexDirection="row" marginY={1} height={1} alignItems="center">
        <box paddingX={2} height={1} style={{ backgroundColor: activeTab === "movies" ? "cyan" : "black" }}>
          <text fg={activeTab === "movies" ? "black" : "white"}>
            <strong>[1] {NF.film} Peliculas ({filteredMovies.length})</strong>
          </text>
        </box>
        <box paddingX={2} height={1} style={{ backgroundColor: activeTab === "cinemas" ? "cyan" : "black" }}>
          <text fg={activeTab === "cinemas" ? "black" : "white"}>
            <strong>[2] {NF.theater} Cines ({filteredCinemas.length})</strong>
          </text>
        </box>
        <box paddingX={2} height={1} style={{ backgroundColor: activeTab === "cities" ? "cyan" : "black" }}>
          <text fg={activeTab === "cities" ? "black" : "white"}>
            <strong>[3] {NF.city} Ciudades ({filteredCities.length})</strong>
          </text>
        </box>
      </box>

      {isSearching ? (
        <box marginBottom={1}>
          <text fg="magenta"><strong>{NF.search} Buscar: {searchQuery || "_"}  [Enter] Aplicar | [Esc] Limpiar</strong></text>
        </box>
      ) : searchQuery && (
        <box marginBottom={1}>
          <text fg="magenta">{NF.search} Filtro: "{searchQuery}" ([/] editar | [Esc] limpiar)</text>
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
                filteredCities.map((city: City, idx: number) => {
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
          <strong>[Tab/1-3] Cambiar vista  |  [/] Buscar  |  [↑/↓] Navegar  |  [Enter] Detalle  |  [p] Poster  |  [t] Trailer  |  [r] Recargar  |  [q] Salir</strong>
        </text>
      </box>
    </box>
  );
}

export async function renderTUI(initialState: TuiViewState = defaultTuiViewState) {
  const renderer = await createCliRenderer();
  createRoot(renderer).render(<CinexApp initialState={initialState} />);
}
