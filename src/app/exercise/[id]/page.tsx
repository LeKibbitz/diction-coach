"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getExercise } from "@/data/exercises";
import { getUser } from "@/lib/db";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { useExerciseSession } from "@/hooks/useExerciseSession";
import LiveWaveform from "@/components/LiveWaveform";
import DiffView from "@/components/DiffView";
import ScoreDisplay from "@/components/ScoreDisplay";
import CommandsHelp from "@/components/CommandsHelp";
import LiveTranscript from "@/components/LiveTranscript";
import type { UserProfile } from "@/lib/types";

export default function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const exercise = getExercise(id);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [initialized, setInitialized] = useState(false);

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

  if (!exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🤷</div>
          <h1 className="text-xl font-bold mb-2">Exercice introuvable</h1>
          <button
            onClick={() => router.push("/")}
            className="text-primary hover:underline"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  if (!initialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-shimmer w-64 h-8 rounded-lg" />
      </div>
    );
  }

  return <ExerciseEngine exercise={exercise} userId={user.id} />;
}

function ExerciseEngine({
  exercise,
  userId,
}: {
  exercise: NonNullable<ReturnType<typeof getExercise>>;
  userId: string;
}) {
  const router = useRouter();
  const speech = useSpeechRecognition("fr-FR");
  const recorder = useMediaRecorder();
  const session = useExerciseSession(exercise, userId);

  const handleStart = useCallback(() => {
    session.startCountdown(() => {
      speech.start();
      recorder.start();
    });
  }, [session, speech, recorder]);

  const handleStop = useCallback(async () => {
    speech.stop();
    recorder.stop();

    // Small delay to let recorder finalize
    await new Promise((r) => setTimeout(r, 300));

    await session.finishRecording(
      speech.transcript,
      speech.getResults(),
      recorder.audioBlob || undefined,
      recorder.getDuration()
    );
  }, [speech, recorder, session]);

  // ─── Prep Phase ───
  if (session.phase === "prep") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push("/")}
              className="text-text-muted hover:text-text text-sm flex items-center gap-1"
            >
              ← Retour
            </button>
            <CommandsHelp />
          </div>

          <div className="bg-bg-card rounded-3xl border border-border p-8">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  Niveau {exercise.level}
                </span>
                <span className="text-xs text-text-muted capitalize">
                  {exercise.category}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {exercise.title}
              </h1>
              <p className="text-text-muted mt-1 italic">
                {exercise.description}
              </p>
            </div>

            {/* Reference text */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-text-muted mb-2">
                Texte à dicter :
              </h2>
              <div className="p-4 rounded-xl bg-bg border border-border text-lg leading-relaxed whitespace-pre-wrap">
                {exercise.referenceText}
              </div>
            </div>

            {/* Hints */}
            {exercise.hints && exercise.hints.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-text-muted mb-2">
                  Conseils :
                </h2>
                <ul className="space-y-1">
                  {exercise.hints.map((hint, i) => (
                    <li
                      key={i}
                      className="text-sm text-text-muted flex items-start gap-2"
                    >
                      <span className="text-accent">💡</span>
                      {hint}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {speech.error && (
              <div className="mb-4 p-3 rounded-lg bg-error/10 text-error text-sm">
                {speech.error}
              </div>
            )}

            <button
              onClick={handleStart}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary-light transition-colors"
            >
              Commencer la dictée
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Countdown Phase ───
  if (session.phase === "countdown") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            key={session.countdownValue}
            className="animate-countdown text-8xl font-bold text-primary"
          >
            {session.countdownValue}
          </div>
          <p className="text-text-muted mt-4">Préparez-vous à parler...</p>
        </div>
      </div>
    );
  }

  // ─── Recording Phase ───
  if (session.phase === "recording") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-bg-card rounded-3xl border border-border p-8">
            {/* Recording indicator */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-error animate-pulse" />
                <span className="text-sm font-medium text-error">
                  Enregistrement en cours
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CommandsHelp />
                <span className="font-mono text-text-muted text-sm">
                  {Math.floor(session.elapsedTime / 60)}:
                  {(session.elapsedTime % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Reference text */}
            <div className="mb-4">
              <h2 className="text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
                Texte à lire
              </h2>
              <div className="p-4 rounded-xl bg-bg border border-border text-lg leading-relaxed whitespace-pre-wrap">
                {exercise.referenceText}
              </div>
            </div>

            {/* Live transcript - raw */}
            <div className="mb-2">
              <h2 className="text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
                Ce que le micro entend
              </h2>
              <div className="p-3 rounded-xl bg-bg border border-border text-sm leading-relaxed min-h-[40px] text-text-muted">
                {speech.rawTranscript}
                {speech.interimTranscript && (
                  <span className="text-text-muted/50">
                    {speech.interimTranscript}
                  </span>
                )}
                {!speech.rawTranscript && !speech.interimTranscript && (
                  <span className="text-text-muted/40 italic">
                    En attente de votre voix...
                  </span>
                )}
              </div>
            </div>

            {/* Live transcript - processed with error highlighting */}
            <div className="mb-4">
              <h2 className="text-xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
                Résultat après commandes <span className="font-normal">(vert = correct, rouge = erreur)</span>
              </h2>
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-lg leading-relaxed min-h-[50px] whitespace-pre-wrap">
                <LiveTranscript
                  referenceText={exercise.referenceText}
                  currentTranscript={speech.transcript}
                  interimText={speech.interimTranscript}
                />
              </div>
            </div>

            {/* Waveform */}
            <div className="mb-6">
              <LiveWaveform
                analyser={recorder.getAnalyser()}
                isActive={recorder.isRecording}
              />
            </div>

            <button
              onClick={handleStop}
              className="w-full py-3 rounded-xl bg-error text-white font-semibold text-lg hover:bg-error-light transition-colors"
            >
              Terminer la dictée
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Results Phase ───
  if (session.phase === "results" && session.result) {
    const r = session.result;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-bg-card rounded-3xl border border-border p-8">
            <h1 className="text-2xl font-bold tracking-tight text-center mb-6">
              Résultats
            </h1>

            <ScoreDisplay
              accuracy={r.accuracy}
              wpm={r.wpm}
              errorCount={r.errorCount}
              errorTypes={r.errorTypes}
              duration={r.audioDuration}
            />

            <div className="mt-8">
              <h2 className="text-sm font-semibold mb-3">
                Comparaison détaillée
              </h2>
              <DiffView segments={r.diffResult} />
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3">
              {r.audioBlob && (
                <button
                  onClick={() =>
                    router.push(`/exercise/${exercise.id}/timeline?session=${r.id}`)
                  }
                  className="w-full py-3 rounded-xl bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                >
                  🎵 Voir la timeline audio
                </button>
              )}
              <div className="flex gap-3">
                <button
                  onClick={session.reset}
                  className="flex-1 py-3 rounded-xl border border-border font-medium hover:bg-bg transition-colors"
                >
                  Recommencer
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors"
                >
                  Exercice suivant
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
