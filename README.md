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
> Mientras no se apunte a un proyecto nuevo, el juego funciona en modo local:
> se puede jugar entero, pero **no hay multijugador** y el progreso no se
> sincroniza entre dispositivos. Hay que actualizar `VITE_SUPABASE_URL`,
> `VITE_SUPABASE_ANON_KEY` y `SUPABASE_DB_PASSWORD` en `.env`, y el
> `project-ref` del pooler en `db-migrate-correct.js`.

## Cómo está organizado

```
src/game/zones.js       mapas por casillas (se construyen por código, con semilla)
src/game/sprites.js     personajes dibujados a mano en canvas, sin imágenes
src/game/engine.js      movimiento, colisiones, IA, combate, niveles
src/game/renderer.js    cámara y pintado (el terreno se cachea una vez por zona)
src/game/progression.js todo el equilibrio: vida, daño, experiencia, jutsus
src/net/multiplayer.js  Supabase Realtime (presence + broadcast)
```

Para meter sprites de verdad más adelante solo hay que cambiar `sprites.js`:
el resto del juego no sabe cómo se dibujan los personajes.

## Despliegue

```bash
npm run deploy       # build + publica en la rama gh-pages
```
