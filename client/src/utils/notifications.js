// Client-side task notification scheduler
// Uses Notification API directly (no server push needed for time-based alerts)

const scheduledTimers = new Map(); // taskId -> timeoutId

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function scheduleTaskNotifications(goals = []) {
  // Cancel any existing timers
  for (const id of scheduledTimers.values()) clearTimeout(id);
  scheduledTimers.clear();

  if (Notification.permission !== 'granted') return;

  const now = Date.now();

  for (const goal of goals) {
    for (const task of goal.tasks || []) {
      if (task.status !== 'pending' || !task.time) continue;

      const fireAt = getTaskTimestamp(task.time);
      if (fireAt === null) continue;

      const delay = fireAt - now;
      // Schedule up to 12 hours ahead, and allow up to 2 minutes past (in case page loaded late)
      if (delay < -2 * 60 * 1000 || delay > 12 * 60 * 60 * 1000) continue;

      const effectiveDelay = Math.max(0, delay);
      const timerId = setTimeout(() => {
        fireTaskNotification(task, goal);
      }, effectiveDelay);

      scheduledTimers.set(task.id, timerId);
    }
  }
}

function getTaskTimestamp(timeStr) {
  if (!timeStr) return null;
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let [, h, min, p] = m;
  h = parseInt(h); min = parseInt(min);
  if (p.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (p.toUpperCase() === 'AM' && h === 12) h = 0;

  const now = new Date();
  const fire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min, 0, 0);
  return fire.getTime();
}

function fireTaskNotification(task, goal) {
  try {
    const n = new Notification(`⏰ ${task.title}`, {
      body: goal.title ? `Time to work on: ${goal.title}` : 'Your task is starting now',
      icon: '/prudence-original.png',
      badge: '/icons/icon-96.png',
      tag: `task-${task.id}`,
      renotify: true,
      vibrate: [200, 100, 200],
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (e) {
    console.warn('Notification failed:', e);
  }

  // Vibrate as fallback regardless
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
}

export function cancelAllTaskNotifications() {
  for (const id of scheduledTimers.values()) clearTimeout(id);
  scheduledTimers.clear();
}
