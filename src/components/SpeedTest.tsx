"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SpeedTestProps {
  referenceText: string;
  onComplete: (inputText: string, wpm: number, accuracy: number) => void;
}

export default function SpeedTest({ referenceText, onComplete }: SpeedTestProps) {
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      if (finished) return;

      if (!started) {
        setStarted(true);
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
      }

      setInput(value);
    },
    [started, finished]
  );

  const handleFinish = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setFinished(true);

    const durationSec = (Date.now() - startTimeRef.current) / 1000;
    const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
    const wpm = durationSec > 0 ? Math.round(wordCount / (durationSec / 60)) : 0;

    // Simple accuracy: correct characters / total reference characters
    const refChars = referenceText.split("");
    const inputChars = input.split("");
    let correct = 0;
    for (let i = 0; i < Math.min(refChars.length, inputChars.length); i++) {
      if (refChars[i] === inputChars[i]) correct++;
    }
    const accuracy =
      refChars.length > 0 ? Math.round((correct / refChars.length) * 100) : 0;

    onComplete(input, wpm, accuracy);
  }, [input, referenceText, onComplete]);

  // Highlight typed characters
  const renderReference = () => {
    return referenceText.split("").map((char, i) => {
      let className = "text-text-muted/40";
      if (i < input.length) {
        className =
          input[i] === char ? "text-success" : "text-error bg-error/10 rounded";
      } else if (i === input.length) {
        className = "text-text bg-primary/10 rounded";
      }
      return (
        <span key={i} className={className}>
          {char === "\n" ? "↵\n" : char}
        </span>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Reference with highlights */}
      <div className="p-4 rounded-xl bg-bg border border-border font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {renderReference()}
      </div>

      {/* Input area */}
      <div className="relative">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          disabled={finished}
          placeholder="Commencez à taper..."
          className="w-full p-4 rounded-xl border border-border bg-bg-card font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
          rows={4}
        />
        {started && (
          <div className="absolute top-2 right-2 font-mono text-xs text-text-muted bg-bg-card px-2 py-1 rounded-lg border border-border">
            {Math.floor(elapsed / 60)}:
            {(elapsed % 60).toString().padStart(2, "0")}
          </div>
        )}
      </div>

      {started && !finished && (
        <button
          onClick={handleFinish}
          className="w-full py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors"
        >
          Terminer
        </button>
      )}
    </div>
  );
}
