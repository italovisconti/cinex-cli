<p align="center">
  <img src="static/cinex-cli-logo.png" alt="cinex-cli logo" width="340" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Runtime-Bun-fbf0df?logo=bun&logoColor=black" alt="Bun" />
  <img src="https://img.shields.io/badge/TUI-Interactive-61DAFB?logo=react&logoColor=black" alt="TUI" />
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

<p align="center">
  <img src="static/video-showcase.gif" alt="cinex-cli showcase" width="640" />
</p>

---

## Indice

- [Instalacion Rapida (Ejecutable Binario)](#instalacion-rapida-ejecutable-binario)
  - [Linux](#linux)
  - [macOS](#macos)
  - [Windows](#windows)
- [Instalacion desde Codigo Fuente](#instalacion-desde-codigo-fuente)
- [Generar Builds de Release](#generar-builds-de-release)
- [Guia de Uso](#guia-de-uso)
  - [Interfaz Grafica TUI](#interfaz-grafica-tui)
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
- [Requisitos Opcionales y Terminales Recomendadas](#requisitos-opcionales-y-terminales-recomendadas)
  - [1. Reproduccion de Trailers (yt-dlp, timg, mpv)](#1-reproduccion-de-trailers-yt-dlp-timg-mpv)
  - [2. Visualizacion de Posters y Graficos Terminal](#2-visualizacion-de-posters-y-graficos-terminal)
- [Tecnologias](#tecnologias)
- [Licencia](#licencia)

---

## Instalacion Rapida (Ejecutable Binario)

Puedes descargar directamente el binario ejecutable precompilado para tu sistema operativo sin necesidad de instalar Node.js o Bun:

### Linux

```bash
# Descargar el ejecutable para Linux (x64)
curl -sSL https://github.com/italovisconti/cinex-cli/releases/latest/download/cinex-linux-x64 -o cinex

# Dar permisos de ejecucion
chmod +x cinex

# Mover a tu carpeta de binarios del sistema (opcional)
sudo mv cinex /usr/local/bin/

# Ejecutar
cinex
```

### macOS

#### Apple Silicon (M1 / M2 / M3 / M4)
```bash
# Descargar el ejecutable para macOS ARM64
curl -sSL https://github.com/italovisconti/cinex-cli/releases/latest/download/cinex-macos-arm64 -o cinex

# Dar permisos de ejecucion
chmod +x cinex

# Mover a tu carpeta de binarios del sistema (opcional)
sudo mv cinex /usr/local/bin/

# Ejecutar
cinex
```

#### Intel
```bash
# Descargar el ejecutable para macOS x64
curl -sSL https://github.com/italovisconti/cinex-cli/releases/latest/download/cinex-macos-x64 -o cinex

# Dar permisos de ejecucion
chmod +x cinex

# Mover a tu carpeta de binarios del sistema (opcional)
sudo mv cinex /usr/local/bin/

# Ejecutar
cinex
```

### Windows

#### Desde PowerShell:
```powershell
# Descargar el ejecutable para Windows (x64)
Invoke-WebRequest -Uri "https://github.com/italovisconti/cinex-cli/releases/latest/download/cinex-windows-x64.exe" -OutFile "cinex.exe"

# Ejecutar la aplicacion
.\cinex.exe
```

#### Desde Command Prompt (cmd) o Git Bash:
```cmd
curl -sSL https://github.com/italovisconti/cinex-cli/releases/latest/download/cinex-windows-x64.exe -o cinex.exe
cinex.exe
```

> **Nota para Windows**: Puedes mover `cinex.exe` a una carpeta incluida en tu `PATH` de sistema (por ejemplo `C:\Windows` o `C:\Users\<TuUsuario>\AppData\Local\Microsoft\WindowsApps`) para poder ejecutar `cinex` desde cualquier terminal.

---

## Instalacion desde Codigo Fuente

Si prefieres ejecutar o modificar el proyecto desde su codigo fuente en **Linux**, **macOS** o **Windows**:

1. Requisito previo: Tener instalado [Bun](https://bun.sh) (o Node.js v18+).

2. Clonar e instalar:
```bash
# Clonar el repositorio
git clone https://github.com/italovisconti/cinex-cli.git
cd cinex-cli

# Instalar dependencias
bun install

# Crear enlace ejecutable global (opcional)
bun link

# Ejecutar la TUI
bun run tui
```

---

## Generar Builds de Release

El comando de release compila los ejecutables para Linux x64, macOS (Apple Silicon e Intel) y Windows x64. Los archivos y su manifiesto `SHA256SUMS` se generan en `dist/release/v<version>/`.

> Requiere Bun `1.3.13` o superior. Si es necesario, actualiza con `bun upgrade`.

```bash
bun run release:build
```

El script descarga automaticamente los bindings de OpenTUI que faltan para la compilacion cruzada.

---

## Guia de Uso

### Interfaz Grafica TUI
Inicia la TUI en la terminal. Puedes ejecutar directamente `cinex` o `cinex tui`:

```bash
# Iniciar TUI directamente (modo por defecto)
cinex

# O explícitamente
cinex tui

# O con Bun desde fuente
bun run tui
```

#### Atajos de teclado en TUI:
- `[1]`, `[2]`, `[3]`, `[Tab]` o `[←]`/`[→]` (y `[h]`/`[l]`): Alternar entre **Peliculas (Cartelera)**, **Cines (Salas)** y **Ciudades**.
- `[↑]` / `[↓]`, `[k]` / `[j]`: Navegar por la lista.
- `[g]` / `[G]` (o `[shift]+g`): Ir al **inicio** / **final** de la lista (en el modal desplaza arriba/abajo).
- `[Enter]`: Abrir modal con la sinopsis completa, formatos, trailer y horarios en todas las salas.
- `[p]`: Renderizar el poster oficial en pantalla completa DENTRO de la terminal.
- `[t]`: Descargar y reproducir el trailer oficial en la terminal (usando yt-dlp / timg / navegador).
- `[/]`: Abrir la busqueda/filtro en tiempo real dentro de la vista actual. En el detalle de una pelicula filtra solo los cines y horarios de esa pelicula. Escribe para filtrar, usa `[Backspace]` para borrar y `[Enter]` para conservar el filtro.
- `[r]`: Recargar datos en tiempo real desde Cinex Venezuela.
- `[Esc]`: Cerrar modal, cancelar la busqueda activa o limpiar el filtro aplicado.
- `[q]`: Salir de la aplicacion.

> Con espacio suficiente, el detalle de una pelicula muestra un preview inline del poster sobre la sinopsis. Si no se puede generar, el modal conserva su layout y `[p]` sigue mostrando el poster completo.

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

> **Nota**: Durante la descarga o reproducción, presiona `[Ctrl+C]` para cancelar/salir y volver al TUI. Solo las películas con trailer disponible muestran la opción `[t]`/trailer.

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

## Requisitos Opcionales y Terminales Recomendadas

`cinex-cli` funciona directamente en cualquier terminal estándar (Linux, macOS, Windows). Sin embargo, para disfrutar de la experiencia visual completa (posters en alta resolución y reproducción de trailers dentro de la terminal), te recomendamos instalar las siguientes herramientas opcionales:

### 1. Reproducción de Trailers (`yt-dlp`, `timg`, `mpv`)

- **`yt-dlp`** *(Recomendado)*: Herramienta CLI para la descarga fluida de trailers desde YouTube.
  - **Linux / macOS**:
    ```bash
    mkdir -p ~/.local/bin && curl -sSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp && chmod +x ~/.local/bin/yt-dlp
    ```
    *O mediante gestor de paquetes:*
    ```bash
    brew install yt-dlp    # macOS
    pip install yt-dlp     # Linux / Windows
    ```
  - *Si `yt-dlp` no está presente, `cinex-cli` abrirá automáticamente el trailer en tu navegador web.*

- **`timg`** o **`mpv`**: Renderizador multimedia para reproducciones de video en gráficos terminal.
  - **macOS**: `brew install timg`
  - **Linux (Ubuntu/Debian)**: `sudo apt install timg mpv`
  - **Arch Linux**: `sudo pacman -S timg mpv`

---

### 2. Visualización de Posters y Gráficos Terminal

Para renderizar posters e imágenes oficiales sin distorsión dentro de la terminal, se recomienda usar una **terminal moderna con soporte para colores TrueColor (24-bit)** o protocolos gráficos (Kitty / iTerm2 / Sixel):

#### Terminales Recomendadas:
- **macOS**: [iTerm2](https://iterm2.com/), [Kitty](https://sw.kovidgoyal.net/kitty/), [WezTerm](https://wezfurlong.org/wezterm/), Ghostty.
- **Linux**: Kitty, WezTerm, Konsole, Alacritty, GNOME Terminal.
- **Windows**: [Windows Terminal](https://github.com/microsoft/terminal) (usando PowerShell, Command Prompt o WSL2).

> **Nota**: Si tu terminal no soporta gráficos nativos, `cinex-cli` utilizará automáticamente renderizado en bloques de color ANSI (TrueColor) o te permitirá abrir la imagen directamente en el navegador con la opción `--open` o el atajo `[o]` en la TUI.

---

## Fallback de Fuentes (Nerd Fonts vs ASCII)

`cinex-cli` incluye un sistema inteligente de iconos:
- Si tu terminal soporta **Nerd Fonts**, mostrara iconos vectoriales de peliculas, cines, relojes y salas (`󰿎`, `󰨄`, `󰈤`, `󰥔`, `󰔖`).
- Si tu terminal no tiene Nerd Fonts instaladas, utilizara automaticamente un **fallback ASCII limpio** (`[PELICULA]`, `[CINE]`, `[HORARIOS]`, `›`, `✓`).
- Puedes forzar el modo sin Nerd Fonts configurando la variable `NO_NERD_FONTS=1`:
  ```bash
  NO_NERD_FONTS=1 cinex cartelera
  ```

---

## Temas de Color

`cinex-cli` incluye dos paletas de colores:

- **`cinex`** *(por defecto)*: paleta de marca extraída de [cinex.com.ve](https://www.cinex.com.ve/) (azul marino `#01105f`, bordo `#a11f3c`, menta `#2cdd9b`, celeste `#00b4ff`, rosa `#ff4d7e`, coral `#ff6a5b` y dorado `#ffc741`).
- **`classic`**: la paleta original (cián, amarillo, verde, magenta, etc.).

La selección del tema se resuelve así: la variable de entorno `CINEX_THEME` tiene prioridad, luego el archivo de configuración `~/.config/cinex-cli/config.json` (estándar XDG), y por defecto se usa `cinex`.

Para volver a la paleta clásica:

```bash
# Opción 1: variable de entorno (por comando o sesión)
CINEX_THEME=classic cinex cartelera

# Opción 2: archivo de configuración persistente
mkdir -p ~/.config/cinex-cli
echo '{ "theme": "classic" }' > ~/.config/cinex-cli/config.json
```

En terminales con soporte TrueColor (`COLORTERM=truecolor`) tanto la CLI como la TUI usarán los colores hex exactos de la marca; en terminales de 16 colores la CLI hará un fallback a la paleta ANSI más cercana.

---

## Tecnologias

- **Lenguaje**: TypeScript 5+
- **Runtime**: Bun 1.0+ / Node.js
- **TUI Framework**: React TUI (`@opentui/react`, `@opentui/core`)
- **CLI Framework**: Commander & Picocolors
- **Scraper / Parser**: Cheerio
- **Image Renderer**: `timg` / `terminal-image`

---

## Licencia

[MIT License](LICENSE)
