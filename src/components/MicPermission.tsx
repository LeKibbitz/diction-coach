"use client";

import { useState } from "react";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { isSpeechSupported } from "@/lib/speech";
import { t, type Locale } from "@/lib/i18n";

interface MicPermissionProps {
  onGranted: () => void;
  locale?: Locale;
}

export default function MicPermission({ onGranted, locale = "fr" }: MicPermissionProps) {
  const { requestPermission, hasMicPermission, error } = useMediaRecorder();
  const [testing, setTesting] = useState(false);
  const speechSupported = isSpeechSupported();

  const handleTest = async () => {
    setTesting(true);
    const granted = await requestPermission();
    setTesting(false);
    if (granted) {
      onGranted();
    }
  };

  if (!speechSupported) {
    return (
      <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
        <div className="text-4xl mb-3">🚫</div>
        <h3 className="text-lg font-semibold text-error mb-2">
          {t(locale, "mic.unsupported")}
        </h3>
        <p className="text-text-muted text-sm">
          {t(locale, "mic.unsupportedMsg")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6 text-center">
      <div className="text-4xl mb-3">🎤</div>
      <h3 className="text-lg font-semibold mb-2">{t(locale, "mic.title")}</h3>
      <p className="text-text-muted text-sm mb-4">
        {t(locale, "mic.description")}
      </p>

      {hasMicPermission === false && (
        <div className="mb-4 rounded-lg bg-error/10 text-error text-sm p-3">
          {error || t(locale, "mic.denied")}
        </div>
      )}

      {hasMicPermission === true ? (
        <div className="flex items-center justify-center gap-2 text-success font-medium">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {t(locale, "mic.granted")}
        </div>
      ) : (
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {testing ? t(locale, "mic.testing") : t(locale, "mic.authorize")}
        </button>
      )}
    </div>
  );
}
