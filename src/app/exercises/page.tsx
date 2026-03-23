"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/db";
import { useProgress } from "@/hooks/useProgress";
import { getAllExercises, CATEGORIES } from "@/data/exercises";
import ExerciseCard from "@/components/ExerciseCard";
import ThemeToggle from "@/components/ThemeToggle";
import type { UserProfile, ExerciseCategory } from "@/lib/types";

export default function ExercisesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory | "all">("all");
  const { progress, stats, loading } = useProgress();

  useEffect(() => {
    getUser().then((u) => {
      if (!u || !u.onboardingComplete) {
        router.push("/onboarding");
        return;
      }
      setUser(u);
      setInitialized(true);
    });
  }, [router]);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-shimmer w-64 h-8 rounded-lg" />
      </div>
    );
  }

  const allExercises = getAllExercises();
  const filteredExercises =
    activeCategory === "all"
      ? allExercises
      : allExercises.filter((e) => e.category === activeCategory);

  const progressMap = new Map(progress.map((p) => [p.exerciseId, p]));

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tous les exercices</h1>
            <p className="text-xs text-text-muted">
              Bonjour {user?.name} — {allExercises.length} exercices disponibles
            </p>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/" className="text-sm px-3 py-1.5 rounded-lg hover:bg-bg transition-colors text-text-muted hover:text-text">
              🏠 Accueil
            </Link>
            <Link href="/progress" className="text-sm px-3 py-1.5 rounded-lg hover:bg-bg transition-colors text-text-muted hover:text-text">
              📊 Progression
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            <div className="p-3 rounded-xl bg-bg-card border border-border text-center">
              <div className="text-lg font-bold text-primary">{stats.totalSessions}</div>
              <div className="text-[10px] text-text-muted">sessions</div>
            </div>
            <div className="p-3 rounded-xl bg-bg-card border border-border text-center">
              <div className="text-lg font-bold text-success">{stats.averageAccuracy}%</div>
              <div className="text-[10px] text-text-muted">précision moy.</div>
            </div>
            <div className="p-3 rounded-xl bg-bg-card border border-border text-center">
              <div className="text-lg font-bold text-accent">{stats.bestWpm}</div>
              <div className="text-[10px] text-text-muted">meilleur WPM</div>
            </div>
            <div className="p-3 rounded-xl bg-bg-card border border-border text-center">
              <div className="text-lg font-bold text-error">{stats.currentStreak}🔥</div>
              <div className="text-[10px] text-text-muted">série jours</div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === "all" ? "bg-primary text-white" : "bg-bg-card border border-border text-text-muted hover:text-text"
            }`}
          >
            Tout ({allExercises.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = allExercises.filter((e) => e.category === cat.id).length;
            return (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === cat.id ? "bg-primary text-white" : "bg-bg-card border border-border text-text-muted hover:text-text"
                }`}
              >
                {cat.emoji} {cat.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredExercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} progress={progressMap.get(exercise.id)} />
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-text-muted/50">
        Diction Coach — Vos données restent sur votre appareil
      </footer>
    </div>
  );
}
