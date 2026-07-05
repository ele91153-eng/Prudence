import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

// Storage adapter backed by @capacitor/preferences so the Supabase session
// persists identically on web (falls back to localStorage under the hood)
// and native iOS/Android (real native key-value storage).
const capacitorStorageAdapter = {
  getItem: async (key) => (await Preferences.get({ key })).value,
  setItem: async (key, value) => { await Preferences.set({ key, value }); },
  removeItem: async (key) => { await Preferences.remove({ key }); },
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — set these in client/.env ' +
    'before auth will work. See Supabase project Settings → API.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: capacitorStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // no OAuth redirect flow on initial launch
  },
});
