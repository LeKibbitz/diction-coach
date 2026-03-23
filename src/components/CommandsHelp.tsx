"use client";

import { useState } from "react";
import { VOICE_COMMANDS_REFERENCE, type VoiceCommand } from "@/lib/commands";
import { t, type Locale } from "@/lib/i18n";

const CATEGORY_KEYS: Record<VoiceCommand["category"], { i18nKey: string; emoji: string }> = {
  punctuation: { i18nKey: "commands.cat.punctuation", emoji: "✍️" },
  formatting: { i18nKey: "commands.cat.formatting", emoji: "📐" },
  casing: { i18nKey: "commands.cat.casing", emoji: "🔠" },
  symbols: { i18nKey: "commands.cat.symbols", emoji: "🔣" },
  lists: { i18nKey: "commands.cat.lists", emoji: "📋" },
};

const CATEGORIES = Object.keys(CATEGORY_KEYS) as VoiceCommand["category"][];

interface CommandsHelpProps {
  locale?: Locale;
}

export default function CommandsHelp({ locale = "fr" }: CommandsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<VoiceCommand["category"]>("punctuation");

  const filtered = VOICE_COMMANDS_REFERENCE.filter(
    (c) => c.category === activeTab
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
      >
        <span>💡</span>
        {t(locale, "commands.button")}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-bg-card shadow-lg z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">{t(locale, "commands.title")}</h3>
            <p className="text-xs text-text-muted mt-1">
              {t(locale, "commands.description")}
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
            {CATEGORIES.map((cat) => {
              const info = CATEGORY_KEYS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`shrink-0 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    activeTab === cat
                      ? "bg-primary text-white"
                      : "text-text-muted hover:bg-bg"
                  }`}
                >
                  {info.emoji} {t(locale, info.i18nKey)}
                </button>
              );
            })}
          </div>

          {/* Commands list */}
          <div className="overflow-y-auto p-3 space-y-1.5">
            {filtered.map((cmd) => (
              <div
                key={cmd.command}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-bg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    {t(locale, "commands.say")} <span className="font-semibold text-primary">« {cmd.command} »</span>
                  </div>
                  <div className="text-[11px] text-text-muted">{cmd.description}</div>
                </div>
                <div className="shrink-0 ml-3 font-mono text-sm bg-bg px-2 py-0.5 rounded border border-border">
                  {cmd.result}
                </div>
              </div>
            ))}
          </div>

          {/* Tips - content stays in French since it's about French voice commands */}
          <div className="p-3 border-t border-border bg-accent/5">
            <h4 className="text-[11px] font-semibold text-accent mb-1.5">
              💡 {t(locale, "commands.tips")}
            </h4>
            <ul className="text-[11px] text-text-muted space-y-1">
              {activeTab === "punctuation" && (
                <>
                  <li>• Les <strong>accents</strong> sont automatiques en français — dites « éléphant » normalement</li>
                  <li>• Marquez une micro-pause après chaque commande de ponctuation</li>
                  <li>• La capitalisation après un point est automatique</li>
                </>
              )}
              {activeTab === "formatting" && (
                <>
                  <li>• « À la ligne » = un saut, « nouveau paragraphe » = deux sauts</li>
                  <li>• Pour les guillemets : dites « ouvrir » avant et « fermer » après la citation</li>
                  <li>• Pensez à ouvrir ET fermer vos parenthèses</li>
                </>
              )}
              {activeTab === "casing" && (
                <>
                  <li>• « Majuscule Thomas » → Thomas (première lettre en majuscule)</li>
                  <li>• « Tout en majuscules urgent » → URGENT</li>
                  <li>• En début de phrase après un point, la majuscule est automatique</li>
                  <li>• Les noms propres sont souvent capitalisés automatiquement par le moteur</li>
                </>
              )}
              {activeTab === "symbols" && (
                <>
                  <li>• Pour dicter une adresse email : « thomas arobase gmail point com »</li>
                  <li>• « Barre oblique » pour un slash, « tiret » pour un trait d&apos;union</li>
                </>
              )}
              {activeTab === "lists" && (
                <>
                  <li>• « Puce » insère un retour à la ligne + un bullet point (•)</li>
                  <li>• « Tiret puce » insère un retour à la ligne + un tiret (-)</li>
                  <li>• Combinez avec « à la ligne » pour des listes propres</li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
