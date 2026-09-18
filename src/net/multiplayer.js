import { supabase } from '../config/supabase';
import { NET_TICK } from '../game/constants';

// Multijugador con Supabase Realtime. No hace falta montar ningun servidor:
// todos los jugadores se suscriben al mismo canal y se mandan su posicion.
//   - "presence" lleva la lista de quien esta conectado (y avisa al salir)
//   - "broadcast" manda la posicion varias veces por segundo (no se guarda en BD)
const CHANNEL = 'ninja-world';

export function connectMultiplayer({ uid, game, onRoster = () => {} }) {
  let channel = null;
  let timer = null;
  let connected = false;
  let lastSent = '';

  channel = supabase.channel(CHANNEL, {
    config: {
      broadcast: { self: false },
      presence: { key: uid }
    }
  });

  // Posicion de otro jugador
  channel.on('broadcast', { event: 'state' }, ({ payload }) => {
    if (!payload || payload.uid === uid) return;
    game.applyRemote(payload.uid, payload);
  });

  // Otro jugador ha atacado: solo sirve para ver su animacion
  channel.on('broadcast', { event: 'attack' }, ({ payload }) => {
    if (!payload || payload.uid === uid) return;
    game.remoteAttack(payload.uid);
  });

  channel.on('presence', { event: 'sync' }, () => {
    const st = channel.presenceState();
    onRoster(Object.keys(st).length);
  });

  channel.on('presence', { event: 'leave' }, ({ key }) => {
    game.removeRemote(key);
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      connected = true;
      await channel.track({ uid, name: game.state.player.name, at: Date.now() });

      // Enviar nuestra posicion a ritmo fijo. Si no nos hemos movido ni cambiado
      // nada, se manda igualmente de vez en cuando para que no nos den por caidos.
      let idleTicks = 0;
      timer = setInterval(() => {
        const snap = game.netSnapshot();
        const key = JSON.stringify(snap);
        if (key === lastSent && idleTicks < 20) {
          idleTicks++;
          return;
        }
        idleTicks = 0;
        lastSent = key;
        channel.send({ type: 'broadcast', event: 'state', payload: { uid, ...snap } });
      }, NET_TICK);
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      connected = false;
    }
  });

  return {
    isConnected: () => connected,
    // Se llama cuando el jugador local ataca, para que los demas lo vean
    sendAttack: () => {
      if (connected) channel.send({ type: 'broadcast', event: 'attack', payload: { uid } });
    },
    disconnect: () => {
      if (timer) clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
      connected = false;
    }
  };
}
