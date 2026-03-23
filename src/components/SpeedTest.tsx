"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SpeedTestProps {
  referenceText: string;
  onComplete: (inputText: string, wpm: number, accuracy: number) => void;
  tipText?: string;
  placeholderText?: string;
  perfectText?: string;
  labels?: {
    wpm?: string;
    accuracy?: string;
    time?: string;
    topSpeed?: string;
    avgSpeed?: string;
    backspaces?: string;
    streak?: string;
    chars?: string;
    pause?: string;
    resume?: string;
    restart?: string;
  };
}

export default function SpeedTest({
  referenceText,
  onComplete,
  tipText = "Pour atteindre 100%, prenez votre temps. Les corrections automatiques peuvent trahir — chaque caractère doit correspondre exactement.",
  placeholderText = "Commencez à taper...",
  perfectText = "Parfait ! Pas une faute.",
  labels = {},
}: SpeedTestProps) {
  const L = {
    wpm: labels.wpm || "mots/min",
    accuracy: labels.accuracy || "précision",
    time: labels.time || "temps",
    topSpeed: labels.topSpeed || "pointe",
    avgSpeed: labels.avgSpeed || "moyenne",
    backspaces: labels.backspaces || "retours",
    streak: labels.streak || "série sans faute",
    chars: labels.chars || "caractères",
    pause: labels.pause || "Pause",
    resume: labels.resume || "Reprendre",
    restart: labels.restart || "Recommencer",
  };

  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0); // in ms

  // Fun stats
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [consecutiveBackspaces, setConsecutiveBackspaces] = useState(0);
  const [maxConsecutiveBackspaces, setMaxConsecutiveBackspaces] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [topWpm, setTopWpm] = useState(0);
  const [keystrokes, setKeystrokes] = useState(0);

  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const totalPausedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastInputRef = useRef("");
  const wordTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-finish when text matches perfectly
  useEffect(() => {
    if (started && !finished && !paused && input === referenceText) {
      finishTest();
    }
  }, [input, started, finished, paused, referenceText]);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setElapsed(now - startTimeRef.current - totalPausedRef.current);
    }, 50); // 50ms for smooth display
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (finished || paused) return;

      setKeystrokes((k) => k + 1);

      if (e.key === "Backspace") {
        setBackspaceCount((c) => c + 1);
        setConsecutiveBackspaces((c) => {
          const next = c + 1;
          setMaxConsecutiveBackspaces((m) => Math.max(m, next));
          return next;
        });
        setCurrentStreak(0);
      } else if (e.key.length === 1) {
        // Regular character
        setConsecutiveBackspaces(0);
      }
    },
    [finished, paused]
  );

  const handleChange = useCallback(
    (value: string) => {
      if (finished || paused) return;

      if (!started) {
        setStarted(true);
        startTimeRef.current = Date.now();
        startTimer();
      }

      // Track correct character streak
      const prevLen = lastInputRef.current.length;
      if (value.length > prevLen) {
        // Character added
        const newCharIdx = value.length - 1;
        if (newCharIdx < referenceText.length && value[newCharIdx] === referenceText[newCharIdx]) {
          setCurrentStreak((s) => {
            const next = s + 1;
            setBestStreak((b) => Math.max(b, next));
            return next;
          });
        } else {
          setCurrentStreak(0);
        }

        // Track word completions for WPM spikes
        if (value[newCharIdx] === " " || value[newCharIdx] === "\n") {
          wordTimestampsRef.current.push(Date.now());

          // Calculate instantaneous WPM from last 5 words
          const stamps = wordTimestampsRef.current;
          if (stamps.length >= 2) {
            const window = stamps.slice(-6);
            const windowWords = window.length - 1;
            const windowTime = (window[window.length - 1] - window[0]) / 1000 / 60;
            if (windowTime > 0) {
              const instantWpm = Math.round(windowWords / windowTime);
              setTopWpm((t) => Math.max(t, instantWpm));
            }
          }
        }
      }

      lastInputRef.current = value;
      setInput(value);
    },
    [started, finished, paused, referenceText, startTimer]
  );

  const finishTest = useCallback(() => {
    stopTimer();
    setFinished(true);

    const totalMs = Date.now() - startTimeRef.current - totalPausedRef.current;
    const durationSec = totalMs / 1000;
    const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
    const wpm = durationSec > 0 ? Math.round(wordCount / (durationSec / 60)) : 0;

    const refChars = referenceText.split("");
    const inputChars = input.split("");
    let correct = 0;
    for (let i = 0; i < Math.min(refChars.length, inputChars.length); i++) {
      if (refChars[i] === inputChars[i]) correct++;
    }
    const accuracy = refChars.length > 0 ? Math.round((correct / refChars.length) * 100) : 0;

    onComplete(input, wpm, accuracy);
  }, [input, referenceText, onComplete, stopTimer]);

  const handlePause = useCallback(() => {
    if (paused) {
      // Unpause
      totalPausedRef.current += Date.now() - pausedAtRef.current;
      setPaused(false);
      startTimer();
      inputRef.current?.focus();
    } else {
      // Pause
      pausedAtRef.current = Date.now();
      setPaused(true);
      stopTimer();
    }
  }, [paused, startTimer, stopTimer]);

  const handleRestart = useCallback(() => {
    stopTimer();
    setInput("");
    setStarted(false);
    setFinished(false);
    setPaused(false);
    setElapsed(0);
    setBackspaceCount(0);
    setConsecutiveBackspaces(0);
    setMaxConsecutiveBackspaces(0);
    setCurrentStreak(0);
    setBestStreak(0);
    setTopWpm(0);
    setKeystrokes(0);
    startTimeRef.current = 0;
    pausedAtRef.current = 0;
    totalPausedRef.current = 0;
    lastInputRef.current = "";
    wordTimestampsRef.current = [];
    inputRef.current?.focus();
  }, [stopTimer]);

  // Live calculations
  const elapsedSec = elapsed / 1000;
  const liveWordCount = input.trim().split(/\s+/).filter(Boolean).length;
  const liveWpm = elapsedSec > 0 ? Math.round(liveWordCount / (elapsedSec / 60)) : 0;

  let liveCorrect = 0;
  for (let i = 0; i < Math.min(input.length, referenceText.length); i++) {
    if (input[i] === referenceText[i]) liveCorrect++;
  }
  const liveAccuracy = input.length > 0 ? Math.round((liveCorrect / Math.max(input.length, 1)) * 100) : 100;

  const progressPct = Math.round((input.length / referenceText.length) * 100);

  // Fun emoji for backspace rage
  const backspaceEmoji =
    maxConsecutiveBackspaces >= 10 ? "🤯" :
    maxConsecutiveBackspaces >= 5 ? "😤" :
    maxConsecutiveBackspaces >= 3 ? "😬" : "⌫";

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${m}:${sec.toString().padStart(2, "0")}.${tenths}`;
  };

  // Reference text with character-level highlighting
  const renderReference = () => {
    return referenceText.split("").map((char, i) => {
      let className = "text-text-muted/30";
      if (i < input.length) {
        className = input[i] === char
          ? "text-success"
          : "text-error bg-error/10 rounded-sm";
      } else if (i === input.length && !finished) {
        className = "text-text bg-primary/20 rounded-sm animate-pulse";
      }
      return (
        <span key={i} className={className}>
          {char === "\n" ? "↵\n" : char}
        </span>
      );
    });
  };

  return (
    <div className="space-y-3">
      {/* Tip */}
      {!started && (
        <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-accent">
          💡 {tipText}
        </div>
      )}

      {/* Live stats bar */}
      {started && (
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-bg-card border border-border text-center">
            <div className="text-lg font-bold font-mono text-primary">{formatTime(elapsed)}</div>
            <div className="text-[9px] text-text-muted">{L.time}</div>
          </div>
          <div className="p-2 rounded-lg bg-bg-card border border-border text-center">
            <div className={`text-lg font-bold ${liveWpm > 80 ? "text-success" : liveWpm > 40 ? "text-accent" : "text-text"}`}>
              {liveWpm}
            </div>
            <div className="text-[9px] text-text-muted">{L.avgSpeed}</div>
          </div>
          <div className="p-2 rounded-lg bg-bg-card border border-border text-center">
            <div className={`text-lg font-bold ${liveAccuracy >= 95 ? "text-success" : liveAccuracy >= 80 ? "text-accent" : "text-error"}`}>
              {liveAccuracy}%
            </div>
            <div className="text-[9px] text-text-muted">{L.accuracy}</div>
          </div>
          <div className="p-2 rounded-lg bg-bg-card border border-border text-center">
            <div className="text-lg font-bold text-accent">{topWpm || "—"}</div>
            <div className="text-[9px] text-text-muted">{L.topSpeed}</div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {started && (
        <div className="relative h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
          {input === referenceText && (
            <div className="absolute inset-0 bg-success rounded-full animate-pulse" />
          )}
        </div>
      )}

      {/* Reference text */}
      <div className="p-4 rounded-xl bg-bg border border-border font-mono text-sm leading-relaxed whitespace-pre-wrap select-none">
        {renderReference()}
      </div>

      {/* Input area */}
      <div className="relative">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={finished || paused}
          placeholder={placeholderText}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full p-4 rounded-xl border border-border bg-bg-card font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
          rows={4}
        />
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/80 rounded-xl backdrop-blur-sm">
            <div className="text-center">
              <div className="text-4xl mb-2">⏸️</div>
              <div className="text-sm font-medium">{L.pause}</div>
            </div>
          </div>
        )}
      </div>

      {/* Auto-complete message */}
      {finished && input === referenceText && (
        <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-center text-sm text-success font-medium">
          ✨ {perfectText}
        </div>
      )}

      {/* Controls */}
      {started && !finished && (
        <div className="flex gap-2">
          <button
            onClick={handlePause}
            className="flex-1 py-2.5 rounded-xl border border-border font-medium text-sm hover:bg-bg-card transition-colors"
          >
            {paused ? `▶ ${L.resume}` : `⏸ ${L.pause}`}
          </button>
          <button
            onClick={handleRestart}
            className="flex-1 py-2.5 rounded-xl border border-border font-medium text-sm hover:bg-bg-card transition-colors text-text-muted"
          >
            🔄 {L.restart}
          </button>
          {!paused && input.length > 0 && input !== referenceText && (
            <button
              onClick={finishTest}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-light transition-colors"
            >
              ✓ Terminer
            </button>
          )}
        </div>
      )}

      {/* Fun stats (shown during typing) */}
      {started && (
        <div className="flex flex-wrap gap-2 text-[10px] text-text-muted">
          <span className="px-2 py-1 rounded-md bg-bg-card border border-border">
            {backspaceEmoji} {backspaceCount} {L.backspaces}
            {maxConsecutiveBackspaces >= 3 && (
              <span className="text-error ml-1">({maxConsecutiveBackspaces} d&apos;affilée !)</span>
            )}
          </span>
          <span className="px-2 py-1 rounded-md bg-bg-card border border-border">
            🎯 {bestStreak} {L.streak}
          </span>
          <span className="px-2 py-1 rounded-md bg-bg-card border border-border">
            ⌨️ {keystrokes} {L.chars}
          </span>
          <span className="px-2 py-1 rounded-md bg-bg-card border border-border">
            📊 {progressPct}%
          </span>
        </div>
      )}
    </div>
  );
}
