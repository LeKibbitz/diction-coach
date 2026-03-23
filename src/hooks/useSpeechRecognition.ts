"use client";

import { useState, useCallback, useRef } from "react";
import {
  createSpeechRecognition,
  isSpeechSupported,
  type SpeechResult,
} from "@/lib/speech";
import { processVoiceCommands } from "@/lib/commands";

export function useSpeechRecognition(lang: string = "fr-FR") {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");        // post-processed
  const [rawTranscript, setRawTranscript] = useState("");  // brut
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const resultsRef = useRef<SpeechResult[]>([]);
  const finalTranscriptRef = useRef("");

  const isSupported = isSpeechSupported();

  const start = useCallback(() => {
    if (!isSupported) {
      setError("La reconnaissance vocale n'est pas supportée par votre navigateur. Utilisez Chrome ou Edge.");
      return;
    }

    setError(null);
    setTranscript("");
    setRawTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    resultsRef.current = [];

    const recognition = createSpeechRecognition(lang, {
      onResult: (result) => {
        resultsRef.current.push(result);

        if (result.isFinal) {
          finalTranscriptRef.current += result.transcript + " ";
          setRawTranscript(finalTranscriptRef.current.trim());
          setTranscript(processVoiceCommands(finalTranscriptRef.current.trim()));
          setInterimTranscript("");
        } else {
          setInterimTranscript(result.transcript);
        }
      },
      onEnd: () => {
        // Web Speech API stops itself after silence — auto-restart if still supposed to be listening
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
            return;
          } catch {
            // Already stopped or aborted — fall through
          }
        }
        setIsListening(false);
        setInterimTranscript("");
      },
      onError: (err) => {
        if (err === "no-speech") {
          // Restart on no-speech (common when user pauses)
          recognitionRef.current?.start();
          return;
        }
        setError(`Erreur de reconnaissance : ${err}`);
        setIsListening(false);
      },
    });

    if (recognition) {
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    }
  }, [isSupported, lang]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null; // prevent auto-restart in onEnd
    rec?.stop();
    setIsListening(false);
  }, []);

  const getResults = useCallback((): SpeechResult[] => {
    return [...resultsRef.current];
  }, []);

  return {
    isSupported,
    isListening,
    transcript,      // post-processed (commandes → ponctuation/majuscules)
    rawTranscript,   // brut (ce que le micro a entendu)
    interimTranscript,
    error,
    start,
    stop,
    getResults,
  };
}
