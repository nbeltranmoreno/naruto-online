// Medidas base del juego. Todo el mundo se mide en pixeles; TILE convierte a casillas.
// La casilla es grande (48px) a proposito: deja sitio para dibujar los personajes
// con detalle en vez de con cuatro cuadrados.
export const TILE = 48;

// Resolucion logica del canvas (se escala a la ventana manteniendo proporcion).
// Cuanto menor sea, mas cerca se ve todo: con 960x540 y casillas de 48px
// caben 20 casillas de ancho y los personajes se ven grandes.
export const VIEW_W = 960;
export const VIEW_H = 540;

// Movimiento del jugador en pixeles por segundo
export const WALK_SPEED = 200;
export const RUN_SPEED = 310;

// Caja de colision del personaje (mas estrecha que el sprite: se siente mejor al pasar entre arboles)
export const BODY_W = 26;
export const BODY_H = 18;

// Altura del personaje en pixeles, usada para colocar barras y nombres encima
export const CHAR_H = 62;

// Cada cuanto se manda nuestra posicion a los amigos (ms)
export const NET_TICK = 100;
// Si un amigo no manda nada en este tiempo, se considera desconectado (ms)
export const NET_TIMEOUT = 8000;
// Cada cuanto se guarda el progreso en Supabase (ms)
export const SAVE_TICK = 15000;
