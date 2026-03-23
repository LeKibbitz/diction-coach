"use client";

import { useState, useEffect } from "react";
import { t, type Locale } from "@/lib/i18n";
import { BMC_URL, type BmcContext, dismissBmc } from "@/hooks/useBmcTrigger";

interface BmcPromptProps {
  context: BmcContext;
  locale?: Locale;
  onDismiss: () => void;
}

const MESSAGES: Record<BmcContext["reason"], Record<string, string>> = {
  engagement: {
    fr: "3 sessions déjà ! Vous progressez vite.",
    en: "3 sessions already! You're making great progress.",
    it: "Già 3 sessioni! Stai facendo grandi progressi.",
    es: "¡Ya 3 sesiones! Estás progresando rápido.",
    de: "Schon 3 Sitzungen! Du machst tolle Fortschritte.",
  },
  achievement: {
    fr: "90%+ de précision — votre diction est remarquable !",
    en: "90%+ accuracy — your diction is remarkable!",
    it: "90%+ di precisione — la tua dizione è notevole!",
    es: "90%+ de precisión — ¡tu dicción es notable!",
    de: "90%+ Genauigkeit — deine Diktion ist bemerkenswert!",
  },
  streak: {
    fr: "5 jours d'affilée — l'habitude est là.",
    en: "5 days in a row — the habit is formed.",
    it: "5 giorni consecutivi — l'abitudine è fatta.",
    es: "5 días seguidos — el hábito está formado.",
    de: "5 Tage am Stück — die Gewohnheit ist da.",
  },
  milestone: {
    fr: "Encore une étape franchie !",
    en: "Another milestone reached!",
    it: "Un altro traguardo raggiunto!",
    es: "¡Otro hito alcanzado!",
    de: "Noch ein Meilenstein erreicht!",
  },
};

export default function BmcPrompt({ context, locale = "fr", onDismiss }: BmcPromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    dismissBmc(context);
    setTimeout(onDismiss, 300);
  };

  const message = MESSAGES[context.reason][locale] || MESSAGES[context.reason].fr;

  return (
    <div
      className={`mt-4 p-4 rounded-2xl border border-accent/20 bg-accent/5 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">☕</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-0.5">{message}</p>
          <p className="text-xs text-text-muted">
            {t(locale, "badge.coffeeNote")}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-lg hover:bg-border/50 text-text-muted hover:text-text transition-colors"
          aria-label="Fermer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <a
        href={BMC_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block w-full py-2 rounded-xl bg-accent/10 text-accent font-medium hover:bg-accent/20 transition-colors text-sm text-center"
      >
        ☕ {t(locale, "badge.coffee")}
      </a>
    </div>
  );
}
