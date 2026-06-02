import { useState } from 'react';
import CarteFrance from './CarteFrance';
import Jeu from './Jeu';
import Apprendre from './Apprendre';

type View = 'explore' | 'learn' | 'game';

export default function App() {
  const [view, setView] = useState<View>('explore');
  return (
    <div>
      <div className="container mx-auto px-4 pt-4 max-w-6xl">
        <div className="inline-flex rounded-full bg-slate-100 p-1 gap-1">
          {([['explore', 'Explorer'], ['learn', 'Apprendre'], ['game', 'Jouer']] as [View, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition ${view === v ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {view === 'explore' ? <CarteFrance /> : view === 'learn' ? <Apprendre /> : <Jeu />}
    </div>
  );
}
