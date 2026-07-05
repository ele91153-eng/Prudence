import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../utils/api.js';

export const MASCOTS = [
  { id: 'prudence',   name: 'Prudence',            emoji: '🍊', streakRequired: 0,   src: '/prudence-original.png',   desc: 'The original. Warm, bright, always there for you.' },
  { id: 'strawberry', name: 'Strawberry Prudence',  emoji: '🍓', streakRequired: 3,   src: '/mascots/strawberry.png',  desc: 'Sweet and determined. 3 days strong!' },
  { id: 'watermelon', name: 'Watermelon Prudence',  emoji: '🍉', streakRequired: 7,   src: '/mascots/watermelon.png',  desc: 'Cool under pressure. A whole week done.' },
  { id: 'blueberry',  name: 'Blueberry Prudence',   emoji: '🫐', streakRequired: 14,  src: '/mascots/blueberry.png',   desc: 'Deep focus, deep purple. Two weeks in.' },
  { id: 'kiwi',       name: 'Kiwi Prudence',        emoji: '🥝', streakRequired: 21,  src: '/mascots/kiwi.png',        desc: 'Tough outside, bright inside. Three weeks!' },
  { id: 'golden',     name: 'Golden Prudence',      emoji: '✨', streakRequired: 30,  src: '/mascots/golden.png',      desc: 'A full month. You are golden.' },
  { id: 'cosmic',     name: 'Cosmic Prudence',      emoji: '🌌', streakRequired: 50,  src: '/mascots/cosmic.png',      desc: 'Out of this world. 50 days of showing up.' },
  { id: 'diamond',    name: 'Diamond Prudence',     emoji: '💎', streakRequired: 100, src: '/mascots/diamond.png',     desc: 'Legendary. 100 days. Unbreakable.' },
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
  const [serverSynced, setServerSynced] = useState(false);

  // One-time: seed the server row from whatever's in localStorage (covers
  // users who had wardrobe progress before this device had a Supabase
  // identity), then treat the server as the source of truth going forward.
  useEffect(() => {
    (async () => {
      const localMascot = load('prudence_mascot', 'prudence');
      const localUnlocked = load('prudence_unlocked', ['prudence']);
      const localMaxStreak = parseInt(localStorage.getItem('prudence_max_streak') || '0', 10);

      try {
        await api.post('/user/mascot-state/seed', {
          selected_mascot_id: localMascot,
          unlocked_mascots: localUnlocked,
          max_streak: localMaxStreak,
        });
        const server = await api.get('/user/mascot-state');
        setSelected(server.selected_mascot_id);
        setUnlocked(server.unlocked_mascots);
        localStorage.setItem('prudence_mascot', JSON.stringify(server.selected_mascot_id));
        localStorage.setItem('prudence_unlocked', JSON.stringify(server.unlocked_mascots));
        localStorage.setItem('prudence_max_streak', String(server.max_streak));
      } catch (e) {
        console.warn('Mascot state server sync failed — using local cache', e);
      } finally {
        setServerSynced(true);
      }
    })();
  }, []);

  function selectMascot(id) {
    if (!unlocked.includes(id)) return;
    setSelected(id);
    localStorage.setItem('prudence_mascot', JSON.stringify(id));
    api.post('/user/mascot-state', { selected_mascot_id: id }).catch(() => {});
  }

  const checkUnlocks = useCallback((streak) => {
    const newOnes = MASCOTS.filter(m => m.streakRequired > 0 && m.streakRequired <= streak && !unlocked.includes(m.id));
    const updated = newOnes.length ? [...unlocked, ...newOnes.map(m => m.id)] : unlocked;

    if (newOnes.length) {
      setUnlocked(updated);
      localStorage.setItem('prudence_unlocked', JSON.stringify(updated));
      setCelebration(newOnes[newOnes.length - 1]);
    }

    api.post('/user/mascot-state', {
      unlocked_mascots: newOnes.length ? updated : undefined,
      max_streak: streak,
    }).catch(() => {});
  }, [unlocked]);

  const currentMascot = MASCOTS.find(m => m.id === selected) ?? MASCOTS[0];

  return (
    <MascotContext.Provider value={{
      selected, unlocked, mascots: MASCOTS,
      currentMascot, currentSrc: currentMascot.src,
      selectMascot, checkUnlocks, serverSynced,
      celebration, clearCelebration: () => setCelebration(null),
    }}>
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot() {
  return useContext(MascotContext);
}
