import { useEffect, useMemo, useRef, useState } from 'react';
import deptsData from './depts.json';

type Dept = { nom: string; region: string; prefecture: string };
const depts = deptsData as Record<string, Dept>;

type Mode = 'departements' | 'regions' | 'prefectures' | 'fleuves';

const MODES: { id: Mode; label: string }[] = [
  { id: 'departements', label: 'Départements' },
  { id: 'regions', label: 'Régions' },
  { id: 'prefectures', label: 'Préfectures' },
  { id: 'fleuves', label: 'Fleuves' },
];

// couche -> fichier ; la base est toujours chargée
const LAYER_FILE: Record<string, string> = {
  departements: '/layers/departements.svg',
  regions: '/layers/regions.svg',
  prefectures: '/layers/prefectures.svg',
  fleuves: '/layers/fleuves.svg',
};

// fleuves principaux (info panneau, mode fleuves)
const FLEUVES = [
  { nom: 'Loire', longueur: 1012, embouchure: 'Océan Atlantique' },
  { nom: 'Seine', longueur: 777, embouchure: 'Manche' },
  { nom: 'Rhône', longueur: 812, embouchure: 'Méditerranée' },
  { nom: 'Garonne', longueur: 647, embouchure: 'Océan Atlantique' },
  { nom: 'Rhin', longueur: 1230, embouchure: 'Mer du Nord' },
];

type Sel = { type: Mode; code?: string; region?: string } | null;

const isMode = (v: string): v is Mode => MODES.some((m) => m.id === v);

export default function CarteFrance() {
  const [mode, setMode] = useState<Mode>(() => {
    const h = (typeof location !== 'undefined' ? location.hash.slice(1) : '');
    return isMode(h) ? h : 'departements';
  });
  // URL <-> état : on écrit via replaceState (pas d'empilement d'historique),
  // et on réagit à Précédent/Suivant / édition manuelle du hash.
  useEffect(() => {
    const target = `#${mode}`;
    if (typeof location !== 'undefined' && location.hash !== target) {
      history.replaceState(null, '', target);
    }
  }, [mode]);
  useEffect(() => {
    const onHash = () => { const h = location.hash.slice(1); if (isMode(h)) setMode(h); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const [layers, setLayers] = useState<Record<string, string>>({});
  const [hover, setHover] = useState<Sel>(null);
  const [pin, setPin] = useState<Sel>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const hoverKey = useRef<string>('');
  const loadingRef = useRef<Set<string>>(new Set());
  const riverRef = useRef<Element | null>(null);

  // surbrillance d'un fleuve survolé (purement visuel, hors état React)
  const toggleRiver = (p: Element | null) => {
    if (p === riverRef.current) return;
    riverRef.current?.classList.remove('is-hl');
    const root = stackRef.current;
    riverRef.current = p && root?.contains(p) ? p : null;
    riverRef.current?.classList.add('is-hl');
  };
  // ne déclenche un re-rendu que si la cible survolée change réellement
  const setHoverIfNew = (s: Sel) => {
    const k = s ? `${s.type}:${s.code ?? ''}:${s.region ?? ''}` : '';
    if (k === hoverKey.current) return;
    hoverKey.current = k;
    setHover(s);
  };

  // regroupement régions -> départements
  const regions = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const [code, d] of Object.entries(depts)) (m[d.region] ||= []).push(code);
    for (const r in m) m[r].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
    return m;
  }, []);

  // chargement paresseux d'une couche (dédup. des requêtes en vol)
  const ensureLayer = (id: string) => {
    if (layers[id] || loadingRef.current.has(id)) return;
    loadingRef.current.add(id);
    fetch(LAYER_FILE[id])
      .then((r) => r.text())
      .then((svg) => setLayers((p) => ({ ...p, [id]: svg })))
      .catch(() => loadingRef.current.delete(id));
  };

  useEffect(() => { ensureLayer('departements'); }, []);
  useEffect(() => {
    if (mode === 'regions') ensureLayer('regions');
    if (mode === 'prefectures') ensureLayer('prefectures');
    if (mode === 'fleuves') ensureLayer('fleuves');
  }, [mode]);

  // changement de mode : on réinitialise survol/sélection
  useEffect(() => { setHover(null); setPin(null); }, [mode]);

  // ---- surbrillance (manipulation directe du DOM injecté) ----
  useEffect(() => {
    const root = stackRef.current;
    if (!root) return;
    root.querySelectorAll('.is-hl, .reg-hl, .is-pin').forEach((el) =>
      el.classList.remove('is-hl', 'reg-hl', 'is-pin'),
    );
    const paint = (s: Sel, pinned: boolean) => {
      if (!s) return;
      if (s.type === 'regions' && s.region) {
        root.querySelectorAll(`.dep[data-region="${cssEsc(s.region)}"]`).forEach((el) =>
          el.classList.add('reg-hl'),
        );
      } else if (s.type === 'prefectures' && s.code) {
        root.querySelectorAll(`.pref[data-dep="${s.code}"]`).forEach((el) =>
          el.classList.add(pinned ? 'is-pin' : 'is-hl'),
        );
      } else if (s.type === 'departements' && s.code) {
        root.querySelectorAll(`.dep[data-dep="${s.code}"]`).forEach((el) =>
          el.classList.add(pinned ? 'is-pin' : 'is-hl'),
        );
      }
    };
    paint(pin, true);
    if (!pin) paint(hover, false);
  }, [hover, pin, mode, layers]);

  // ---- délégation des événements souris ----
  const onMove = (e: React.MouseEvent) => {
    const t = e.target as Element;
    if (mode === 'prefectures') {
      const c = t.closest('.pref');
      setHoverIfNew(c ? { type: 'prefectures', code: c.getAttribute('data-dep')! } : null);
    } else if (mode === 'fleuves') {
      // pas d'identité par fleuve : surbrillance visuelle seulement
      toggleRiver(t.closest('.rivers path'));
    } else {
      const c = t.closest('.dep');
      if (!c) return setHoverIfNew(null);
      const code = c.getAttribute('data-dep')!;
      setHoverIfNew(mode === 'regions'
        ? { type: 'regions', region: depts[code]?.region }
        : { type: 'departements', code });
    }
  };
  const onLeave = () => { setHoverIfNew(null); toggleRiver(null); };
  const onClick = (e: React.MouseEvent) => {
    const t = e.target as Element;
    if (mode === 'fleuves') return;
    const sel: Sel = mode === 'prefectures'
      ? (t.closest('.pref') ? { type: 'prefectures', code: t.closest('.pref')!.getAttribute('data-dep')! } : null)
      : (() => {
          const c = t.closest('.dep'); if (!c) return null;
          const code = c.getAttribute('data-dep')!;
          return mode === 'regions'
            ? { type: 'regions', region: depts[code]?.region }
            : { type: 'departements', code };
        })();
    setPin((prev) => (sameSel(prev, sel) ? null : sel));
  };

  const active = pin ?? hover;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-1 text-slate-800">Carte de France interactive</h1>
      <p className="text-sm text-slate-500 mb-4">
        Outil d'apprentissage de la géographie — survolez la carte, cliquez pour épingler.
      </p>

      {/* sélecteur de mode */}
      <div className="flex flex-wrap gap-2 mb-4">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              mode === m.id
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* carte (le cadre porte le padding ; la pile reste sans padding pour
            que la couche de base et les overlays partagent exactement la même boîte) */}
        <div className="border border-slate-200 rounded-xl bg-slate-50 p-2">
          <div
            ref={stackRef}
            className={`map-stack mode-${mode}`}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            onClick={onClick}
          >
            {layers.departements && (
              <div className="layerwrap base" dangerouslySetInnerHTML={{ __html: layers.departements }} />
            )}
            {mode === 'regions' && layers.regions && (
              <div className="layerwrap overlay" dangerouslySetInnerHTML={{ __html: layers.regions }} />
            )}
            {mode === 'fleuves' && layers.fleuves && (
              <div className="layerwrap overlay" dangerouslySetInnerHTML={{ __html: layers.fleuves }} />
            )}
            {mode === 'prefectures' && layers.prefectures && (
              <div className="layerwrap overlay" dangerouslySetInnerHTML={{ __html: layers.prefectures }} />
            )}
            {!layers.departements && <div className="p-10 text-center text-slate-400">Chargement…</div>}
          </div>
        </div>

        {/* panneau latéral */}
        <aside className="lg:sticky lg:top-4">
          <InfoPanel mode={mode} active={active} regions={regions} pinned={!!pin} />
        </aside>
      </div>
    </div>
  );
}

function InfoPanel({
  mode, active, regions, pinned,
}: { mode: Mode; active: Sel; regions: Record<string, string[]>; pinned: boolean }) {
  const card = 'bg-white border border-slate-200 rounded-xl p-4 shadow-sm';

  if (mode === 'fleuves') {
    return (
      <div className={card}>
        <h2 className="font-bold text-lg mb-2 text-slate-800">Principaux fleuves</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-1">Fleuve</th><th>km</th><th>Embouchure</th>
            </tr>
          </thead>
          <tbody>
            {FLEUVES.map((f) => (
              <tr key={f.nom} className="border-b border-slate-100">
                <td className="py-1 font-medium">{f.nom}</td>
                <td>{f.longueur}</td>
                <td className="text-slate-600">{f.embouchure}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 mt-3">Survolez un cours d'eau pour le mettre en évidence.</p>
      </div>
    );
  }

  if (!active) {
    return (
      <div className={`${card} text-slate-400 text-sm`}>
        {mode === 'regions' ? 'Survolez une région.'
          : mode === 'prefectures' ? 'Survolez une préfecture.'
          : 'Survolez un département.'}
      </div>
    );
  }

  if (active.type === 'regions' && active.region) {
    const list = regions[active.region] || [];
    return (
      <div className={card}>
        <Badge pinned={pinned} />
        <h2 className="font-bold text-lg text-slate-800">{active.region}</h2>
        <p className="text-sm text-slate-500 mb-2">{list.length} départements</p>
        <ul className="text-sm grid grid-cols-2 gap-x-3 gap-y-0.5">
          {list.map((c) => (
            <li key={c}><span className="text-slate-400">{c}</span> {depts[c].nom}</li>
          ))}
        </ul>
      </div>
    );
  }

  const code = active.code!;
  const d = depts[code];
  if (!d) return <div className={card}>—</div>;

  if (active.type === 'prefectures') {
    return (
      <div className={card}>
        <Badge pinned={pinned} />
        <h2 className="font-bold text-lg text-slate-800">{d.prefecture}</h2>
        <p className="text-sm text-slate-600">Préfecture de <strong>{d.nom}</strong> ({code})</p>
        <p className="text-sm text-slate-600">Région : {d.region}</p>
      </div>
    );
  }

  // département
  return (
    <div className={card}>
      <Badge pinned={pinned} />
      <h2 className="font-bold text-lg text-slate-800">{d.nom} <span className="text-slate-400">({code})</span></h2>
      <p className="text-sm text-slate-600">Région : {d.region}</p>
      <p className="text-sm text-slate-600">Préfecture : {d.prefecture}</p>
    </div>
  );
}

const Badge = ({ pinned }: { pinned: boolean }) =>
  pinned ? <span className="inline-block text-[10px] uppercase tracking-wide text-blue-600 bg-blue-50 px-2 py-0.5 rounded mb-1">épinglé</span> : null;

// utilitaires
function cssEsc(s: string) { return s.replace(/"/g, '\\"'); }
function sameSel(a: Sel, b: Sel) {
  if (!a || !b) return a === b;
  return a.type === b.type && a.code === b.code && a.region === b.region;
}
