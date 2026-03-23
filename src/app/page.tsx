"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SpeedTest from "@/components/SpeedTest";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { getUser, saveSpeedTest, getSpeedTests } from "@/lib/db";
import { compareTexts } from "@/lib/diff";
import { calculateAccuracy, calculateWPM } from "@/lib/scoring";
import {
  diagnoseErrors,
  recommendExercises,
  generateDiagnosisSummary,
  type ErrorDiagnosis,
  type Recommendation,
} from "@/lib/recommendations";
import CommandsHelp from "@/components/CommandsHelp";
import LiveTranscript from "@/components/LiveTranscript";
import ThemeToggle from "@/components/ThemeToggle";
import DiffView from "@/components/DiffView";
import type { SpeedTestResult, DiffSegment } from "@/lib/types";

const DEFAULT_TEXT =
  "La reconnaissance vocale est un outil formidable quand on sait bien l'utiliser. Avec un peu de pratique, on peut dicter beaucoup plus vite qu'on ne tape au clavier.";

const EMAIL_WORD_COUNT = 150;
const EMAILS_PER_DAY = 10;

const WPM_BENCHMARKS = [
  { label: "Débutant clavier", wpm: 35, color: "bg-text-muted/30" },
  { label: "Frappe moyenne", wpm: 65, color: "bg-accent/40" },
  { label: "Frappe rapide", wpm: 100, color: "bg-accent/70" },
  { label: "Dictée entraînée", wpm: 180, color: "bg-primary/50" },
];

type Step = "typing" | "dictation" | "results" | "training" | "retest";

interface TestResult {
  wpm: number;
  accuracy: number;
  durationSec: number;
  diffSegments?: DiffSegment[];
}

function formatMinutes(m: number): string {
  if (m < 1) return "< 1 min";
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r > 0 ? `${h}h${r.toString().padStart(2, "0")}` : `${h}h`;
}

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("typing");
  const [typingResult, setTypingResult] = useState<TestResult | null>(null);
  const [dictationResult, setDictationResult] = useState<TestResult | null>(null);
  const [retestResult, setRetestResult] = useState<TestResult | null>(null);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [dictating, setDictating] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [previousBest, setPreviousBest] = useState<{ wpm: number; accuracy: number } | null>(null);
  const dictStartRef = useRef(0);

  const speech = useSpeechRecognition("fr-FR");
  const recorder = useMediaRecorder();

  // Diagnosis & recommendations from dictation result
  const diagnoses = useMemo(
    () => (dictationResult?.diffSegments ? diagnoseErrors(dictationResult.diffSegments) : []),
    [dictationResult]
  );
  const recommendations = useMemo(
    () => (dictationResult?.diffSegments ? recommendExercises(dictationResult.diffSegments) : []),
    [dictationResult]
  );
  const summary = useMemo(
    () => (dictationResult ? generateDiagnosisSummary(dictationResult.accuracy, diagnoses) : ""),
    [dictationResult, diagnoses]
  );

  useEffect(() => {
    getUser().then(async (u) => {
      if (!u || !u.onboardingComplete) {
        router.push("/onboarding");
        return;
      }
      setUserId(u.id);
      setUserName(u.name);

      // Load previous best for comparison
      const prevTests = await getSpeedTests(u.id);
      const dictTests = prevTests.filter((t) => t.mode === "dictation");
      if (dictTests.length > 0) {
        const bestAcc = Math.max(...dictTests.map((t) => t.accuracy));
        const bestWpm = Math.max(...dictTests.map((t) => t.wpm));
        setPreviousBest({ wpm: bestWpm, accuracy: bestAcc });
      }

      setInitialized(true);
    });
  }, [router]);

  // ─── Step 1: Typing ───

  const handleTypingComplete = useCallback(
    async (inputText: string, wpm: number, accuracy: number) => {
      const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;
      const durationSec = wordCount > 0 && wpm > 0 ? (wordCount / wpm) * 60 : 0;
      setTypingResult({ wpm, accuracy, durationSec });

      await saveSpeedTest({
        id: crypto.randomUUID(), userId, mode: "typing",
        referenceText: DEFAULT_TEXT, inputText, accuracy, wpm,
        completedAt: Date.now(),
      } satisfies SpeedTestResult);

      setStep("dictation");
    },
    [userId]
  );

  // ─── Step 2 & 5: Dictation ───

  const startDictation = useCallback(async () => {
    await recorder.start();
    speech.start();
    dictStartRef.current = Date.now();
    setDictating(true);
  }, [speech, recorder]);

  const stopDictation = useCallback(
    async (isRetest: boolean = false) => {
      speech.stop();
      recorder.stop();
      setDictating(false);

      const durationSec = (Date.now() - dictStartRef.current) / 1000;
      const recognized = speech.transcript;
      const diffSegments = compareTexts(DEFAULT_TEXT, recognized);
      const accuracy = calculateAccuracy(diffSegments);
      const wordCount = recognized.trim().split(/\s+/).filter(Boolean).length;
      const wpm = calculateWPM(wordCount, durationSec);

      const result: TestResult = { wpm, accuracy, durationSec, diffSegments };

      await saveSpeedTest({
        id: crypto.randomUUID(), userId, mode: "dictation",
        referenceText: DEFAULT_TEXT, inputText: recognized, accuracy, wpm,
        completedAt: Date.now(),
      } satisfies SpeedTestResult);

      if (isRetest) {
        setRetestResult(result);
        setStep("results");
      } else {
        setDictationResult(result);
        setStep("results");
      }
    },
    [speech, recorder, userId]
  );

  // ─── Reset ───

  const fullReset = useCallback(() => {
    setStep("typing");
    setTypingResult(null);
    setDictationResult(null);
    setRetestResult(null);
  }, []);

  const startRetest = useCallback(() => {
    setRetestResult(null);
    setStep("retest");
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-shimmer w-64 h-8 rounded-lg" />
      </div>
    );
  }

  // The active dictation result (retest overrides initial)
  const activeResult = retestResult || dictationResult;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-bg-card">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Diction Coach</h1>
            <p className="text-[11px] text-text-muted">
              {userName ? `Bonjour ${userName} — ` : ""}Entraînez votre voix, pas votre micro
            </p>
          </div>
          <nav className="flex items-center gap-1.5">
            <Link href="/exercises" className="text-xs px-2.5 py-1.5 rounded-lg hover:bg-bg transition-colors text-text-muted hover:text-text">
              📝 Exercices
            </Link>
            <Link href="/progress" className="text-xs px-2.5 py-1.5 rounded-lg hover:bg-bg transition-colors text-text-muted hover:text-text">
              📊 Progrès
            </Link>
            <CommandsHelp />
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-6">
          {(["typing", "dictation", "results"] as const).map((s, i) => {
            const stepIdx = step === "retest" ? 2 : ["typing", "dictation", "results", "training"].indexOf(step);
            const active = (step === s) || (step === "retest" && s === "dictation") || (step === "training" && s === "results");
            const done = i < stepIdx || step === "results" || step === "training" || step === "retest";
            return (
              <div key={s} className="flex items-center gap-1.5 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  active ? "bg-primary text-white" : done ? "bg-success text-white" : "bg-border text-text-muted"
                }`}>
                  {done && !active ? "✓" : i + 1}
                </div>
                <div className={`text-[11px] shrink-0 ${active ? "text-text font-medium" : "text-text-muted"}`}>
                  {s === "typing" ? "Frappe" : s === "dictation" ? (step === "retest" ? "Re-test" : "Dictée") : "Bilan"}
                </div>
                {i < 2 && <div className="flex-1 h-px bg-border mx-1" />}
              </div>
            );
          })}
        </div>

        {/* ─── STEP 1: Typing ─── */}
        {step === "typing" && (
          <div>
            <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-primary">
                <strong>Étape 1</strong> — Tapez ce texte au clavier le plus vite possible.
              </p>
            </div>
            {previousBest && (
              <div className="mb-4 p-2.5 rounded-lg bg-bg-card border border-border text-xs text-text-muted flex items-center gap-2">
                <span>📈 Votre record dictée :</span>
                <span className="font-medium text-primary">{previousBest.wpm} mots/min</span>
                <span>•</span>
                <span className="font-medium text-success">{previousBest.accuracy}%</span>
              </div>
            )}
            <SpeedTest referenceText={DEFAULT_TEXT} onComplete={handleTypingComplete} />
          </div>
        )}

        {/* ─── STEP 2: Dictation / STEP 5: Retest ─── */}
        {(step === "dictation" || step === "retest") && (
          <div className="space-y-4">
            {typingResult && step === "dictation" && (
              <div className="p-3 rounded-xl bg-success/5 border border-success/20 flex items-center justify-between">
                <span className="text-sm text-success">
                  ⌨️ Frappe : <strong>{typingResult.wpm} mots/min</strong>
                </span>
                <span className="text-xs text-text-muted">{Math.round(typingResult.durationSec)}s</span>
              </div>
            )}

            {step === "retest" && dictationResult && (
              <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-between">
                <span className="text-sm text-accent">
                  Score précédent : <strong>{dictationResult.accuracy}%</strong> à {dictationResult.wpm} mots/min
                </span>
                <span className="text-xs text-text-muted">Battez votre score !</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-primary">
                <strong>{step === "retest" ? "Re-test" : "Étape 2"}</strong> — {step === "retest" ? "Redictez le même texte pour mesurer vos progrès." : "Dictez le même texte à voix haute."}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-bg-card border border-border text-lg leading-relaxed">
              {DEFAULT_TEXT}
            </div>

            {(speech.error || recorder.error) && (
              <div className="p-3 rounded-lg bg-error/10 text-error text-sm">
                {speech.error || recorder.error}
              </div>
            )}

            {!dictating ? (
              <button onClick={startDictation} className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors">
                Commencer la dictée
              </button>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 min-h-[60px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
                    <span className="text-xs text-error font-medium">Enregistrement</span>
                  </div>
                  <div className="text-sm leading-relaxed">
                    <LiveTranscript referenceText={DEFAULT_TEXT} currentTranscript={speech.transcript} interimText={speech.interimTranscript} />
                  </div>
                </div>
                <button onClick={() => stopDictation(step === "retest")} className="w-full py-3 rounded-xl bg-error text-white font-semibold hover:bg-error-light transition-colors">
                  Terminer la dictée
                </button>
              </>
            )}
          </div>
        )}

        {/* ─── STEP 3: Results + Diagnosis ─── */}
        {step === "results" && typingResult && activeResult && (
          <div className="space-y-6">
            {/* Comparison cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-border bg-bg-card text-center">
                <div className="text-2xl mb-1">⌨️</div>
                <div className="text-xs text-text-muted mb-1">Frappe</div>
                <div className="text-3xl font-bold">{typingResult.wpm}</div>
                <div className="text-[10px] text-text-muted">mots/min • {typingResult.accuracy}%</div>
              </div>
              <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 text-center">
                <div className="text-2xl mb-1">🎤</div>
                <div className="text-xs text-text-muted mb-1">Dictée</div>
                <div className="text-3xl font-bold text-primary">{activeResult.wpm}</div>
                <div className="text-[10px] text-text-muted">mots/min • {activeResult.accuracy}%</div>
              </div>
            </div>

            {/* Improvement indicator (retest) */}
            {retestResult && dictationResult && (
              <div className={`p-3 rounded-xl text-center text-sm font-medium ${
                retestResult.accuracy > dictationResult.accuracy
                  ? "bg-success/10 border border-success/30 text-success"
                  : retestResult.accuracy === dictationResult.accuracy
                    ? "bg-accent/10 border border-accent/30 text-accent"
                    : "bg-error/10 border border-error/30 text-error"
              }`}>
                {retestResult.accuracy > dictationResult.accuracy
                  ? `+${retestResult.accuracy - dictationResult.accuracy}% de précision ! Vos exercices ont payé.`
                  : retestResult.accuracy === dictationResult.accuracy
                    ? "Même score — continuez à vous entraîner !"
                    : "Score en baisse — pas de panique, retentez après quelques exercices."}
                {retestResult.wpm !== dictationResult.wpm && (
                  <span className="block text-xs mt-1 opacity-70">
                    Vitesse : {retestResult.wpm > dictationResult.wpm ? "+" : ""}{retestResult.wpm - dictationResult.wpm} mots/min
                  </span>
                )}
              </div>
            )}

            {/* Extrapolation */}
            {(() => {
              const tw = typingResult.wpm || 1;
              const dw = activeResult.wpm || 1;
              const emailTyping = EMAIL_WORD_COUNT / tw;
              const emailDict = EMAIL_WORD_COUNT / dw;
              const savedPerDay = (emailTyping - emailDict) * EMAILS_PER_DAY;
              const savedPerYear = savedPerDay * 230;
              const faster = dw > tw;

              return faster ? (
                <div className="p-4 rounded-xl border border-border bg-bg-card">
                  <div className="text-center mb-3">
                    <span className="text-sm text-text-muted">La dictée est </span>
                    <span className="text-2xl font-bold text-success">{(dw / tw).toFixed(1)}x</span>
                    <span className="text-sm text-text-muted"> plus rapide</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-bg">
                      <div className="text-sm font-bold text-success">+{formatMinutes(savedPerDay)}</div>
                      <div className="text-[10px] text-text-muted">par jour</div>
                    </div>
                    <div className="p-2 rounded-lg bg-bg">
                      <div className="text-sm font-bold text-success">+{formatMinutes(savedPerDay * 22)}</div>
                      <div className="text-[10px] text-text-muted">par mois</div>
                    </div>
                    <div className="p-2 rounded-lg bg-bg">
                      <div className="text-sm font-bold text-success">+{formatMinutes(savedPerYear)}</div>
                      <div className="text-[10px] text-text-muted">par an</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-text-muted text-center mt-2">
                    Sur {EMAILS_PER_DAY} e-mails de ~20 lignes/jour
                  </p>
                </div>
              ) : null;
            })()}

            {/* Diff view */}
            {activeResult.diffSegments && activeResult.diffSegments.some((s) => s.type !== "equal") && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Comparaison détaillée</h3>
                <DiffView segments={activeResult.diffSegments} />
              </div>
            )}

            {/* ─── DIAGNOSIS ─── */}
            {diagnoses.length > 0 && (
              <div className="p-4 rounded-xl border border-border bg-bg-card">
                <h3 className="text-sm font-semibold mb-3">🔍 Diagnostic</h3>
                <p className="text-sm text-text-muted mb-4">{summary}</p>

                <div className="space-y-2">
                  {diagnoses.map((d, i) => (
                    <div key={i} className="p-3 rounded-lg bg-bg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{d.description}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-error/10 text-error">{d.count} erreur{d.count > 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-xs text-text-muted">{d.advice}</p>
                      {d.examples.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {d.examples.map((ex, j) => (
                            <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-error/5 text-error">
                              « {ex.expected} » → « {ex.got} »
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── RECOMMENDED EXERCISES ─── */}
            {recommendations.length > 0 && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                <h3 className="text-sm font-semibold mb-1">🎯 Exercices recommandés</h3>
                <p className="text-xs text-text-muted mb-3">
                  Basés sur vos erreurs — travaillez ces exercices puis re-testez le même texte.
                </p>
                <div className="space-y-2">
                  {recommendations.map((rec) => (
                    <Link
                      key={rec.exercise.id}
                      href={`/exercise/${rec.exercise.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-bg-card border border-border hover:border-primary/30 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{rec.exercise.title}</div>
                        <div className="text-[10px] text-text-muted truncate">
                          {rec.reason} • Niveau {rec.exercise.level}
                        </div>
                      </div>
                      <span className="text-xs text-primary shrink-0 ml-2">Faire →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Benchmarks */}
            <div className="p-4 rounded-xl border border-border bg-bg-card">
              <h3 className="text-xs font-semibold mb-3 text-text-muted">Échelle de vitesse</h3>
              <div className="space-y-2">
                {WPM_BENCHMARKS.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted w-28 shrink-0">{b.label}</span>
                    <div className="flex-1 h-4 bg-bg rounded-full overflow-hidden relative">
                      <div className={`h-full ${b.color} rounded-full`} style={{ width: `${Math.min((b.wpm / 250) * 100, 100)}%` }} />
                      <span className="absolute right-1.5 top-0 h-full flex items-center text-[9px] text-text-muted">{b.wpm}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-primary w-28 shrink-0">🎤 Votre dictée</span>
                  <div className="flex-1 h-4 bg-bg rounded-full overflow-hidden relative">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((activeResult.wpm / 250) * 100, 100)}%` }} />
                    <span className="absolute right-1.5 top-0 h-full flex items-center text-[9px] font-bold text-primary">{activeResult.wpm}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={startRetest} className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors">
                🔄 Re-tester le même texte
              </button>
              <button onClick={fullReset} className="flex-1 py-3 rounded-xl border border-border font-medium hover:bg-bg-card transition-colors">
                Recommencer de zéro
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-4 text-center text-[10px] text-text-muted/50">
        Diction Coach — Vos données restent sur votre appareil
      </footer>
    </div>
  );
}
