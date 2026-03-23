"use client";

import { useState, useEffect } from "react";
import { t, type Locale } from "@/lib/i18n";

interface BadgeCelebrationProps {
  badge: {
    icon: string;
    title: string;
    description: string;
    followUp: string;
  };
  onDismiss: () => void;
  locale?: Locale;
}

const BMC_URL = "https://buymeacoffee.com/lekibbitz";

export default function BadgeCelebration({ badge, onDismiss, locale = "fr" }: BadgeCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ${
        visible ? "bg-bg-dark/70 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={onDismiss}
    >
      <div
        className={`bg-bg-card border border-accent/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transition-all duration-500 ${
          visible ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="animate-score text-7xl mb-4">{badge.icon}</div>
        <h2 className="text-2xl font-bold tracking-tight mb-1">
          {badge.title}
        </h2>
        <p className="text-text-muted text-sm mb-4">
          {badge.description}
        </p>

        <div className="p-4 rounded-xl bg-bg mb-5 text-left">
          <p className="text-sm text-text/80 leading-relaxed italic">
            {badge.followUp}
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={onDismiss}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors"
          >
            {t(locale, "badge.continue")}
          </button>
          <a
            href={BMC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2.5 rounded-xl bg-accent/10 text-accent font-medium hover:bg-accent/20 transition-colors text-sm"
          >
            ☕ {t(locale, "badge.coffee")}
          </a>
          <p className="text-[10px] text-text-muted/50 mt-2">
            {t(locale, "badge.coffeeNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
