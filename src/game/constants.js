// Medidas base del juego. Todo el mundo se mide en pixeles; TILE convierte a casillas.
export const TILE = 32;

// Resolucion logica del canvas (se escala a la ventana manteniendo proporcion)
export const VIEW_W = 960;
export const VIEW_H = 540;

// Movimiento del jugador en pixeles por segundo
export const WALK_SPEED = 135;
export const RUN_SPEED = 210;

// Caja de colision del personaje (mas estrecha que el sprite: se siente mejor al pasar entre arboles)
export const BODY_W = 18;
export const BODY_H = 14;

// Cada cuanto se manda nuestra posicion a los amigos (ms)
export const NET_TICK = 100;
// Si un amigo no manda nada en este tiempo, se considera desconectado (ms)
export const NET_TIMEOUT = 8000;
// Cada cuanto se guarda el progreso en Supabase (ms)
export const SAVE_TICK = 15000;
