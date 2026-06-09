import { useEffect, useMemo, useRef, useState } from 'react';
import deptsData from './depts.json';

type Dept = { nom: string; region: string; prefecture: string };
const depts = deptsData as Record<string, Dept>;
const CODES = Object.keys(depts);
const REGIONS = [...new Set(CODES.map((c) => depts[c].region))].sort((a, b) => a.localeCompare(b, 'fr'));

type Cat = 'dep' | 'reg' | 'pref';
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

// génère une question dont la cible diffère de `avoid` (réponse précédente), avec repli
function makeQuestion(cats: Cat[], qtype: QType, avoid?: string): Question {
  let q = buildQuestion(cats, qtype);
  for (let i = 0; i < 20 && targetKey(q) === avoid; i++) q = buildQuestion(cats, qtype);
  return q;
}

function buildQuestion(cats: Cat[], qtype: QType): Question {
  const cat = rnd(cats);
  if (cat === 'reg') {
    const region = rnd(REGIONS);
    if (qtype === 'locate')
      return { cat, qtype, region, prompt: `Trouve la région : ${region}`, answerLabel: region };
    const choices = shuffle([region, ...sample(REGIONS.filter((r) => r !== region), 3)])
      .map((r) => ({ key: r, label: r, correct: r === region }));
    return { cat, qtype, region, prompt: 'Quelle est cette région (en surbrillance) ?', answerLabel: region, choices };
  }
  if (cat === 'pref') {
    const code = rnd(CODES);
    if (qtype === 'locate')
      return { cat, qtype, code, prompt: `Où se trouve ${depts[code].prefecture} ?`, answerLabel: `${depts[code].prefecture} → ${depts[code].nom} (${code})` };
    const choices = shuffle([code, ...sample(CODES.filter((c) => c !== code), 3)])
      .map((c) => ({ key: c, label: depts[c].prefecture, correct: c === code }));
    return { cat, qtype, code, prompt: `Quelle est la préfecture de ${depts[code].nom} (${code}) ?`, answerLabel: depts[code].prefecture, choices };
  }
  // dep
  const code = rnd(CODES);
  if (qtype === 'locate')
    return { cat, qtype, code, prompt: `Trouve le département : ${depts[code].nom} (${code})`, answerLabel: `${depts[code].nom} (${code})` };
  const choices = shuffle([code, ...sample(CODES.filter((c) => c !== code), 3)])
    .map((c) => ({ key: c, label: depts[c].nom, correct: c === code }));
  return { cat, qtype, code, prompt: 'Quel est ce département (en surbrillance) ?', answerLabel: `${depts[code].nom} (${code})`, choices };
}

type Result = { correct: boolean; pickedDep?: string; pickedKey?: string } | null;
type Mistake = { prompt: string; answer: string };

export default function Jeu() {
  const [svg, setSvg] = useState<string | null>(null);
  const [regSvg, setRegSvg] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const lastHoverRegion = useRef<string | null>(null);

  // configuration
  const [phase, setPhase] = useState<'setup' | 'playing' | 'over'>('setup');
  const [cats, setCats] = useState<Cat[]>(['dep', 'reg', 'pref']);
  const [format, setFormat] = useState<Format>('libre');
  const [duration, setDuration] = useState(60);

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
    if (cats.length === 0) return;
    qIndex.current = 0;
    playing.current = true;
    setScore({ correct: 0, total: 0 });
    setMistakes([]);
    setResult(null);
    setTimeLeft(duration);
    const q = makeQuestion(cats, 'locate');
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
    const q = makeQuestion(cats, qtype, lastKey.current);
    lastKey.current = targetKey(q);
    setQuestion(q);
  }

  function registerAnswer(correct: boolean, pickedDep?: string, pickedKey?: string) {
    if (result || !question) return;
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
                return (
                  <button key={c} onClick={() => setCats((p) => (on ? p.filter((x) => x !== c) : [...p, c]))}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                    {on ? '✓ ' : ''}{CAT_LABEL[c]}
                  </button>
                );
              })}
            </div>
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

          <button onClick={start} disabled={cats.length === 0}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40 transition">
            Commencer
          </button>
        </div>
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
