import { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { drawNinja, OUTFITS } from '../game/sprites';

const PLAYABLE = ['naruto', 'sasuke', 'sakura', 'kakashi'];

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
  const [outfit, setOutfit] = useState(() => localStorage.getItem('ninja-outfit') || 'naruto');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!name && user?.displayName) setName(user.displayName);
  }, [user]);

  const play = () => {
    const finalName = (name.trim() || 'Ninja').slice(0, 14);
    localStorage.setItem('ninja-name', finalName);
    localStorage.setItem('ninja-outfit', outfit);
    onPlay({ name: finalName, outfit });
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
    <div className="min-h-full grid place-items-center p-6">
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

        <button
          onClick={play}
          disabled={loadingSave}
          className="mt-6 w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-4 py-3 font-bold text-slate-900"
        >
          {loadingSave ? 'Cargando partida...' : 'Jugar'}
        </button>

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
