"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MicPermission from "@/components/MicPermission";
import { getUser, saveUser } from "@/lib/db";
import type { UserProfile } from "@/lib/types";

const STEPS = [
  {
    emoji: "🤦",
    title: "Ce n'est pas le micro",
    body: "Vous pensez que votre micro est nul ? Que la reconnaissance vocale ne marche pas ? Mauvaise nouvelle : le problème, c'est probablement vous.",
    subtext: "Mais ne vous inquiétez pas. Vous n'êtes pas seul.",
  },
  {
    emoji: "🤖",
    title: "La machine est innocente",
    body: "Votre ordinateur traite 16 000 échantillons par seconde. Il entend TOUT. Y compris vos « euh », vos mots avalés, et vos fins de phrases murmurées dans votre barbe.",
    subtext: "Le micro n'a pas de problème d'audition. Il a un problème de locuteur.",
  },
  {
    emoji: "🎯",
    title: "La bonne nouvelle",
    body: "La diction, ça se travaille. En quelques exercices, vous allez dicter plus vite que vous ne tapez — et sans fautes. On va même vous le prouver.",
    subtext: "Spoiler : la dictée est 3 à 5 fois plus rapide que la frappe au clavier.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [micGranted, setMicGranted] = useState(false);
  const [saving, setSaving] = useState(false);

  const isLastStep = step >= STEPS.length; // step 3 = setup step

  const handleNext = () => {
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  const handleFinish = useCallback(async () => {
    if (!name.trim() || !micGranted) return;
    setSaving(true);

    let user = await getUser();
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        name: name.trim(),
        createdAt: Date.now(),
        speechLang: "fr-FR",
        onboardingComplete: true,
        typingWpm: null,
      } satisfies UserProfile;
    } else {
      user.name = name.trim();
      user.onboardingComplete = true;
    }

    await saveUser(user);
    router.push("/");
  }, [name, micGranted, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[...STEPS, null].map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === step
                  ? "bg-primary scale-125"
                  : i < step
                    ? "bg-primary/40"
                    : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Content card */}
        <div className="bg-bg-card rounded-3xl shadow-sm border border-border p-8 min-h-[360px] flex flex-col">
          {!isLastStep ? (
            <>
              {/* Info steps */}
              <div className="text-center flex-1 flex flex-col justify-center">
                <div className="text-6xl mb-6">{STEPS[step].emoji}</div>
                <h1 className="text-2xl font-bold tracking-tight mb-4">
                  {STEPS[step].title}
                </h1>
                <p className="text-text-muted leading-relaxed mb-4">
                  {STEPS[step].body}
                </p>
                <p className="text-sm text-text-muted/70 italic">
                  {STEPS[step].subtext}
                </p>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleBack}
                  disabled={step === 0}
                  className="px-4 py-2 text-text-muted hover:text-text transition-colors disabled:opacity-0"
                >
                  Retour
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors"
                >
                  Suivant
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Setup step */}
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🚀</div>
                <h1 className="text-2xl font-bold tracking-tight">
                  C&apos;est parti !
                </h1>
              </div>

              <div className="space-y-5 flex-1">
                {/* Name input */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Votre prénom
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Comment vous appelez-vous ?"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                {/* Mic permission */}
                <MicPermission onGranted={() => setMicGranted(true)} />
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-text-muted hover:text-text transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleFinish}
                  disabled={!name.trim() || !micGranted || saving}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? "Préparation..." : "Commencer l'entraînement"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-muted/50 mt-6">
          Diction Coach — Vos données restent sur votre appareil
        </p>
      </div>
    </div>
  );
}
