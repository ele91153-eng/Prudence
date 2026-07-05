// Task reminder scheduling via @capacitor/local-notifications.
//
// This replaces the old setTimeout()+Notification-API scheduler entirely —
// that approach silently died whenever the app was backgrounded or the OS
// suspended the tab/WebView. @capacitor/local-notifications uses the real
// OS-level notification scheduler (UNUserNotificationCenter on iOS,
// AlarmManager-backed on Android) so reminders fire even if the app isn't
// running, and it has a web fallback for the Render-hosted PWA too.
import { LocalNotifications } from '@capacitor/local-notifications';

const REMINDER_LINES = [
  "Hey — {title} starts in 5. You've got this. 🍊",
  "Quick heads up: {title} is coming up in 5 minutes.",
  "5 minutes until {title} — Prudence is cheering you on!",
  "{title} is almost here. Small steps, big progress.",
  "Just a nudge — {title} starts soon. You've got this.",
];

function pickReminderLine(title) {
  const line = REMINDER_LINES[Math.floor(Math.random() * REMINDER_LINES.length)];
  return line.replace('{title}', title);
}

function parseTimeToDate(timeStr) {
  if (!timeStr) return null;
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let [, h, min, p] = m;
  h = parseInt(h); min = parseInt(min);
  if (p.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (p.toUpperCase() === 'AM' && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d;
}

// Deterministic 31-bit positive int id derived from (dayId, taskIndex) —
// Capacitor requires integer notification ids, and this lets us recompute
// the same id later purely from the task's identity, no extra bookkeeping.
function notificationIdFor(dayId, taskIndex) {
  return (parseInt(dayId) * 1000 + parseInt(taskIndex)) % 2147483647;
}

export async function hasNotificationPermission() {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

// Requested lazily — the first time a user actually schedules a timed task,
// not on app launch.
export async function ensureNotificationPermission() {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') return true;
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (e) {
    console.warn('Notification permission request failed:', e);
    return false;
  }
}

// Schedules a reminder 5 minutes before the task's start time. Returns the
// notification id (string) to persist, or null if it wasn't scheduled
// (time already passed, or permission denied — caller should show the
// "enable notifications in settings" hint in the denied case).
export async function scheduleTaskReminder({ dayId, taskIndex, title, time, goalId }) {
  const taskDate = parseTimeToDate(time);
  if (!taskDate) return { ok: false, reason: 'no-time' };

  const fireAt = new Date(taskDate.getTime() - 5 * 60 * 1000);
  if (fireAt.getTime() <= Date.now()) return { ok: false, reason: 'past' };

  const granted = await ensureNotificationPermission();
  if (!granted) return { ok: false, reason: 'denied' };

  const id = notificationIdFor(dayId, taskIndex);
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title: 'Prudence',
        body: pickReminderLine(title),
        schedule: { at: fireAt, allowWhileIdle: true },
        extra: { goalId, dayId, taskIndex },
      }],
    });
    return { ok: true, id: String(id) };
  } catch (e) {
    console.warn('Failed to schedule task reminder:', e);
    return { ok: false, reason: 'error' };
  }
}

export async function cancelTaskReminder(notificationId) {
  if (!notificationId) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: parseInt(notificationId, 10) }] });
  } catch (e) {
    console.warn('Failed to cancel task reminder:', e);
  }
}

// Deep-links into the app when a reminder is tapped. Registered once at
// app startup. This app's "today" screen already surfaces every task, so
// the deep link opens Dashboard and hands the task's ids up via the
// onTap callback rather than a task-detail route (there isn't one yet).
export function onNotificationTapped(callback) {
  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    callback(action.notification?.extra || {});
  });
}
