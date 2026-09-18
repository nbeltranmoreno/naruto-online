import { useEffect, useRef, useState } from 'react';
import { createGame } from '../game/engine';
import { createRenderer } from '../game/renderer';
import { createInput } from '../game/input';
import { connectMultiplayer } from '../net/multiplayer';
import { savePlayer } from '../hooks/usePlayerSave';
import { SAVE_TICK } from '../game/constants';

function Bar({ value, max, color, label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-44">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-300 mb-0.5">
        <span>{label}</span>
        <span>{Math.round(value)} / {max}</span>
      </div>
      <div className="h-2.5 rounded bg-slate-900/80 ring-1 ring-black/40 overflow-hidden">
        <div className="h-full transition-[width] duration-150" style={{ width: pct + '%', background: color }} />
      </div>
    </div>
  );
}

export default function Game({ session, onExit }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const netRef = useRef(null);
  const [hud, setHud] = useState(null);
  const [online, setOnline] = useState(1);
  const [netOk, setNetOk] = useState(false);

  useEffect(() => {
    const input = createInput();

    const game = createGame({
      name: session.name,
      outfit: session.outfit,
      level: session.save?.level ?? 1,
      xp: session.save?.xp ?? 0,
      zoneId: session.save?.zoneId ?? 'konoha',
      x: session.save?.x ?? null,
      y: session.save?.y ?? null,
      input,
      onAttackBroadcast: (action) => netRef.current?.sendAttack(action)
    });
    gameRef.current = game;
    // Gancho de depuracion: deja inspeccionar el estado desde la consola
    if (typeof window !== 'undefined') window.__game = game;

    const renderer = createRenderer(canvasRef.current);

    // Conexion con los demas jugadores
    netRef.current = connectMultiplayer({
      uid: session.uid,
      game,
      onRoster: (n) => setOnline(n)
    });

    // Bucle principal. dt se limita a 100ms para que al volver de otra pestana
    // no se procese un salto enorme de tiempo de golpe.
    let raf = 0;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      game.update(dt);
      renderer.render(game.state);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // La interfaz se refresca 10 veces por segundo, no en cada fotograma
    const hudTimer = setInterval(() => {
      setHud(game.hud());
      setNetOk(netRef.current?.isConnected() ?? false);
    }, 100);

    // Guardado periodico del progreso
    const saveTimer = setInterval(() => {
      savePlayer(session.uid, session.name, game.saveData());
    }, SAVE_TICK);

    // Guardar tambien al cerrar la pestana
    const onUnload = () => savePlayer(session.uid, session.name, game.saveData());
    window.addEventListener('beforeunload', onUnload);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(hudTimer);
      clearInterval(saveTimer);
      window.removeEventListener('beforeunload', onUnload);
      input.destroy();
      netRef.current?.disconnect();
      savePlayer(session.uid, session.name, game.saveData());
    };
  }, [session]);

  const xpPct = hud ? Math.min(100, (hud.xp / hud.xpNext) * 100) : 0;

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-3 gap-3">
      <div className="relative w-full max-w-[1000px]">
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded-xl ring-1 ring-slate-700 shadow-2xl bg-slate-950"
        />

        {/* Panel de estado, arriba a la izquierda */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
          <div className="flex items-center gap-3 rounded-lg bg-slate-950/70 backdrop-blur px-3 py-2 ring-1 ring-slate-700">
            <div className="text-center px-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Nivel</div>
              <div className="text-2xl font-bold leading-none text-amber-300">{hud?.level ?? 1}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Bar label="Vida" value={hud?.hp ?? 0} max={hud?.maxHp ?? 100} color="#ef4444" />
              <Bar label="Chakra" value={hud?.chakra ?? 0} max={hud?.maxChakra ?? 50} color="#38bdf8" />
              <div className="w-44">
                <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-300 mb-0.5">
                  <span>Exp</span>
                  <span>{hud?.xp ?? 0} / {hud?.xpNext ?? 30}</span>
                </div>
                <div className="h-1.5 rounded bg-slate-900/80 overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: xpPct + '%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zona y jugadores conectados, arriba a la derecha */}
        <div className="absolute top-3 right-3 text-right pointer-events-none">
          <div className="rounded-lg bg-slate-950/70 backdrop-blur px-3 py-2 ring-1 ring-slate-700">
            <div className="text-sm font-semibold text-cyan-200">{hud?.zoneName ?? '...'}</div>
            <div className="text-[11px] text-slate-400">
              {hud?.safe ? 'Zona segura' : 'Zona hostil'}
            </div>
            <div className="text-[11px] mt-1">
              {netOk ? (
                <span className="text-slate-300">
                  {online} conectado{online === 1 ? '' : 's'}
                  {hud?.online ? ` · ${hud.online} aquí` : ''}
                </span>
              ) : (
                <span className="text-amber-400">Sin conexión · modo local</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">Derrotados: {hud?.kills ?? 0}</div>
          </div>
        </div>

        {/* Jutsus, abajo */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
          {[1, 2, 3].map((slot) => {
            const j = hud?.jutsus.find((x) => x.slot === slot);
            const active = hud?.slot === slot;
            return (
              <div
                key={slot}
                className={
                  'w-24 rounded-lg px-2 py-1.5 text-center ring-1 backdrop-blur ' +
                  (j
                    ? active
                      ? 'bg-cyan-500/25 ring-cyan-400'
                      : 'bg-slate-950/70 ring-slate-700'
                    : 'bg-slate-950/50 ring-slate-800 opacity-45')
                }
              >
                <div className="text-[10px] text-slate-400">[{slot}]</div>
                <div className="text-[11px] font-semibold leading-tight text-slate-100">
                  {j ? j.name : 'Bloqueado'}
                </div>
                {j && <div className="text-[10px] text-sky-300">{j.cost} chakra</div>}
              </div>
            );
          })}
        </div>

        {/* Pantalla de muerte */}
        {hud?.dead && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-slate-950/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-4xl font-black text-red-400 mb-2">Has caído</div>
              <div className="text-slate-300">
                Vuelves a la aldea en {Math.ceil(hud.respawnT)}...
              </div>
              <div className="text-xs text-slate-500 mt-2">Pierdes el 10% de la experiencia del nivel</div>
            </div>
          </div>
        )}
      </div>

      {/* Controles y salir */}
      <div className="w-full max-w-[1000px] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span><b className="text-slate-200">WASD</b> moverse</span>
          <span><b className="text-slate-200">Shift</b> correr</span>
          <span><b className="text-slate-200">Espacio / J</b> golpear</span>
          <span><b className="text-slate-200">1 2 3</b> jutsu</span>
          <span><b className="text-slate-200">K</b> repetir jutsu</span>
          <span className="text-cyan-300">Los círculos brillantes son portales</span>
        </div>
        <button
          onClick={onExit}
          className="rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-slate-200 ring-1 ring-slate-600"
        >
          Salir
        </button>
      </div>
    </div>
  );
}
