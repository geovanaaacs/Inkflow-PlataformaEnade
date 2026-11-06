import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DailyUsage } from "../../lib/plan-access";
import { useAuth } from "../auth/AuthProvider";
import { getDailyUsage, getMyNoteCounts } from "./api";

/*
 * State shared by every practice screen of the student area: today's usage
 * (plan banner) and how many notes each question has. Kept above the tabs so
 * answering on the question screen updates the banner of the list behind it.
 * Mirrors frontend/src/features/questions/usePracticeSession.ts.
 */

interface PracticeContextValue {
  usage: DailyUsage | null;
  noteCounts: Record<string, number>;
  setUsage: (usage: DailyUsage) => void;
  noteAdded: (questionId: string) => void;
  reload: () => void;
}

const PracticeContext = createContext<PracticeContextValue | null>(null);

export function PracticeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});

  const reload = useCallback(() => {
    Promise.all([getDailyUsage(), getMyNoteCounts()])
      .then(([loadedUsage, loadedCounts]) => {
        setUsage(loadedUsage);
        setNoteCounts(loadedCounts);
      })
      .catch(() => {
        // The banner and the note counters are secondary: screens work without them.
      });
  }, []);

  // A plan change (Planos) changes the limit and unlocks notes.
  useEffect(reload, [reload, user?.plan]);

  const noteAdded = useCallback((questionId: string) => {
    setNoteCounts((current) => ({ ...current, [questionId]: (current[questionId] ?? 0) + 1 }));
  }, []);

  const value = useMemo(
    () => ({ usage, noteCounts, setUsage, noteAdded, reload }),
    [usage, noteCounts, noteAdded, reload]
  );
  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>;
}

export function usePractice(): PracticeContextValue {
  const context = useContext(PracticeContext);
  if (!context) throw new Error("usePractice must be used within a PracticeProvider");
  return context;
}
