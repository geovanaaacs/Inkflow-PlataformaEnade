import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * Milliseconds left until `endsAt` (never negative), ticking twice a second.
 * Always computed from the clock, so it's right again as soon as the app
 * returns from the background (timers don't run there).
 */
export function useCountdown(endsAt: string): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 500);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [endsAt]);

  return Math.max(0, new Date(endsAt).getTime() - now);
}
