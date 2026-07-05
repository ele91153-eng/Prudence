// widgetBridge.ts
//
// Prep layer for a future native home-screen widget (iOS WidgetKit / Android
// Glance). Right now there is no native widget extension — this module just
// mirrors app state into a single well-known local storage key so that when
// the widget extension is built later, it's a drop-in read from shared
// storage instead of a data-modeling exercise.
//
// IMPORTANT — future swap: this currently writes to @capacitor/preferences,
// which is app-private storage, NOT shared with a native widget extension.
// A real widget needs an iOS App Group (shared UserDefaults) or Android
// SharedPreferences accessible to the widget process. When that phase
// starts, replace the two calls in `writeWidgetSnapshot` below with the
// native shared-storage equivalent — the shape of WidgetSnapshot and the
// call sites in the rest of the app do not need to change.

import { Preferences } from '@capacitor/preferences';

const WIDGET_SNAPSHOT_KEY = 'widget-snapshot';

export interface WidgetTask {
  id: string | number;
  title: string;
  time: string | null;
  completed: boolean;
}

export interface WidgetSnapshot {
  streak: number;
  selectedMascotId: string;
  tasks: WidgetTask[];
}

export async function writeWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  try {
    // ---- FUTURE SWAP POINT ----
    // Replace this Preferences.set with a native shared-storage write
    // (App Group UserDefaults on iOS, SharedPreferences on Android) once
    // the widget extension exists. Everything else in this file stays the same.
    await Preferences.set({
      key: WIDGET_SNAPSHOT_KEY,
      value: JSON.stringify(snapshot),
    });
    // ---------------------------
  } catch (e) {
    console.warn('widgetBridge: failed to write snapshot', e);
  }
}

export async function readWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const { value } = await Preferences.get({ key: WIDGET_SNAPSHOT_KEY });
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

// Convenience builder — call this from Dashboard (after every sync) and
// from TaskItem (after every local task completion). `selectedMascotId`
// should come from useMascot().selected (MascotContext), which already
// tracks the Wardrobe "ON" toggle — this function does not read that state
// itself so it stays framework-agnostic and easy to unit test.
export function syncWidgetSnapshot(params: {
  streak: number;
  selectedMascotId: string;
  goals: Array<{ tasks: Array<{ id?: string | number; index: number; title: string; time?: string; status: string }> }>;
}): Promise<void> {
  const tasks: WidgetTask[] = params.goals.flatMap(g =>
    g.tasks.map(t => ({
      id: t.id ?? t.index,
      title: t.title,
      time: t.time ?? null,
      completed: t.status === 'done',
    }))
  );

  return writeWidgetSnapshot({
    streak: params.streak,
    selectedMascotId: params.selectedMascotId,
    tasks,
  });
}
