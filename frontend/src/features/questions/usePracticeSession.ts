import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import type { DailyUsage, PlanId } from "@/shared/plans/plan-access";
import { getDailyUsage, getMyNoteCounts, type AnswerResult } from "./api";

export interface PracticeSession {
  /**
   * Props for the plan banner — only students see it (teachers and admins
   * have no plan or daily limit). Null while loading or for staff.
   */
  banner: { planId: PlanId; usage: DailyUsage } | null;
  noteCounts: Record<string, number>;
  onAnswered: (result: AnswerResult) => void;
  onNoteAdded: (questionId: string) => void;
  /** Props every QuestionCard on the page needs. */
  cardProps: (questionId: string) => {
    noteCount: number;
    onAnswered: (result: AnswerResult) => void;
    onNoteAdded: (questionId: string) => void;
  };
}

/**
 * Page-level state shared by every question card on a practice page:
 * the daily usage shown in the banner and how many notes each question has.
 */
export function usePracticeSession(): PracticeSession {
  const { user } = useAuth();
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDailyUsage(), getMyNoteCounts()])
      .then(([loadedUsage, loadedCounts]) => {
        if (cancelled) return;
        setUsage(loadedUsage);
        setNoteCounts(loadedCounts);
      })
      .catch(() => {
        // The banner and note counters are secondary: the page still works without them.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.plan, user?.role]);

  const onAnswered = useCallback((result: AnswerResult) => setUsage(result.usage), []);

  const onNoteAdded = useCallback((questionId: string) => {
    setNoteCounts((current) => ({ ...current, [questionId]: (current[questionId] ?? 0) + 1 }));
  }, []);

  const cardProps = (questionId: string) => ({
    noteCount: noteCounts[questionId] ?? 0,
    onAnswered,
    onNoteAdded,
  });

  const banner =
    user?.role === "aluno" && user.plan && usage ? { planId: user.plan, usage } : null;

  return { banner, noteCounts, onAnswered, onNoteAdded, cardProps };
}
