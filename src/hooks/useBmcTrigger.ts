"use client";

/**
 * Smart BMC trigger — shows coffee prompt at meaningful moments, not constantly.
 *
 * Triggers:
 * 1. After 3rd completed session (user is engaged)
 * 2. After first 90%+ accuracy (pride moment)
 * 3. After 5th day streak (habit formed)
 * 4. Every 10 sessions after that (periodic, not annoying)
 *
 * Respects dismissals: once dismissed, won't show again for that trigger.
 * Stores state in localStorage to persist across sessions.
 */

const STORAGE_KEY = "bmc-dismissed";
const BMC_URL = "https://buymeacoffee.com/lekibbitz";

export interface BmcContext {
  reason: "engagement" | "achievement" | "streak" | "milestone";
  sessionCount: number;
  accuracy?: number;
  streak?: number;
}

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function addDismissed(key: string): void {
  const dismissed = getDismissed();
  dismissed.add(key);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
}

export function shouldShowBmc(
  sessionCount: number,
  bestAccuracy: number,
  currentStreak: number
): BmcContext | null {
  const dismissed = getDismissed();

  // Trigger 1: 3+ sessions — user is engaged
  if (sessionCount >= 3 && !dismissed.has("engagement")) {
    return { reason: "engagement", sessionCount };
  }

  // Trigger 2: First 90%+ accuracy — pride moment
  if (bestAccuracy >= 90 && !dismissed.has("achievement-90")) {
    return { reason: "achievement", sessionCount, accuracy: bestAccuracy };
  }

  // Trigger 3: 5-day streak — habit formed
  if (currentStreak >= 5 && !dismissed.has("streak-5")) {
    return { reason: "streak", sessionCount, streak: currentStreak };
  }

  // Trigger 4: Every 10 sessions (10, 20, 30...) — periodic reminder
  if (sessionCount >= 10 && sessionCount % 10 < 3) {
    const decade = Math.floor(sessionCount / 10) * 10;
    const key = `milestone-${decade}`;
    if (!dismissed.has(key)) {
      return { reason: "milestone", sessionCount };
    }
  }

  return null;
}

export function dismissBmc(context: BmcContext): void {
  switch (context.reason) {
    case "engagement":
      addDismissed("engagement");
      break;
    case "achievement":
      addDismissed("achievement-90");
      break;
    case "streak":
      addDismissed("streak-5");
      break;
    case "milestone": {
      const decade = Math.floor(context.sessionCount / 10) * 10;
      addDismissed(`milestone-${decade}`);
      break;
    }
  }
}

export { BMC_URL };
