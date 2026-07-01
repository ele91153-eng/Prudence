import { createContext, useContext, useState, useCallback } from 'react';

export const MASCOTS = [
  { id: 'prudence',   name: 'Prudence',            emoji: '🍊', streakRequired: 0,   src: '/mascots/prudence.svg',   desc: 'The original. Warm, bright, always there for you.' },
  { id: 'strawberry', name: 'Strawberry Prudence',  emoji: '🍓', streakRequired: 3,   src: '/mascots/strawberry.svg', desc: 'Sweet and determined. 3 days strong!' },
  { id: 'watermelon', name: 'Watermelon Prudence',  emoji: '🍉', streakRequired: 7,   src: '/mascots/watermelon.svg', desc: 'Cool under pressure. A whole week done.' },
  { id: 'blueberry',  name: 'Blueberry Prudence',   emoji: '🫐', streakRequired: 14,  src: '/mascots/blueberry.svg',  desc: 'Deep focus, deep purple. Two weeks in.' },
  { id: 'kiwi',       name: 'Kiwi Prudence',        emoji: '🥝', streakRequired: 21,  src: '/mascots/kiwi.svg',       desc: 'Tough outside, bright inside. Three weeks!' },
  { id: 'golden',     name: 'Golden Prudence',      emoji: '✨', streakRequired: 30,  src: '/mascots/golden.svg',     desc: 'A full month. You are golden.' },
  { id: 'cosmic',     name: 'Cosmic Prudence',      emoji: '🌌', streakRequired: 50,  src: '/mascots/cosmic.svg',     desc: 'Out of this world. 50 days of showing up.' },
  { id: 'diamond',    name: 'Diamond Prudence',     emoji: '💎', streakRequired: 100, src: '/mascots/diamond.svg',    desc: 'Legendary. 100 days. Unbreakable.' },
];

const MascotContext = createContext(null);

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}

export function MascotProvider({ children }) {
  const [selected, setSelected] = useState(() => load('prudence_mascot', 'prudence'));
  const [unlocked, setUnlocked] = useState(() => load('prudence_unlocked', ['prudence']));
  const [celebration, setCelebration] = useState(null);

  function selectMascot(id) {
    if (!unlocked.includes(id)) return;
    setSelected(id);
    localStorage.setItem('prudence_mascot', JSON.stringify(id));
  }

  const checkUnlocks = useCallback((streak) => {
    const newOnes = MASCOTS.filter(m => m.streakRequired > 0 && m.streakRequired <= streak && !unlocked.includes(m.id));
    if (!newOnes.length) return;
    const updated = [...unlocked, ...newOnes.map(m => m.id)];
    setUnlocked(updated);
    localStorage.setItem('prudence_unlocked', JSON.stringify(updated));
    // Celebrate the highest newly unlocked
    setCelebration(newOnes[newOnes.length - 1]);
  }, [unlocked]);

  const currentMascot = MASCOTS.find(m => m.id === selected) ?? MASCOTS[0];

  return (
    <MascotContext.Provider value={{
      selected, unlocked, mascots: MASCOTS,
      currentMascot, currentSrc: currentMascot.src,
      selectMascot, checkUnlocks,
      celebration, clearCelebration: () => setCelebration(null),
    }}>
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot() {
  return useContext(MascotContext);
}
