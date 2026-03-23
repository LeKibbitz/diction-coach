"use client";

import { useState, useRef, useEffect } from "react";
import { LOCALES, type Locale } from "@/lib/i18n";

interface LocaleSelectorProps {
  value: Locale;
  onChange: (locale: Locale) => void;
}

export default function LocaleSelector({ value, onChange }: LocaleSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.id === value) || LOCALES[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-border/50 transition-colors text-sm"
      >
        <span>{current.flag}</span>
        <span className="text-xs text-text-muted hidden sm:inline">{current.id.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border bg-bg-card shadow-lg z-50 overflow-hidden">
          {LOCALES.map((locale) => (
            <button
              key={locale.id}
              onClick={() => {
                onChange(locale.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                value === locale.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-bg text-text"
              }`}
            >
              <span className="text-base">{locale.flag}</span>
              <span>{locale.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
