# Ninja Online

Fan game de ninjas con vista cenital: te mueves con WASD, peleas, subes de nivel
y ves a tus amigos en el mismo mapa en tiempo real.

Hecho con React + Vite + Tailwind, reusando la base de AppHabitos
(Firebase Auth para la cuenta, Supabase para el progreso y el multijugador).

## Controles

| Tecla | Acción |
|---|---|
| `W` `A` `S` `D` | moverse |
| `Shift` | correr |
| `Espacio` o `J` | golpe cuerpo a cuerpo |
| `1` `2` `3` | lanzar jutsu (se desbloquean por nivel) |
| `K` | repetir el último jutsu |

Los círculos brillantes del mapa son portales: pisa uno para cambiar de zona.

## Jugar con amigos

Cada partida ocurre en una **sala**, identificada por un código de 5 caracteres.
Quien entre con el mismo código comparte mundo: os veis moveros, pelear y lanzar
jutsus en tiempo real.

1. Abre el juego: https://nbeltranmoreno.github.io/naruto-online/
2. Te sale un código ya generado (o escribe el de un amigo para unirte al suyo).
3. Pulsa **Copiar enlace** y pásaselo. Ese enlace lleva el código dentro, así que
   quien lo abra entra directo a tu sala.

Solo ves a quien esté en **tu misma zona**: si alguien cruza un portal al bosque,
desaparece de tu pantalla hasta que lo sigas.

El código no lleva O ni 0, ni I ni 1, para que no se confundan al dictarlo.

### Cómo funciona por dentro

No hay servidor propio ni base de datos: los jugadores de una sala se mandan sus
posiciones a través de un **servidor MQTT público**, de los que no piden registro
(ver [`src/net/transport.js`](src/net/transport.js)). Todos son iguales, no hay
anfitrión, así que si uno se va la sala sigue funcionando.

Lo que viaja son posiciones y golpes, nada personal. Aun así el canal es público:
cualquiera que **adivine** el código podría entrar en la sala. Por eso los códigos
se generan al azar. Para una partida entre amigos es suficiente; no lo uses para
nada que deba ser privado.

El progreso (nivel, experiencia) es de cada uno y no se comparte.

## Zonas

1. **Aldea de la Hoja** — zona segura, sin enemigos, la vida se regenera sola.
2. **Bosque de la Muerte** — bandidos y lobos.
3. **Valle del Fin** — ronin, lobos y un Ninja Desertor como jefe.

## Jutsus

| Nivel | Jutsu | Chakra |
|---|---|---|
| 1 | Shuriken | 6 |
| 3 | Bola de Fuego | 18 |
| 6 | Rasengan | 32 |

## Poner en marcha

```bash
npm install
npm run dev          # http://localhost:5173/naruto-online/
npm run dev -- --host  # además accesible desde otros equipos de la red
```

## Base de datos

El progreso se guarda **siempre** en el navegador (localStorage) y además en
Supabase si la base de datos responde. Para crear la tabla:

```bash
npm run migrate      # ejecuta supabase-schema.sql
```

> ⚠️ El proyecto de Supabase del `.env` (`xbzrtmylhsjzyiajytmp`) ya no existe.
> Esto **no afecta al multijugador**, que no usa Supabase. Lo único que falta
> mientras tanto es que el progreso se sincronice entre dispositivos: ahora se
> guarda solo en el navegador de cada uno. Para arreglarlo hay que actualizar
> `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `SUPABASE_DB_PASSWORD` en
> `.env`, y el `project-ref` del pooler en `db-migrate-correct.js`.

## Meter sprites de verdad (para que se vea como anime)

Ahora mismo los personajes se **dibujan por código**, sin imágenes. Funciona y
no depende de nada, pero tiene un techo: para que parezca anime de verdad hacen
falta sprites hechos por dibujantes.

El juego ya está preparado para usarlos. No hay que tocar nada del juego:

1. **Consigue un pack.** En [itch.io](https://itch.io/game-assets/free/tag-sprites)
   o [OpenGameArt](https://opengameart.org) busca *top down character sprite sheet*
   o *LPC character*. Comprueba la licencia: para publicar el juego necesitas
   CC0, CC-BY o similar (y citar al autor si lo pide).
2. **Guarda la imagen** en `public/sprites/` (p. ej. `public/sprites/naruto.png`).
3. **Descomenta su entrada** en [`src/game/characterSheets.js`](src/game/characterSheets.js)
   y ajusta `frameW` y `frameH` al tamaño de **un** fotograma.

Formatos que entiende (`layout`):

| `layout` | Cómo viene la hoja |
|---|---|
| `rpgmaker` | 4 filas (abajo, izquierda, derecha, arriba) × 3 fotogramas |
| `basic4` | igual pero 4 fotogramas por fila |
| `lpc` | hojas LPC de 64×64; las filas 8–11 son el ciclo de andar |

Cada personaje es independiente: el que tenga imagen la usa y el resto sigue
dibujándose por código. Se puede ir metiendo arte de uno en uno.

## Cómo está organizado

```
src/game/zones.js           mapas por casillas (se construyen por código, con semilla)
src/game/sprites.js         dibujo por código de los personajes (el respaldo)
src/game/spritesheet.js     carga y animación de hojas de sprites reales
src/game/characterSheets.js dónde se conecta el arte real: una entrada por personaje
src/game/engine.js          movimiento, colisiones, IA, combate, niveles
src/game/renderer.js        cámara y pintado (el terreno se cachea una vez por zona)
src/game/progression.js     todo el equilibrio: vida, daño, experiencia, jutsus
src/net/room.js             codigos de sala y enlaces de invitacion
src/net/transport.js        canal por el que hablan los jugadores (MQTT publico)
src/net/multiplayer.js      qué se manda y cada cuánto
```

Todos los personajes pasan por `drawCharacter()`: esa función decide si usa la
hoja de sprites o el dibujo por código. El resto del juego no sabe cuál de las
dos se está usando.

Para ver cómo queda un cambio visual sin abrir el navegador a mano, hay ganchos
de depuración: `window.__game` (estado de la partida) y `window.__zonas`
(el mapa completo de cada zona como canvas).

## Despliegue

```bash
npm run deploy       # build + publica en la rama gh-pages
```
