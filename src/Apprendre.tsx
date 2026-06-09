import { useEffect, useRef, useState } from 'react';
import deptsData from './depts.json';
import centroidsData from './dept-centroids.json';

type Dept = { nom: string; region: string; prefecture: string };
const depts = deptsData as Record<string, Dept>;
const centroids = centroidsData as Record<string, [number, number]>;

// ordre numérique : 01..19, 2A, 2B, 21..95
const val = (c: string) => (c === '2A' ? 20.1 : c === '2B' ? 20.2 : parseInt(c, 10));
const ORDER = Object.keys(depts).sort((a, b) => val(a) - val(b));

export default function Apprendre() {
  const [svg, setSvg] = useState<string | null>(null);
  const [rivers, setRivers] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const B = import.meta.env.BASE_URL;
    fetch(`${B}layers/departements.svg`).then((r) => r.text()).then(setSvg);
    fetch(`${B}layers/fleuves.svg`).then((r) => r.text()).then(setRivers);
  }, []);

  const go = (n: number) => setI(Math.max(0, Math.min(ORDER.length - 1, n)));

  // surbrillance : déjà vus en vert, courant en ambre
  useEffect(() => {
    const root = mapRef.current; if (!root || !svg) return;
    root.querySelectorAll('.learn-seen,.learn-current').forEach((e) => e.classList.remove('learn-seen', 'learn-current'));
    ORDER.forEach((c, k) => {
      const cls = k < i ? 'learn-seen' : k === i ? 'learn-current' : null;
      if (cls) root.querySelectorAll(`.dep[data-dep="${c}"]`).forEach((e) => e.classList.add(cls));
    });
  }, [i, svg]);

  // clavier ← →
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { setAuto(false); go(iRef.current + 1); }
      if (e.key === 'ArrowLeft') { setAuto(false); go(iRef.current - 1); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  const iRef = useRef(i); iRef.current = i;

  // lecture auto
  useEffect(() => {
    if (!auto) return;
    if (i >= ORDER.length - 1) { setAuto(false); return; }
    const id = setTimeout(() => setI((x) => x + 1), 1600);
    return () => clearTimeout(id);
  }, [auto, i]);

  const onClick = (e: React.MouseEvent) => {
    const el = (e.target as Element).closest('.dep'); if (!el) return;
    const k = ORDER.indexOf(el.getAttribute('data-dep')!);
    if (k >= 0) { setAuto(false); setI(k); }
  };

  const code = ORDER[i];
  const d = depts[code];

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* carte + numéros */}
        <div className="border border-slate-200 rounded-xl bg-slate-50 p-2">
          <div ref={mapRef} className="map-stack learn" onClick={onClick}>
            {svg && <div className="layerwrap base" dangerouslySetInnerHTML={{ __html: svg }} />}
            {svg && rivers && (
              <div className="layerwrap overlay riveroverlay" dangerouslySetInnerHTML={{ __html: rivers }} />
            )}
            {svg && (
              <div className="layerwrap overlay">
                <svg className="layer" viewBox="0 0 630 651" xmlns="http://www.w3.org/2000/svg">
                  {ORDER.map((c, k) =>
                    centroids[c] ? (
                      <text key={c} className={`dept-num ${k === i ? 'cur' : ''}`} x={centroids[c][0]} y={centroids[c][1]}>{c}</text>
                    ) : null,
                  )}
                </svg>
              </div>
            )}
            {!svg && <div className="p-10 text-center text-slate-400">Chargement…</div>}
          </div>
        </div>

        {/* panneau */}
        <aside className="lg:sticky lg:top-4 space-y-3">
          {/* progression */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{i + 1} / {ORDER.length}</span>
              <span>{Math.round(((i + 1) / ORDER.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${((i + 1) / ORDER.length) * 100}%` }} />
            </div>
          </div>

          {/* fiche du département courant */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-amber-500 leading-none">{code}</span>
              <span className="text-xl font-bold text-slate-800">{d.nom}</span>
            </div>
            <p className="text-sm text-slate-600 mt-2">Région : {d.region}</p>
            <p className="text-sm text-slate-600">Préfecture : {d.prefecture}</p>
          </div>

          {/* navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => { setAuto(false); go(i - 1); }} disabled={i === 0}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 disabled:opacity-40">◀</button>
            <button onClick={() => { setAuto(false); go(i + 1); }} disabled={i === ORDER.length - 1}
              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40">Suivant ▶</button>
            <button onClick={() => setAuto((a) => !a)} title="Lecture automatique"
              className={`px-3 py-2 rounded-lg font-medium ${auto ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {auto ? '⏸' : '▶'} Auto
            </button>
          </div>
          <button onClick={() => { setAuto(false); setI(0); }} className="text-sm text-slate-500 hover:text-slate-800 underline">↺ Recommencer</button>

          <p className="text-xs text-slate-400">Flèches ← → au clavier, ou clique un département pour y aller.</p>
        </aside>
      </div>
    </div>
  );
}
