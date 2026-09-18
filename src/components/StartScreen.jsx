import { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { drawNinja, OUTFITS } from '../game/sprites';
import { crearCodigo, normalizarCodigo, codigoValido, codigoDeLaUrl, enlaceDeSala } from '../net/room';

const PLAYABLE = ['itachi', 'sasuke', 'sakura', 'kakashi'];

// Direccion publica del juego: es la que hay que pasarle a los amigos.
// Se escribe fija a proposito y no se saca de window.location, porque cuando
// se prueba en el ordenador la direccion es localhost y a un amigo no le sirve.
const ENLACE_PUBLICO = 'https://nbeltranmoreno.github.io/naruto-online/';

// Vista previa del personaje: se dibuja con el mismo codigo que usa el juego
function OutfitPreview({ outfit, selected, onClick }) {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    let raf = 0;
    let t = 0;
    const loop = () => {
      t += 2.4;
      ctx.clearRect(0, 0, 96, 120);
      ctx.save();
      ctx.scale(1.15, 1.15);
      drawNinja(ctx, 42, 100, { dir: 'down', outfit, anim: t, moving: true });
      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [outfit]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-xl px-2 pt-2 pb-1.5 ring-2 transition ' +
        (selected ? 'bg-cyan-500/20 ring-cyan-400' : 'bg-slate-800/60 ring-slate-700 hover:ring-slate-500')
      }
    >
      <canvas ref={ref} width={96} height={120} className="mx-auto w-full h-auto" />
      <div className="text-[11px] mt-1 text-slate-200">{OUTFITS[outfit].name}</div>
    </button>
  );
}

export default function StartScreen({ user, loadingSave, onPlay }) {
  const [name, setName] = useState(() => localStorage.getItem('ninja-name') || '');
  const [outfit, setOutfit] = useState(() => localStorage.getItem('ninja-outfit') || 'itachi');
  const [authError, setAuthError] = useState('');
  const [copiado, setCopiado] = useState(false);
  const enlaceRef = useRef(null);

  // Codigo de sala: manda el de la direccion (te han invitado), y si no, el
  // ultimo que usaste; y si tampoco, se crea uno nuevo.
  const [invitado] = useState(() => codigoDeLaUrl());
  const [sala, setSala] = useState(
    () => invitado || localStorage.getItem('ninja-sala') || crearCodigo()
  );
  const salaOk = codigoValido(sala);
  const enlaceInvitacion = salaOk ? enlaceDeSala(ENLACE_PUBLICO, sala) : ENLACE_PUBLICO;

  useEffect(() => {
    if (!name && user?.displayName) setName(user.displayName);
  }, [user]);

  // Copiar el enlace al portapapeles. Si el navegador no deja (pasa cuando la
  // pagina no va por https), se selecciona el texto para copiarlo a mano.
  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(enlaceInvitacion);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      enlaceRef.current?.select();
    }
  };

  const play = () => {
    if (!salaOk) return;
    const finalName = (name.trim() || 'Ninja').slice(0, 14);
    localStorage.setItem('ninja-name', finalName);
    localStorage.setItem('ninja-outfit', outfit);
    localStorage.setItem('ninja-sala', sala);
    onPlay({ name: finalName, outfit, sala });
  };

  const google = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      setAuthError('No se pudo entrar con Google: ' + e.code);
    }
  };

  return (
    <div className="h-full overflow-y-auto grid place-items-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900/80 ring-1 ring-slate-700 p-6 shadow-2xl">
        <h1 className="text-3xl font-black tracking-tight text-amber-300">NINJA ONLINE</h1>
        <p className="text-sm text-slate-400 mt-1">
          Explora, pelea y sube de nivel. Tus amigos aparecen en el mismo mapa que tú.
        </p>

        <label className="block mt-6 text-xs uppercase tracking-wide text-slate-400">
          Nombre del ninja
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && play()}
          maxLength={14}
          placeholder="Tu nombre"
          className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 ring-1 ring-slate-600 focus:ring-cyan-400 outline-none"
        />

        <div className="mt-5 text-xs uppercase tracking-wide text-slate-400">Personaje</div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {PLAYABLE.map((o) => (
            <OutfitPreview key={o} outfit={o} selected={outfit === o} onClick={() => setOutfit(o)} />
          ))}
        </div>

        {/* Sala: quien entre con el mismo codigo juega en el mismo mundo */}
        <div className="mt-5 rounded-lg bg-slate-800/50 ring-1 ring-slate-700 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Código de sala
            </span>
            {!invitado && (
              <button
                type="button"
                onClick={() => setSala(crearCodigo())}
                className="text-[11px] text-cyan-300 hover:text-cyan-200 underline"
              >
                Crear otro
              </button>
            )}
          </div>

          <input
            value={sala}
            onChange={(e) => setSala(normalizarCodigo(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && play()}
            placeholder="ABC12"
            spellCheck={false}
            className={
              'mt-2 w-full rounded-md bg-slate-950/70 px-3 py-2.5 text-center text-2xl font-black tracking-[0.35em] text-amber-300 ring-1 outline-none ' +
              (salaOk ? 'ring-slate-600 focus:ring-cyan-400' : 'ring-red-500/70')
            }
          />

          <div className="mt-2 text-[11px] text-slate-500">
            {invitado
              ? 'Te han invitado a esta sala. Pulsa Jugar para entrar.'
              : salaOk
                ? 'Quien entre con este mismo código juega contigo en el mismo mundo. Escribe el de un amigo para unirte al suyo.'
                : 'El código son 5 caracteres. No se usan O ni 0, ni I ni 1, para no confundirlos.'}
          </div>
        </div>

        <button
          onClick={play}
          disabled={loadingSave || !salaOk}
          className="mt-4 w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-4 py-3 font-bold text-slate-900"
        >
          {loadingSave ? 'Cargando partida...' : 'Jugar'}
        </button>

        {/* Enlace de invitacion: lleva el codigo dentro */}
        <div className="mt-4 rounded-lg bg-slate-800/50 ring-1 ring-slate-700 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Invita a tus amigos
          </div>
          <div className="mt-2 flex gap-2">
            <input
              ref={enlaceRef}
              readOnly
              value={enlaceInvitacion}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 rounded-md bg-slate-950/70 px-2.5 py-2 text-xs text-cyan-200 ring-1 ring-slate-700 outline-none focus:ring-cyan-400"
            />
            <button
              type="button"
              onClick={copiarEnlace}
              className={
                'rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap transition ' +
                (copiado
                  ? 'bg-emerald-500 text-slate-900'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-100')
              }
            >
              {copiado ? '¡Copiado!' : 'Copiar enlace'}
            </button>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Este enlace ya lleva el código dentro: quien lo abra entra directo a tu sala.
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          {user ? (
            <>
              <span className="text-emerald-400">
                Progreso guardado en la cuenta {user.email}
              </span>
              <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-slate-200 underline">
                Salir
              </button>
            </>
          ) : (
            <>
              <span className="text-slate-500">Como invitado el progreso se guarda solo en este navegador</span>
              <button onClick={google} className="text-cyan-300 hover:text-cyan-200 underline whitespace-nowrap ml-3">
                Entrar con Google
              </button>
            </>
          )}
        </div>
        {authError && <div className="mt-2 text-xs text-red-400">{authError}</div>}
      </div>
    </div>
  );
}
