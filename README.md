<p align="center">
  <img src="static/cinex-cli-logo.png" alt="cinex-cli logo" width="340" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Runtime-Bun-fbf0df?logo=bun&logoColor=black" alt="Bun" />
  <img src="https://img.shields.io/badge/TUI-OpenTUI_React-61DAFB?logo=react&logoColor=black" alt="OpenTUI" />
  <img src="https://img.shields.io/badge/CLI-Commander-ff6348" alt="Commander" />
  <img src="https://img.shields.io/badge/License-MIT-4CAF50" alt="License" />
</p>

<h1 align="center">cinex-cli</h1>

<p align="center">
  CLI y TUI no oficial para explorar la cartelera, peliculas, funciones, horarios, salas, sinopsis, duracion, censura, trailers y ver posters de <strong>Cinex Venezuela</strong> desde tu terminal.
</p>

<p align="center">
  <em>"— ¿Para que sirve eso?"</em><br>
  <em>"— ¿Nunca has querido revisar la cartelera de Cinex desde la terminal...?"</em>
</p>

---

## Indice

- [Instalacion Rapida (Ejecutable Binario)](#instalacion-rapida-ejecutable-binario)
- [Instalacion desde Codigo Fuente](#instalacion-desde-codigo-fuente)
- [Guia de Uso](#guia-de-uso)
  - [Interfaz Grafica TUI (OpenTUI)](#interfaz-grafica-tui-opentui)
  - [Cartelera de Peliculas](#cartelera-de-peliculas)
  - [Sinopsis, Duracion y Horarios](#sinopsis-duracion-y-horarios)
  - [Ver Poster / Imagen en Terminal](#ver-poster--imagen-en-terminal)
  - [Reproducir Trailer en Terminal](#reproducir-trailer-en-terminal)
  - [Salas Especiales 4DX y VIP](#salas-especiales-4dx-y-vip)
  - [Generar Resumen para Compartir (WhatsApp / Discord)](#generar-resumen-para-compartir-whatsapp--discord)
  - [Cines y Salas por Ciudad](#cines-y-salas-por-ciudad)
  - [Funciones de un Cine Especifico](#funciones-de-un-cine-especifico)
  - [Ciudades Disponibles](#ciudades-disponibles)
- [Fallback de Fuentes (Nerd Fonts vs ASCII)](#fallback-de-fuentes-nerd-fonts-vs-ascii)
- [Tecnologias](#tecnologias)
- [Licencia](#licencia)

---

## Instalacion Rapida (Ejecutable Binario)

Puedes descargar directamente el binario ejecutable para Linux sin necesidad de instalar Node.js o Bun:

```bash
# Descargar el ultimo binario desde GitHub Releases
curl -sSL https://github.com/italovisconti/cinex-cli/releases/latest/download/cinex -o cinex

# Dar permisos de ejecucion
chmod +x cinex

# Mover a tu carpeta de binarios (opcional)
sudo mv cinex /usr/local/bin/

# Ejecutar la TUI directamente
cinex
```

---

## Instalacion desde Codigo Fuente

```bash
# Clonar el repositorio
git clone https://github.com/italovisconti/cinex-cli.git
cd cinex-cli

# Instalar dependencias con Bun
bun install

# Crear enlace ejecutable global (opcional)
bun link
```

---

## Guia de Uso

### Interfaz Grafica TUI (OpenTUI)
Inicia la experiencia visual interactiva en la terminal utilizando **OpenTUI React**. Puedes ejecutar directamente `cinex` o `cinex tui`:

```bash
# Iniciar TUI directamente (modo por defecto)
cinex

# O explícitamente
cinex tui

# O con Bun desde fuente
bun run tui
```

#### Atajos de teclado en TUI:
- `[1]`, `[2]`, `[3]` o `[Tab]`: Alternar entre **Peliculas (Cartelera)**, **Cines (Salas)** y **Ciudades**.
- `[↑]` / `[↓]` o `[k]` / `[j]`: Navegar por la lista.
- `[Enter]`: Abrir modal con la sinopsis completa, formatos, trailer y horarios en todas las salas.
- `[p]`: Renderizar el poster oficial en pantalla completa DENTRO de la terminal.
- `[/]`: Filtrar o buscar por texto en tiempo real.
- `[r]`: Recargar datos en tiempo real desde Cinex Venezuela.
- `[Esc]`: Cerrar modal o limpiar filtro de busqueda.
- `[q]`: Salir de la aplicacion.

---

### Cartelera de Peliculas
Muestra todas las peliculas en cartelera con su duracion (en minutos), clasificacion de censura (`[A]`, `[B]`, `[C]`), genero y formatos disponibles (`2D`, `3D`, `4DX`, `VIP`, `ESP`, `SUB`).

```bash
# Listar todas las peliculas en cartelera
cinex cartelera

# Filtrar peliculas por ciudad
cinex cartelera --city Caracas

# Filtrar peliculas por genero
cinex cartelera --genre Terror
```

---

### Sinopsis, Duracion y Horarios
Muestra la ficha detallada de una pelicula. Renderiza el poster/imagen por defecto en la terminal junto a la sinopsis completa, duracion, censura, genero, formatos, trailer en YouTube y lista de cines con horarios de funciones (hora, sala, lenguaje ESP/SUB y estado proyectada/disponible).

```bash
# Buscar por titulo o ID (renderiza el poster por defecto)
cinex show Spiderman

# Buscar "Moana 2026"
cinex show "Moana 2026"

# Desactivar la renderizacion del poster en terminal
cinex show "Toy Story 5" --no-poster

# Abrir la imagen del poster en el navegador web
cinex show "Toy Story 5" --open
```

---

### Ver Poster / Imagen en Terminal
Renderiza el poster oficial de la pelicula directamente dentro de tu terminal utilizando graficos de alta resolucion o bloque de color ANSI.

```bash
# Renderizar poster en la terminal
cinex poster Spiderman

# Ajustar el ancho del renderizado
cinex poster "La Odisea" --width 50

# Abrir la imagen del poster en el navegador web
cinex poster "Scary Movie 6" --open
```

---

### Reproducir Trailer en Terminal
Descarga el trailer completo de la pelicula con barra de progreso en vivo y lo reproduce como video animado ANSI dentro de la terminal (requiere `yt-dlp` opcional).

```bash
# Descargar y reproducir trailer en la terminal
cinex trailer Spiderman

# Conservar el video descargado sin preguntar si desea eliminarlo
cinex trailer Spiderman --keep

# Abrir enlace de YouTube en el navegador web
cinex trailer Spiderman --open
```

---

### Salas Especiales 4DX y VIP
Filtra al instante unicamente las funciones y cines con salas especiales 4DX (movimiento y efectos) o VIP.

```bash
# Ver peliculas y cines con funciones 4DX
cinex 4dx

# Ver peliculas y cines con funciones VIP
cinex vip
```

---

### Generar Resumen para Compartir (WhatsApp / Discord)
Genera un bloque de texto perfectamente formateado para copiar y pegar en WhatsApp, Telegram o Discord al cuadrar salidas al cine con amigos.

```bash
# Generar resumen de una pelicula
cinex compartir Spiderman

# Generar resumen filtrando un cine especifico
cinex compartir Spiderman Tolon
```

---

### Cines y Salas por Ciudad
Lista todos los complejos de Cinex agrupados por ciudad en Venezuela.

```bash
# Listar todos los cines agrupados por ciudad
cinex cines

# Filtrar cines de una ciudad especifica
cinex cines --city Caracas
cinex cines --city Maracaibo
```

---

### Funciones de un Cine Especifico
Muestra todas las peliculas y sus respectivos horarios disponibles para un cine en particular (acepta acentos o texto plano).

```bash
# Consultar funciones en Cinex Tolon
cinex cine Tolon

# Consultar funciones en Cinex Sambil
cinex cine Sambil

# Consultar funciones en Cinex San Ignacio
cinex cine "San Ignacio"
```

---

### Ciudades Disponibles
Muestra la lista de ciudades venezolanas donde Cinex tiene salas disponibles.

```bash
cinex ciudades
```

---

## Fallback de Fuentes (Nerd Fonts vs ASCII)

`cinex-cli` incluye un sistema inteligente de iconos:
- Si tu terminal soporta **Nerd Fonts**, mostrara iconos vectoriales de peliculas, cines, relojes y salas (`󰿎`, `󰨄`, `󰈤`, `󰥔`, `󰓓`).
- Si tu terminal no tiene Nerd Fonts instaladas, utilizara automaticamente un **fallback ASCII limpio** (`[PELICULA]`, `[CINE]`, `[HORARIOS]`, `›`, `✓`).
- Puedes forzar el modo sin Nerd Fonts configurando la variable `NO_NERD_FONTS=1`:
  ```bash
  NO_NERD_FONTS=1 cinex cartelera
  ```

---

## Tecnologias

- **Lenguaje**: TypeScript 5+
- **Runtime**: Bun 1.0+ / Node.js
- **TUI Framework**: [OpenTUI React](https://opentui.com/) (`@opentui/react`, `@opentui/core`)
- **CLI Framework**: Commander & Picocolors
- **Scraper / Parser**: Cheerio
- **Image Renderer**: `timg` / `terminal-image`

---

## Licencia

[MIT License](LICENSE)
