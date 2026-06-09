import { useEffect, useMemo, useRef, useState } from 'react';
import deptsData from './depts.json';

type Dept = { nom: string; region: string; prefecture: string };
const depts = deptsData as Record<string, Dept>;
const CODES = Object.keys(depts).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
const REGIONS = [...new Set(CODES.map((c) => depts[c].region))].sort((a, b) => a.localeCompare(b, 'fr'));

type Cat = 'dep' | 'reg' | 'pref';
// objets jouables par catégorie après exclusions (codes dép. / noms de région)
type Pool = { dep: string[]; reg: string[]; pref: string[] };
type QType = 'locate' | 'identify';
type Format = 'libre' | 'chrono';

const CAT_LABEL: Record<Cat, string> = { dep: 'Départements', reg: 'Régions', pref: 'Préfectures' };

// ---- utilitaires aléatoires ----
const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
function shuffle<T>(a: T[]): T[] { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
function sample<T>(pool: T[], n: number): T[] { return shuffle(pool).slice(0, n); }
const cssEsc = (s: string) => s.replace(/"/g, '\\"');

type Choice = { key: string; label: string; correct: boolean };
type Question = {
  cat: Cat; qtype: QType;
  code?: string; region?: string;     // cible
  prompt: string;
  answerLabel: string;                 // bonne réponse (récap)
  choices?: Choice[];                  // pour identify
};

// identifie l'entité géographique visée, indépendamment de la catégorie/du type
// (rég. → la région ; dép. & préf. → le code dép.) pour ne pas réinterroger la même cible
const targetKey = (q: Question): string => (q.cat === 'reg' ? `reg:${q.region}` : `code:${q.code}`);

// ---- maîtrise adaptative (répétition espacée) ----
// une « info » = (catégorie, objet, type de question) ; on suit séparément
// savoir LOCALISER et savoir IDENTIFIER un même objet.
type Skill = { p: number; seen: number; ts: number }; // p = maîtrise 0..1, ts = dernière fois (epoch ms)
type Mastery = Record<string, Skill>;
const MAST_KEY = 'fronce.mastery';
const DAY = 86_400_000;
const TAU_DAYS = 12;   // demi-vie de l'oubli : la maîtrise décroît avec le temps
const FLOOR = 0.12;    // poids minimal de tirage : même un objet su retombe parfois
// un bon clic (Localiser) crédite plus qu'un bon QCM (Identifier, 1 chance sur 4)
const ALPHA: Record<QType, number> = { locate: 0.34, identify: 0.18 };
const BETA = 0.45;     // pénalité sur erreur (la maîtrise est multipliée par BETA)

const masteryKey = (cat: Cat, key: string, qtype: QType) => `${cat}:${key}:${qtype}`;
// maîtrise « ressentie » après oubli depuis la dernière révision
function effectiveP(s: Skill | undefined, now: number): number {
  if (!s) return 0;
  return s.p * Math.exp(-((now - s.ts) / DAY) / TAU_DAYS);
}
// tirage pondéré : plus un objet est mal maîtrisé, plus son poids est élevé
function weightedPick(cands: string[], cat: Cat, qtype: QType, mastery: Mastery, now: number): string {
  const weights = cands.map((k) => (1 - effectiveP(mastery[masteryKey(cat, k, qtype)], now)) + FLOOR);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1];
}
// nouvelle valeur de maîtrise après une réponse (décroissance d'abord, puis maj)
function updateSkill(s: Skill | undefined, qtype: QType, correct: boolean, now: number): Skill {
  const p0 = effectiveP(s, now);
  const p = correct ? p0 + (1 - p0) * ALPHA[qtype] : p0 * BETA;
  return { p, seen: (s?.seen ?? 0) + 1, ts: now };
}
function loadMastery(): Mastery {
  try { return JSON.parse(localStorage.getItem(MAST_KEY) || '{}') as Mastery; } catch { return {}; }
}

// génère une question dont la cible diffère de `avoid` (réponse précédente), avec repli
function makeQuestion(cats: Cat[], qtype: QType, pool: Pool, mastery: Mastery, now: number, avoid?: string): Question {
  let q = buildQuestion(cats, qtype, pool, mastery, now);
  for (let i = 0; i < 20 && targetKey(q) === avoid; i++) q = buildQuestion(cats, qtype, pool, mastery, now);
  return q;
}

function buildQuestion(cats: Cat[], qtype: QType, pool: Pool, mastery: Mastery, now: number): Question {
  const cat = rnd(cats);
  if (cat === 'reg') {
    const region = weightedPick(pool.reg, cat, qtype, mastery, now);
    if (qtype === 'locate')
      return { cat, qtype, region, prompt: `Trouve la région : ${region}`, answerLabel: region };
    const choices = shuffle([region, ...sample(pool.reg.filter((r) => r !== region), 3)])
      .map((r) => ({ key: r, label: r, correct: r === region }));
    return { cat, qtype, region, prompt: 'Quelle est cette région (en surbrillance) ?', answerLabel: region, choices };
  }
  if (cat === 'pref') {
    const code = weightedPick(pool.pref, cat, qtype, mastery, now);
    if (qtype === 'locate')
      return { cat, qtype, code, prompt: `Où se trouve ${depts[code].prefecture} ?`, answerLabel: `${depts[code].prefecture} → ${depts[code].nom} (${code})` };
    const choices = shuffle([code, ...sample(pool.pref.filter((c) => c !== code), 3)])
      .map((c) => ({ key: c, label: depts[c].prefecture, correct: c === code }));
    return { cat, qtype, code, prompt: `Quelle est la préfecture de ${depts[code].nom} (${code}) ?`, answerLabel: depts[code].prefecture, choices };
  }
  // dep
  const code = weightedPick(pool.dep, cat, qtype, mastery, now);
  if (qtype === 'locate')
    return { cat, qtype, code, prompt: `Trouve le département : ${depts[code].nom} (${code})`, answerLabel: `${depts[code].nom} (${code})` };
  const choices = shuffle([code, ...sample(pool.dep.filter((c) => c !== code), 3)])
    .map((c) => ({ key: c, label: depts[c].nom, correct: c === code }));
  return { cat, qtype, code, prompt: 'Quel est ce département (en surbrillance) ?', answerLabel: `${depts[code].nom} (${code})`, choices };
}

// ---- exclusions persistées (objets que l'utilisateur connaît déjà) ----
type Excluded = Record<Cat, string[]>;
const EXCL_KEY = 'fronce.exclusions';
const emptyExcl = (): Excluded => ({ dep: [], reg: [], pref: [] });
function loadExcl(): Excluded {
  try {
    const raw = JSON.parse(localStorage.getItem(EXCL_KEY) || '{}');
    return { dep: raw.dep ?? [], reg: raw.reg ?? [], pref: raw.pref ?? [] };
  } catch { return emptyExcl(); }
}

type Result = { correct: boolean; pickedDep?: string; pickedKey?: string } | null;
type Mistake = { prompt: string; answer: string };

export default function Jeu() {
  const [svg, setSvg] = useState<string | null>(null);
  const [regSvg, setRegSvg] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const lastHoverRegion = useRef<string | null>(null);

  // configuration
  const [phase, setPhase] = useState<'setup' | 'customize' | 'playing' | 'over'>('setup');
  const [cats, setCats] = useState<Cat[]>(['dep', 'reg', 'pref']);
  const [format, setFormat] = useState<Format>('libre');
  const [duration, setDuration] = useState(60);
  const [excluded, setExcluded] = useState<Excluded>(loadExcl);

  // pool jouable par catégorie (objets non exclus)
  const pool = useMemo<Pool>(() => ({
    dep: CODES.filter((c) => !excluded.dep.includes(c)),
    reg: REGIONS.filter((r) => !excluded.reg.includes(r)),
    pref: CODES.filter((c) => !excluded.pref.includes(c)),
  }), [excluded]);
  // catégories cochées ET disposant d'au moins un objet jouable
  const activeCats = useMemo(() => cats.filter((c) => pool[c].length > 0), [cats, pool]);

  // persiste les exclusions
  useEffect(() => { try { localStorage.setItem(EXCL_KEY, JSON.stringify(excluded)); } catch { /* ignore */ } }, [excluded]);
  const toggleExcl = (cat: Cat, key: string) => setExcluded((p) => ({
    ...p, [cat]: p[cat].includes(key) ? p[cat].filter((k) => k !== key) : [...p[cat], key],
  }));
  const resetExcl = (cat: Cat) => setExcluded((p) => ({ ...p, [cat]: [] }));
  const exclCount = excluded.dep.length + excluded.reg.length + excluded.pref.length;

  // maîtrise adaptative : state pour l'UI/persistance, ref pour la lecture toujours à jour
  // (le tirage de la question suivante est planifié avant le re-render)
  const [mastery, setMastery] = useState<Mastery>(loadMastery);
  const masteryRef = useRef(mastery);
  useEffect(() => { try { localStorage.setItem(MAST_KEY, JSON.stringify(mastery)); } catch { /* ignore */ } }, [mastery]);
  const recordAnswer = (q: Question, correct: boolean) => {
    const key = masteryKey(q.cat, q.cat === 'reg' ? q.region! : q.code!, q.qtype);
    const now = Date.now();
    const next = { ...masteryRef.current, [key]: updateSkill(masteryRef.current[key], q.qtype, correct, now) };
    masteryRef.current = next;
    setMastery(next);
  };
  const resetMastery = () => { masteryRef.current = {}; setMastery({}); };

  // % de maîtrise moyen (les deux types confondus) par catégorie, objets non vus comptés à 0
  const stats = useMemo(() => {
    const now = Date.now();
    const pct = (keys: string[], cat: Cat) => {
      const ps = keys.flatMap((k) => (['locate', 'identify'] as QType[]).map((t) => effectiveP(mastery[masteryKey(cat, k, t)], now)));
      return ps.length ? Math.round((ps.reduce((a, b) => a + b, 0) / ps.length) * 100) : 0;
    };
    return { dep: pct(pool.dep, 'dep'), reg: pct(pool.reg, 'reg'), pref: pct(pool.pref, 'pref') };
  }, [mastery, pool]);

  // partie
  const [question, setQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [timeLeft, setTimeLeft] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);

  const qIndex = useRef(0);              // alterne locate/identify
  const lastKey = useRef<string | undefined>(undefined); // cible de la question précédente
  const advance = useRef<number | undefined>(undefined);
  const playing = useRef(false);

  // charge les couches une fois (départements + contours de régions)
  useEffect(() => {
    const B = import.meta.env.BASE_URL;
    fetch(`${B}layers/departements.svg`).then((r) => r.text()).then(setSvg);
    fetch(`${B}layers/regions.svg`).then((r) => r.text()).then(setRegSvg);
  }, []);

  // ---- timer contre-la-montre ----
  useEffect(() => {
    if (phase !== 'playing' || format !== 'chrono') return;
    if (timeLeft <= 0) { playing.current = false; clearTimeout(advance.current); setPhase('over'); return; }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft, format]);

  // ---- surbrillance carte selon question + résultat ----
  useEffect(() => {
    const root = mapRef.current; if (!root || !svg) return;
    root.querySelectorAll('.quiz-target,.quiz-correct,.quiz-wrong,.reg-hover')
      .forEach((e) => e.classList.remove('quiz-target', 'quiz-correct', 'quiz-wrong', 'reg-hover'));
    lastHoverRegion.current = null;
    if (!question) return;
    const markDep = (code: string, cls: string) => root.querySelectorAll(`.dep[data-dep="${code}"]`).forEach((e) => e.classList.add(cls));
    const markReg = (region: string, cls: string) => root.querySelectorAll(`.dep[data-region="${cssEsc(region)}"]`).forEach((e) => e.classList.add(cls));
    const markTarget = (cls: string) => (question.cat === 'reg' ? markReg(question.region!, cls) : markDep(question.code!, cls));

    if (question.qtype === 'identify') markTarget('quiz-target');
    if (result) {
      if (question.qtype === 'locate') {
        markTarget('quiz-correct');
        if (!result.correct && result.pickedDep) markDep(result.pickedDep, 'quiz-wrong');
      } else {
        markTarget('quiz-correct'); // confirme la zone une fois répondu
      }
    }
  }, [question, result, svg]);

  // nettoyage
  useEffect(() => () => clearTimeout(advance.current), []);

  function start() {
    if (activeCats.length === 0) return;
    qIndex.current = 0;
    playing.current = true;
    setScore({ correct: 0, total: 0 });
    setMistakes([]);
    setResult(null);
    setTimeLeft(duration);
    const q = makeQuestion(activeCats, 'locate', pool, masteryRef.current, Date.now());
    lastKey.current = targetKey(q);
    setQuestion(q);
    setPhase('playing');
  }

  function next() {
    clearTimeout(advance.current);
    if (!playing.current) return;
    setResult(null);
    qIndex.current += 1;
    const qtype: QType = qIndex.current % 2 === 0 ? 'locate' : 'identify';
    const q = makeQuestion(activeCats, qtype, pool, masteryRef.current, Date.now(), lastKey.current);
    lastKey.current = targetKey(q);
    setQuestion(q);
  }

  function registerAnswer(correct: boolean, pickedDep?: string, pickedKey?: string) {
    if (result || !question) return;
    recordAnswer(question, correct); // met à jour la maîtrise adaptative
    setResult({ correct, pickedDep, pickedKey });
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    if (!correct) setMistakes((m) => [...m, { prompt: question.prompt, answer: question.answerLabel }]);
    advance.current = window.setTimeout(next, correct ? 850 : 1700);
  }

  function onMapClick(e: React.MouseEvent) {
    if (!question || question.qtype !== 'locate' || result) return;
    const el = (e.target as Element).closest('.dep'); if (!el) return;
    const picked = el.getAttribute('data-dep')!;
    const correct = question.cat === 'reg' ? depts[picked]?.region === question.region : picked === question.code;
    registerAnswer(correct, picked);
  }

  // survol : en mode « localiser une région », surligne toute la région sous le curseur
  const clearRegHover = () => {
    mapRef.current?.querySelectorAll('.reg-hover').forEach((e) => e.classList.remove('reg-hover'));
    lastHoverRegion.current = null;
  };
  function onMapMove(e: React.MouseEvent) {
    if (!question || question.qtype !== 'locate' || question.cat !== 'reg' || result) {
      if (lastHoverRegion.current) clearRegHover();
      return;
    }
    const el = (e.target as Element).closest('.dep');
    const region = el ? depts[el.getAttribute('data-dep')!]?.region : null;
    if (region === lastHoverRegion.current) return;
    clearRegHover();
    if (region) {
      mapRef.current!.querySelectorAll(`.dep[data-region="${cssEsc(region)}"]`).forEach((e) => e.classList.add('reg-hover'));
      lastHoverRegion.current = region;
    }
  }

  const finish = () => { playing.current = false; clearTimeout(advance.current); setPhase('over'); };
  const accuracy = score.total ? Math.round((score.correct / score.total) * 100) : 0;
  const clickable = !!question && question.qtype === 'locate' && !result;

  // ============ ÉCRANS ============
  if (phase === 'setup') {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Jeu — géographie de la France</h2>
        <p className="text-sm text-slate-500 mb-5">Localise sur la carte ou identifie en QCM, en alternance.</p>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
          <div>
            <div className="text-sm font-semibold text-slate-700 mb-2">Catégories à réviser</div>
            <div className="flex flex-wrap gap-2">
              {(['dep', 'reg', 'pref'] as Cat[]).map((c) => {
                const on = cats.includes(c);
                const empty = on && pool[c].length === 0;
                return (
                  <button key={c} onClick={() => setCats((p) => (on ? p.filter((x) => x !== c) : [...p, c]))}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${empty ? 'bg-amber-50 text-amber-700 border-amber-300' : on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                    {on ? '✓ ' : ''}{CAT_LABEL[c]}{empty ? ' (tout exclu)' : ''}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPhase('customize')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline">
              Personnaliser les objets{exclCount > 0 ? ` (${exclCount} exclu${exclCount > 1 ? 's' : ''})` : ''}
            </button>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-700 mb-2">Format</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFormat('libre')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${format === 'libre' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                Entraînement libre
              </button>
              <button onClick={() => setFormat('chrono')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${format === 'chrono' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                Contre-la-montre
              </button>
              {format === 'chrono' && (
                <select value={duration} onChange={(e) => setDuration(+e.target.value)}
                  className="px-3 py-1.5 rounded-full text-sm border border-slate-300 bg-white text-slate-700">
                  <option value={30}>30 s</option>
                  <option value={60}>60 s</option>
                  <option value={120}>120 s</option>
                </select>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-700">Ma maîtrise</div>
              {(stats.dep + stats.reg + stats.pref) > 0 && (
                <button onClick={resetMastery} className="text-xs text-slate-400 hover:text-red-600 underline">Réinitialiser</button>
              )}
            </div>
            <div className="space-y-2">
              {(['dep', 'reg', 'pref'] as Cat[]).map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-28 shrink-0">{CAT_LABEL[c]}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${stats[c]}%` }} />
                  </div>
                  <span className="text-xs font-mono text-slate-500 w-9 text-right">{stats[c]}%</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Le jeu interroge en priorité ce qui est le moins maîtrisé ; la maîtrise s'estompe avec le temps.</p>
          </div>

          <button onClick={start} disabled={activeCats.length === 0}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40 transition">
            Commencer
          </button>
          {cats.length > 0 && activeCats.length === 0 && (
            <p className="text-sm text-amber-600 -mt-2">Toutes les catégories choisies ont leurs objets exclus.</p>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'customize') {
    const sections: { cat: Cat; items: { key: string; label: string }[] }[] = [
      { cat: 'dep', items: CODES.map((c) => ({ key: c, label: `${c} · ${depts[c].nom}` })) },
      { cat: 'reg', items: REGIONS.map((r) => ({ key: r, label: r })) },
      { cat: 'pref', items: CODES.map((c) => ({ key: c, label: `${depts[c].prefecture} (${c})` })) },
    ];
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-slate-800">Objets à réviser</h2>
          <button onClick={() => setPhase('setup')} className="text-sm text-blue-600 hover:text-blue-800 underline">← Réglages</button>
        </div>
        <p className="text-sm text-slate-500 mb-5">Décoche les objets que tu connais déjà : ils n'apparaîtront plus dans le jeu. Ton choix est mémorisé.</p>

        <div className="space-y-5">
          {sections.map(({ cat, items }) => {
            const offCount = excluded[cat].length;
            return (
              <div key={cat} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-slate-700">
                    {CAT_LABEL[cat]} <span className="text-slate-400 font-normal">· {items.length - offCount}/{items.length} actifs</span>
                  </div>
                  {offCount > 0 && (
                    <button onClick={() => resetExcl(cat)} className="text-xs text-blue-600 hover:text-blue-800 underline">Tout réactiver</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(({ key, label }) => {
                    const off = excluded[cat].includes(key);
                    return (
                      <button key={key} onClick={() => toggleExcl(cat, key)}
                        title={off ? 'Désactivé — clique pour réactiver' : 'Actif — clique pour exclure'}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${off ? 'bg-slate-100 text-slate-400 border-slate-200 line-through' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={() => setPhase('setup')}
          className="w-full mt-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
          Terminé
        </button>
      </div>
    );
  }

  if (phase === 'over') {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center">
          {format === 'chrono' && <div className="text-sm uppercase tracking-wide text-blue-600 mb-1">Temps écoulé</div>}
          <h2 className="text-2xl font-bold text-slate-800">{score.correct} / {score.total}</h2>
          <p className="text-slate-500 mb-4">{accuracy}% de bonnes réponses</p>
          {mistakes.length > 0 && (
            <div className="text-left bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 max-h-60 overflow-auto">
              <div className="text-sm font-semibold text-slate-700 mb-1">À revoir ({mistakes.length})</div>
              <ul className="text-sm text-slate-600 space-y-0.5">
                {mistakes.map((m, i) => (<li key={i}><span className="text-slate-400">{m.prompt}</span> → <strong>{m.answer}</strong></li>))}
              </ul>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <button onClick={start} className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">Rejouer</button>
            <button onClick={() => setPhase('setup')} className="px-5 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200">Réglages</button>
          </div>
        </div>
      </div>
    );
  }

  // phase playing
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* carte */}
        <div className="border border-slate-200 rounded-xl bg-slate-50 p-2">
          <div ref={mapRef} className={`map-stack quiz ${clickable ? 'clickable' : ''}`}
            onClick={onMapClick} onMouseMove={onMapMove} onMouseLeave={clearRegHover}>
            {svg && <div className="layerwrap base" dangerouslySetInnerHTML={{ __html: svg }} />}
            {question?.cat === 'reg' && regSvg && (
              <div className="layerwrap overlay" dangerouslySetInnerHTML={{ __html: regSvg }} />
            )}
            {!svg && <div className="p-10 text-center text-slate-400">Chargement…</div>}
          </div>
        </div>

        {/* panneau jeu */}
        <aside className="lg:sticky lg:top-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-green-600">✓ {score.correct}</span>
            <span className="text-slate-400">{score.total} question{score.total > 1 ? 's' : ''}</span>
            {format === 'chrono'
              ? <span className={`font-mono font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-slate-700'}`}>⏱ {timeLeft}s</span>
              : <button onClick={finish} className="text-slate-500 hover:text-slate-800 underline">Terminer</button>}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-blue-500 mb-1">
              {question?.qtype === 'locate' ? 'Localiser' : 'Identifier'} · {question && CAT_LABEL[question.cat]}
            </div>
            <div className="font-bold text-slate-800 text-lg leading-tight">{question?.prompt}</div>

            {/* QCM (identify) */}
            {question?.qtype === 'identify' && (
              <div className="grid grid-cols-1 gap-2 mt-3">
                {question.choices!.map((ch) => {
                  let cls = 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700';
                  if (result) {
                    if (ch.correct) cls = 'bg-green-100 border-green-400 text-green-800';
                    else if (ch.key === result.pickedKey) cls = 'bg-red-100 border-red-400 text-red-800';
                    else cls = 'bg-white border-slate-200 text-slate-400';
                  }
                  return (
                    <button key={ch.key} disabled={!!result}
                      onClick={() => registerAnswer(ch.correct, undefined, ch.key)}
                      className={`px-3 py-2 rounded-lg border text-sm text-left font-medium transition ${cls}`}>
                      {ch.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* consigne / feedback */}
            {question?.qtype === 'locate' && !result && (
              <p className="text-sm text-slate-400 mt-2">Clique sur la carte.</p>
            )}
            {result && (
              <div className={`mt-3 text-sm font-semibold ${result.correct ? 'text-green-600' : 'text-red-600'}`}>
                {result.correct ? '✓ Bonne réponse !' : `✗ Raté — ${question?.answerLabel}`}
                <button onClick={next} className="ml-2 text-blue-600 underline font-normal">Suivant →</button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
