import { supabase } from '../config/supabase';

// Guardado del progreso.
// Se guarda SIEMPRE en el navegador, y ademas en Supabase si la base de datos
// responde. Asi el juego funciona aunque Supabase este caido o sin configurar,
// y en cuanto vuelve, el progreso se sincroniza solo.
//
// OJO: PostgreSQL pasa todo a minusculas, por eso las columnas son
// 'zoneid', 'posx', 'posy'... y nunca 'zoneId' ni 'posX'.
const TABLE = 'ninja_players';
const localKey = (uid) => 'ninja-save-' + uid;

// Si Supabase falla una vez, se deja de intentar durante un rato para no
// llenar la consola de errores ni frenar el guardado local.
let remoteDisabledUntil = 0;
const remoteAvailable = () => Date.now() > remoteDisabledUntil;
const disableRemote = () => { remoteDisabledUntil = Date.now() + 60000; };

function readLocal(uid) {
  try {
    const raw = localStorage.getItem(localKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(uid, name, data) {
  try {
    localStorage.setItem(localKey(uid), JSON.stringify({ name, ...data }));
  } catch {
    // Sin espacio o modo privado: no es critico
  }
}

// De la fila de la base de datos (minusculas) al formato de la app
const fromRow = (d) => ({
  name: d.name,
  level: d.level ?? 1,
  xp: d.xp ?? 0,
  hp: d.hp ?? 100,
  chakra: d.chakra ?? 50,
  zoneId: d.zoneid ?? 'konoha',
  x: d.posx ?? null,
  y: d.posy ?? null,
  outfit: d.outfit ?? 'naruto'
});

export async function loadPlayer(uid) {
  const local = readLocal(uid);

  if (remoteAvailable()) {
    try {
      const { data, error } = await supabase.from(TABLE).select('*').eq('userid', uid).maybeSingle();
      if (error) throw error;
      if (data) {
        const remote = fromRow(data);
        // Gana el que tenga mas progreso: evita perder una partida jugada sin conexion
        if (!local || remote.level > local.level || (remote.level === local.level && remote.xp >= local.xp)) {
          return remote;
        }
        return fromRow(local);
      }
    } catch (e) {
      console.warn('Supabase no disponible, se usa el guardado local:', e.message);
      disableRemote();
    }
  }

  return local ? fromRow({ ...local }) : null;
}

export async function savePlayer(uid, name, data) {
  writeLocal(uid, name, data);

  if (!remoteAvailable()) return false;

  try {
    const { error } = await supabase.from(TABLE).upsert(
      { userid: uid, name, ...data, updatedat: new Date().toISOString() },
      { onConflict: 'userid' }
    );
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('No se pudo guardar en Supabase:', e.message);
    disableRemote();
    return false;
  }
}
