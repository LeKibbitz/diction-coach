"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/db";
import { useProgress } from "@/hooks/useProgress";
import { getAllExercises } from "@/data/exercises";
import type { UserProfile } from "@/lib/types";

const ACHIEVEMENTS = [
  {
    id: "first-word",
    title: "Premier mot",
    description: "Terminer votre premier exercice",
    icon: "🎤",
    check: (s: { totalSessions: number }) => s.totalSessions >= 1,
  },
  {
    id: "perfect",
    title: "Sans faute",
    description: "Obtenir 100% de précision sur un exercice",
    icon: "💎",
    check: (s: { bestAccuracy: number }) => s.bestAccuracy === 100,
  },
  {
    id: "not-the-mic",
    title: "Le micro n'y est pour rien",
    description: "Atteindre 90% de précision moyenne",
    icon: "🏆",
    check: (s: { averageAccuracy: number }) => s.averageAccuracy >= 90,
  },
  {
    id: "faster-than-fingers",
    title: "Plus rapide que vos doigts",
    description: "Dépasser 120 mots par minute en dictée",
    icon: "⚡",
    check: (s: { bestWpm: number }) => s.bestWpm >= 120,
  },
  {
    id: "regular",
    title: "Régulier",
    description: "S'entraîner 3 jours d'affilée",
    icon: "🔥",
    check: (s: { currentStreak: number }) => s.currentStreak >= 3,
  },
  {
    id: "half-done",
    title: "À mi-chemin",
    description: "Compléter la moitié des exercices",
    icon: "🎯",
    check: (s: { totalExercisesCompleted: number }) =>
      s.totalExercisesCompleted >= Math.floor(getAllExercises().length / 2),
  },
  {
    id: "tenacious",
    title: "Tenace",
    description: "Compléter 50 sessions d'entraînement",
    icon: "💪",
    check: (s: { totalSessions: number }) => s.totalSessions >= 50,
  },
  {
    id: "master",
    title: "Maître de la diction",
    description: "Compléter tous les exercices avec 80%+ de précision",
    icon: "👑",
    check: (s: { totalExercisesCompleted: number }) =>
      s.totalExercisesCompleted >= getAllExercises().length,
  },
];

export default function ProgressPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const { progress, sessions, stats, loading } = useProgress();

  useEffect(() => {
    getUser().then((u) => {
      if (!u || !u.onboardingComplete) {
        router.push("/onboarding");
        return;
      }
      setUser(u);
    });
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-shimmer w-64 h-8 rounded-lg" />
      </div>
    );
  }

  const totalExercises = getAllExercises().length;

  return (
    <div className="min-h-screen bg-bg p-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push("/")}
          className="text-text-muted hover:text-text text-sm mb-6 flex items-center gap-1"
        >
          ← Retour
        </button>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Votre progression
        </h1>
        <p className="text-text-muted mb-8">
          Bienvenue, {user.name}. Voici votre historique d&apos;entraînement.
        </p>

        {!stats ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-bold mb-2">Pas encore de données</h2>
            <p className="text-text-muted mb-4">
              Faites votre premier exercice pour voir votre progression ici.
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors"
            >
              Commencer un exercice
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Sessions"
                value={stats.totalSessions}
                emoji="🎯"
              />
              <StatCard
                label="Exercices"
                value={`${stats.totalExercisesCompleted}/${totalExercises}`}
                emoji="📝"
              />
              <StatCard
                label="Meilleure précision"
                value={`${stats.bestAccuracy}%`}
                emoji="💎"
              />
              <StatCard
                label="Meilleur WPM"
                value={stats.bestWpm}
                emoji="⚡"
              />
            </div>

            {/* Average & streak */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-border bg-bg-card">
                <div className="text-sm text-text-muted mb-1">
                  Précision moyenne
                </div>
                <div className="text-3xl font-bold text-primary">
                  {stats.averageAccuracy}%
                </div>
                <div className="mt-2 h-2 rounded-full bg-bg overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${stats.averageAccuracy}%` }}
                  />
                </div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-bg-card">
                <div className="text-sm text-text-muted mb-1">
                  Série en cours
                </div>
                <div className="text-3xl font-bold text-accent">
                  {stats.currentStreak} jour{stats.currentStreak !== 1 ? "s" : ""}
                </div>
                <div className="text-sm text-text-muted mt-1">
                  {stats.totalPracticeDays} jour
                  {stats.totalPracticeDays !== 1 ? "s" : ""} d&apos;entraînement
                  au total
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Badges</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ACHIEVEMENTS.map((a) => {
                  const unlocked = a.check(stats);
                  return (
                    <div
                      key={a.id}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        unlocked
                          ? "border-accent bg-accent/5"
                          : "border-border bg-bg opacity-50"
                      }`}
                    >
                      <div className={`text-3xl mb-1 ${unlocked ? "" : "grayscale"}`}>
                        {a.icon}
                      </div>
                      <div className="text-xs font-semibold">{a.title}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        {a.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent sessions */}
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Dernières sessions
              </h2>
              <div className="space-y-2">
                {sessions.slice(0, 10).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-bg-card"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {s.exerciseId}
                      </div>
                      <div className="text-xs text-text-muted">
                        {new Date(s.completedAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span
                        className={
                          s.accuracy >= 80
                            ? "text-success font-medium"
                            : s.accuracy >= 50
                              ? "text-accent font-medium"
                              : "text-error"
                        }
                      >
                        {s.accuracy}%
                      </span>
                      <span className="text-text-muted">
                        {s.wpm} mots/min
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  emoji,
}: {
  label: string;
  value: string | number;
  emoji: string;
}) {
  return (
    <div className="p-3 rounded-xl border border-border bg-bg-card text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}
