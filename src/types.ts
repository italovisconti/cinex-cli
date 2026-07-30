export interface Showtime {
  room: string;
  time: string;
  lang: "ESP" | "SUB" | "N/A";
  isPassed: boolean;
  status: "Proyectada" | "Disponible";
}

export interface TheaterShowtimes {
  cinemaName: string;
  address: string;
  city?: string;
  showtimes: Showtime[];
}

export interface Movie {
  id: string;
  hocode: string;
  title: string;
  slug: string;
  sinopsisUrl: string;
  genre: string;
  censorship: string;
  durationMinutes: number;
  releaseDate?: string;
  posterUrl: string;
  youtubeUrl: string;
  formats: string[];
  synopsis: string;
  theaters: TheaterShowtimes[];
}

export interface Cinema {
  name: string;
  address: string;
  city: string;
  moviesCount?: number;
}

export interface City {
  name: string;
}
