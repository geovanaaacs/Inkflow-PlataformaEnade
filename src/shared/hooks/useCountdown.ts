import { useEffect, useState } from "react";

/**
 * Milliseconds left until `endsAt` (never negative), or null without a deadline.
 * Computed from the wall clock on every tick, so it stays correct even when
 * the browser throttles timers in a background tab.
 */
export function useCountdown(endsAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, [endsAt]);

  if (!endsAt) return null;
  return Math.max(0, new Date(endsAt).getTime() - now);
}
