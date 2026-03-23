"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import SpeedTest from "@/components/SpeedTest";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { getUser, saveSpeedTest } from "@/lib/db";
import { compareTexts } from "@/lib/diff";
import { calculateAccuracy, calculateWPM } from "@/lib/scoring";
import CommandsHelp from "@/components/CommandsHelp";
import LiveTranscript from "@/components/LiveTranscript";
import type { SpeedTestResult } from "@/lib/types";

const DEFAULT_TEXT =
  "La reconnaissance vocale est un outil formidable quand on sait bien l'utiliser. Avec un peu de pratique, on peut dicter beaucoup plus vite qu'on ne tape au clavier.";

// E-mail type de ~20 lignes pour l'extrapolation
const EMAIL_WORD_COUNT = 150; // mots dans un e-mail courant de 20 lignes
const EMAILS_PER_DAY = 10;

const WPM_BENCHMARKS = [
  { label: "Débutant au clavier", wpm: 35, color: "bg-text-muted/30" },
  { label: "Frappe moyenne", wpm: 65, color: "bg-accent/40" },
  { label: "Frappe rapide", wpm: 100, color: "bg-accent/70" },
  { label: "Dactylographe pro", wpm: 130, color: "bg-success/50" },
  { label: "Dictée entraînée", wpm: 180, color: "bg-primary/50" },
  { label: "Sténographe", wpm: 250, color: "bg-primary/80" },
];

type Step = "typing" | "dictation" | "results";

interface TestResult {
  mode: "typing" | "dictation";
  wpm: number;
  accuracy: number;
  durationSec: number;
}

function formatMinutes(totalMin: number): string {
  if (totalMin < 1) return "< 1 min";
  if (totalMin < 60) return `${Math.round(totalMin)} min`;
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

function formatHours(totalMin: number): string {
  if (totalMin < 60) return `${Math.round(totalMin)} min`;
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

export default function SpeedPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("typing");
  const [typingResult, setTypingResult] = useState<TestResult | null>(null);
  const [dictationResult, setDictationResult] = useState<TestResult | null>(null);
  const [userId, setUserId] = useState("");
  const [dictating, setDictating] = useState(false);
  const dictStartRef = useRef(0);

  const speech = useSpeechRecognition("fr-FR");
  const recorder = useMediaRecorder();

  useEffect(() => {
    getUser().then((u) => {
      if (!u || !u.onboardingComplete) {
        router.push("/onboarding");
        return;
      }
      setUserId(u.id);
    });
  }, [router]);

  // ─── Step 1: Typing ───

  const handleTypingComplete = useCallback(
    async (inputText: string, wpm: number, accuracy: number) => {
      const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;
      const durationSec = wordCount > 0 && wpm > 0 ? (wordCount / wpm) * 60 : 0;

      const result: TestResult = { mode: "typing", wpm, accuracy, durationSec };
      setTypingResult(result);

      await saveSpeedTest({
        id: crypto.randomUUID(),
        userId,
        mode: "typing",
        referenceText: DEFAULT_TEXT,
        inputText,
        accuracy,
        wpm,
        completedAt: Date.now(),
      } satisfies SpeedTestResult);

      // Auto-advance to dictation
      setStep("dictation");
    },
    [userId]
  );

  // ─── Step 2: Dictation (same text) ───

  const startDictation = useCallback(() => {
    setDictating(true);
    dictStartRef.current = Date.now();
    speech.start();
    recorder.start();
  }, [speech, recorder]);

  const stopDictation = useCallback(async () => {
    speech.stop();
    recorder.stop();
    setDictating(false);

    const durationSec = (Date.now() - dictStartRef.current) / 1000;
    const recognized = speech.transcript;
    const diffResult = compareTexts(DEFAULT_TEXT, recognized);
    const accuracy = calculateAccuracy(diffResult);
    const wordCount = recognized.trim().split(/\s+/).filter(Boolean).length;
    const wpm = calculateWPM(wordCount, durationSec);

    const result: TestResult = { mode: "dictation", wpm, accuracy, durationSec };
    setDictationResult(result);

    await saveSpeedTest({
      id: crypto.randomUUID(),
      userId,
      mode: "dictation",
      referenceText: DEFAULT_TEXT,
      inputText: recognized,
      accuracy,
      wpm,
      completedAt: Date.now(),
    } satisfies SpeedTestResult);

    setStep("results");
  }, [speech, recorder, userId]);

  // ─── Extrapolation calculations ───

  const extrapolation = typingResult && dictationResult ? (() => {
    const typingWpm = typingResult.wpm || 1;
    const dictationWpm = dictationResult.wpm || 1;

    // Temps pour rédiger un e-mail de 150 mots (en minutes)
    const emailTypingMin = EMAIL_WORD_COUNT / typingWpm;
    const emailDictationMin = EMAIL_WORD_COUNT / dictationWpm;
    const savedPerEmail = emailTypingMin - emailDictationMin;

    // Projections (en minutes)
    const perDay = savedPerEmail * EMAILS_PER_DAY;
    const perWeek = perDay * 5; // jours ouvrés
    const perMonth = perDay * 22;
    const perYear = perDay * 230;

    const ratio = dictationWpm / typingWpm;

    return {
      emailTypingMin,
      emailDictationMin,
      savedPerEmail,
      perDay,
      perWeek,
      perMonth,
      perYear,
      ratio,
      isFaster: dictationWpm > typingWpm,
    };
  })() : null;

  return (
    <div className="min-h-screen bg-bg p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-text-muted hover:text-text text-sm flex items-center gap-1"
          >
            ← Retour
          </button>
          <CommandsHelp />
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Clavier vs Dictée
        </h1>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["typing", "dictation", "results"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? "bg-primary text-white"
                    : i < ["typing", "dictation", "results"].indexOf(step)
                      ? "bg-success text-white"
                      : "bg-border text-text-muted"
                }`}
              >
                {i < ["typing", "dictation", "results"].indexOf(step)
                  ? "✓"
                  : i + 1}
              </div>
              <span
                className={`text-xs ${
                  step === s ? "text-text font-medium" : "text-text-muted"
                }`}
              >
                {s === "typing"
                  ? "Frappe"
                  : s === "dictation"
                    ? "Dictée"
                    : "Résultats"}
              </span>
              {i < 2 && (
                <div className="w-8 h-px bg-border mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* ─── Step 1: Typing ─── */}
        {step === "typing" && (
          <div>
            <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-primary">
                <strong>Étape 1/3</strong> — Tapez ce texte au clavier le plus vite possible.
                On mesurera ensuite la dictée du même texte.
              </p>
            </div>
            <SpeedTest
              referenceText={DEFAULT_TEXT}
              onComplete={handleTypingComplete}
            />
          </div>
        )}

        {/* ─── Step 2: Dictation ─── */}
        {step === "dictation" && (
          <div className="space-y-4">
            {/* Typing result summary */}
            {typingResult && (
              <div className="p-3 rounded-xl bg-success/5 border border-success/20 flex items-center justify-between">
                <span className="text-sm text-success">
                  ⌨️ Frappe : <strong>{typingResult.wpm} mots/min</strong> ({typingResult.accuracy}%)
                </span>
                <span className="text-xs text-text-muted">
                  en {Math.round(typingResult.durationSec)}s
                </span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-primary">
                <strong>Étape 2/3</strong> — Maintenant dictez le même texte à voix haute.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-bg-card border border-border text-lg leading-relaxed">
              {DEFAULT_TEXT}
            </div>

            {!dictating ? (
              <button
                onClick={startDictation}
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors"
              >
                Commencer la dictée
              </button>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 min-h-[60px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
                    <span className="text-xs text-error font-medium">
                      Enregistrement
                    </span>
                  </div>
                  <div className="text-sm leading-relaxed">
                    <LiveTranscript
                      referenceText={DEFAULT_TEXT}
                      currentTranscript={speech.transcript}
                      interimText={speech.interimTranscript}
                    />
                  </div>
                </div>
                <button
                  onClick={stopDictation}
                  className="w-full py-3 rounded-xl bg-error text-white font-semibold hover:bg-error-light transition-colors"
                >
                  Terminer la dictée
                </button>
              </>
            )}
          </div>
        )}

        {/* ─── Step 3: Results + Extrapolation ─── */}
        {step === "results" && typingResult && dictationResult && extrapolation && (
          <div className="space-y-6">

            {/* Side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-border bg-bg-card text-center">
                <div className="text-3xl mb-2">⌨️</div>
                <div className="text-sm text-text-muted mb-1">Frappe clavier</div>
                <div className="text-4xl font-bold text-text">{typingResult.wpm}</div>
                <div className="text-xs text-text-muted">mots/min</div>
                <div className="mt-2 text-sm text-text-muted">
                  Précision : {typingResult.accuracy}% — {Math.round(typingResult.durationSec)}s
                </div>
              </div>
              <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 text-center">
                <div className="text-3xl mb-2">🎤</div>
                <div className="text-sm text-text-muted mb-1">Dictée vocale</div>
                <div className="text-4xl font-bold text-primary">{dictationResult.wpm}</div>
                <div className="text-xs text-text-muted">mots/min</div>
                <div className="mt-2 text-sm text-text-muted">
                  Précision : {dictationResult.accuracy}% — {Math.round(dictationResult.durationSec)}s
                </div>
              </div>
            </div>

            {/* Ratio */}
            <div className={`p-4 rounded-2xl text-center ${
              extrapolation.isFaster ? "bg-success/10 border border-success/30" : "bg-accent/10 border border-accent/30"
            }`}>
              {extrapolation.isFaster ? (
                <p className="text-lg font-semibold text-success">
                  La dictée est <span className="text-2xl">{extrapolation.ratio.toFixed(1)}x</span> plus rapide que votre frappe
                </p>
              ) : (
                <p className="text-lg font-semibold text-accent">
                  Votre frappe est encore plus rapide — mais avec de la pratique, la dictée vous dépassera !
                </p>
              )}
            </div>

            {/* Benchmark chart */}
            <div className="p-4 rounded-xl border border-border bg-bg-card">
              <h3 className="text-sm font-semibold mb-4">Où vous situez-vous ?</h3>
              <div className="space-y-2.5">
                {WPM_BENCHMARKS.map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="text-xs text-text-muted w-32 shrink-0">{b.label}</span>
                    <div className="flex-1 h-5 bg-bg rounded-full overflow-hidden relative">
                      <div className={`h-full ${b.color} rounded-full`} style={{ width: `${Math.min((b.wpm / 300) * 100, 100)}%` }} />
                      <span className="absolute right-2 top-0 h-full flex items-center text-[10px] text-text-muted">{b.wpm}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-accent w-32 shrink-0">⌨️ Votre frappe</span>
                  <div className="flex-1 h-5 bg-bg rounded-full overflow-hidden relative">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((typingResult.wpm / 300) * 100, 100)}%` }} />
                    <span className="absolute right-2 top-0 h-full flex items-center text-[10px] font-bold text-accent">{typingResult.wpm}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-primary w-32 shrink-0">🎤 Votre dictée</span>
                  <div className="flex-1 h-5 bg-bg rounded-full overflow-hidden relative">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((dictationResult.wpm / 300) * 100, 100)}%` }} />
                    <span className="absolute right-2 top-0 h-full flex items-center text-[10px] font-bold text-primary">{dictationResult.wpm}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Extrapolation: Économie de temps ─── */}
            <div className="p-5 rounded-2xl border border-border bg-bg-card">
              <h3 className="text-sm font-semibold mb-1">
                Économie de temps estimée
              </h3>
              <p className="text-xs text-text-muted mb-4">
                Basée sur {EMAILS_PER_DAY} e-mails de ~{EMAIL_WORD_COUNT} mots ({"\u2248"}20 lignes) par jour
              </p>

              {/* Per-email comparison */}
              <div className="mb-5 p-3 rounded-xl bg-bg">
                <div className="text-xs text-text-muted mb-2 font-medium">Temps par e-mail :</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>⌨️ Frappe</span>
                      <span className="font-mono">{formatMinutes(extrapolation.emailTypingMin)}</span>
                    </div>
                    <div className="h-3 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>🎤 Dictée</span>
                      <span className="font-mono">{formatMinutes(extrapolation.emailDictationMin)}</span>
                    </div>
                    <div className="h-3 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min((extrapolation.emailDictationMin / extrapolation.emailTypingMin) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Savings table */}
              {extrapolation.isFaster ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <SavingsCard
                      period="Par jour"
                      saved={extrapolation.perDay}
                      emoji="📅"
                    />
                    <SavingsCard
                      period="Par semaine"
                      saved={extrapolation.perWeek}
                      emoji="📆"
                    />
                    <SavingsCard
                      period="Par mois"
                      saved={extrapolation.perMonth}
                      emoji="🗓️"
                    />
                    <SavingsCard
                      period="Par an"
                      saved={extrapolation.perYear}
                      emoji="🎉"
                    />
                  </div>

                  {/* Yearly highlight */}
                  <div className="mt-4 p-4 rounded-xl bg-success/10 border border-success/30 text-center">
                    <p className="text-sm text-text-muted mb-1">En un an, vous économisez</p>
                    <p className="text-3xl font-bold text-success">
                      {formatHours(extrapolation.perYear)}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      soit {Math.round(extrapolation.perYear / 60 / 8)} journée{Math.round(extrapolation.perYear / 60 / 8) > 1 ? "s" : ""} de travail complète{Math.round(extrapolation.perYear / 60 / 8) > 1 ? "s" : ""} de 8h
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 text-center">
                  <p className="text-sm text-accent">
                    Votre dictée est encore plus lente que votre frappe.<br />
                    Avec de l&apos;entraînement, la dictée deviendra 2 à 3x plus rapide !
                  </p>
                  <p className="text-xs text-text-muted mt-2">
                    Objectif réaliste après entraînement : {Math.max(typingResult.wpm * 2, 120)} mots/min en dictée
                  </p>

                  {/* Show projected savings */}
                  {(() => {
                    const projectedWpm = Math.max(typingResult.wpm * 2, 120);
                    const projectedEmailMin = EMAIL_WORD_COUNT / projectedWpm;
                    const projectedSavedPerDay =
                      (extrapolation.emailTypingMin - projectedEmailMin) * EMAILS_PER_DAY;
                    const projectedPerYear = projectedSavedPerDay * 230;
                    return projectedSavedPerDay > 0 ? (
                      <div className="mt-3 p-3 rounded-lg bg-bg">
                        <p className="text-xs text-text-muted">
                          À {projectedWpm} mots/min, vous économiseriez{" "}
                          <strong className="text-success">{formatHours(projectedPerYear)}/an</strong>
                          {" "}({formatMinutes(projectedSavedPerDay)}/jour)
                        </p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep("typing");
                  setTypingResult(null);
                  setDictationResult(null);
                }}
                className="flex-1 py-3 rounded-xl border border-border font-medium hover:bg-bg transition-colors"
              >
                Recommencer
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors"
              >
                S&apos;entraîner
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SavingsCard({
  period,
  saved,
  emoji,
}: {
  period: string;
  saved: number;
  emoji: string;
}) {
  return (
    <div className="p-2.5 rounded-xl bg-bg">
      <div className="text-lg mb-0.5">{emoji}</div>
      <div className="text-sm font-bold text-success">
        {saved > 0 ? `+${formatMinutes(saved)}` : formatMinutes(Math.abs(saved))}
      </div>
      <div className="text-[10px] text-text-muted">{period}</div>
    </div>
  );
}
