import { supabase } from './supabase.js';

let cachedSession = null;

supabase.auth.onAuthStateChange((_event, session) => {
  cachedSession = session;
});

// Ensures an anonymous Supabase session exists. Called once at app startup,
// before any authenticated API call. No UI/onboarding change — this is
// entirely invisible to the user.
export async function bootstrapAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    cachedSession = session;
    return session;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('Anonymous sign-in failed:', error.message);
    throw error;
  }
  cachedSession = data.session;
  return data.session;
}

export async function getAccessToken() {
  if (cachedSession?.access_token) return cachedSession.access_token;
  const { data: { session } } = await supabase.auth.getSession();
  cachedSession = session;
  return session?.access_token ?? null;
}

export function getUserId() {
  return cachedSession?.user?.id ?? null;
}

export function isAnonymous() {
  return cachedSession?.user?.is_anonymous ?? true;
}

// Optional "save your progress" upgrade path — links a permanent identity
// to the existing anonymous user so the same Supabase user id (and all data
// keyed by it) survives a reinstall or device switch.
export async function linkEmail(email) {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}

export async function linkOAuth(provider) {
  const { error } = await supabase.auth.linkIdentity({ provider });
  if (error) throw error;
}
