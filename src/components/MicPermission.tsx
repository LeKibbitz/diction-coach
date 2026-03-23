"use client";

import { useState } from "react";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { isSpeechSupported } from "@/lib/speech";

interface MicPermissionProps {
  onGranted: () => void;
}

export default function MicPermission({ onGranted }: MicPermissionProps) {
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
          Navigateur non compatible
        </h3>
        <p className="text-text-muted text-sm">
          La reconnaissance vocale nécessite <strong>Chrome</strong> ou{" "}
          <strong>Edge</strong>.
          <br />
          Safari et Firefox ne sont pas encore supportés.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6 text-center">
      <div className="text-4xl mb-3">🎤</div>
      <h3 className="text-lg font-semibold mb-2">Accès au microphone</h3>
      <p className="text-text-muted text-sm mb-4">
        Pour fonctionner, l&apos;application a besoin d&apos;accéder à votre microphone.
        <br />
        Vos enregistrements restent sur votre appareil.
      </p>

      {hasMicPermission === false && (
        <div className="mb-4 rounded-lg bg-error/10 text-error text-sm p-3">
          {error || "Accès au microphone refusé. Vérifiez les paramètres de votre navigateur."}
        </div>
      )}

      {hasMicPermission === true ? (
        <div className="flex items-center justify-center gap-2 text-success font-medium">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Microphone activé
        </div>
      ) : (
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {testing ? "Test en cours..." : "Autoriser le microphone"}
        </button>
      )}
    </div>
  );
}
