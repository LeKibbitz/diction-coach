"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession } from "@/lib/db";
import {
  buildTimelineRegions,
  getErrorRegions,
  mergeAdjacentRegions,
  formatTime,
} from "@/lib/timeline";
import { useWavesurfer } from "@/hooks/useWavesurfer";
import ErrorSidebar from "@/components/ErrorSidebar";
import type { SessionResult } from "@/lib/types";
import type { TimelineRegion } from "@/lib/timeline";

export default function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [session, setSession] = useState<SessionResult | null>(null);
  const [regions, setRegions] = useState<TimelineRegion[]>([]);
  const [errors, setErrors] = useState<TimelineRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(50);

  const waveformRef = useRef<HTMLDivElement>(null);
  const ws = useWavesurfer(waveformRef);

  // Load session data
  useEffect(() => {
    if (!sessionId) return;

    getSession(sessionId).then((s) => {
      if (!s || !s.audioBlob) {
        setLoading(false);
        return;
      }
      setSession(s);

      const allRegions = buildTimelineRegions(s.wordTimings, s.diffResult);
      const merged = mergeAdjacentRegions(allRegions);
      setRegions(merged);
      setErrors(getErrorRegions(merged));
      setLoading(false);
    });
  }, [sessionId]);

  // Initialize wavesurfer when session is loaded
  useEffect(() => {
    if (!session?.audioBlob || !waveformRef.current) return;

    const audioUrl = URL.createObjectURL(session.audioBlob);
    ws.init(audioUrl, regions);

    return () => URL.revokeObjectURL(audioUrl);
  }, [session, regions, ws.init]);

  const handleErrorClick = useCallback(
    (error: TimelineRegion) => {
      // Play from 1s before the error to 0.5s after
      const start = Math.max(0, error.startTime - 1);
      const end = error.endTime + 0.5;
      ws.playSegment(start, end);
    },
    [ws]
  );

  const handleZoom = useCallback(
    (value: number) => {
      setZoomLevel(value);
      ws.zoom(value);
    },
    [ws]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-shimmer w-64 h-8 rounded-lg" />
      </div>
    );
  }

  if (!session || !session.audioBlob) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔇</div>
          <h1 className="text-xl font-bold mb-2">
            Pas d&apos;enregistrement audio
          </h1>
          <p className="text-text-muted mb-4">
            Cette session n&apos;a pas d&apos;audio associé.
          </p>
          <button
            onClick={() => router.push(`/exercise/${id}`)}
            className="text-primary hover:underline"
          >
            Retour à l&apos;exercice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="border-b border-border bg-bg-card px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-text-muted hover:text-text text-sm flex items-center gap-1"
          >
            ← Retour aux résultats
          </button>
          <h1 className="text-sm font-semibold">
            Éditeur Timeline — Précision : {session.accuracy}%
          </h1>
          <div className="text-sm text-text-muted">
            {formatTime(session.audioDuration)}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Reference text */}
        <div className="mb-4 p-3 rounded-xl bg-bg-card border border-border">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
            Texte de référence
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {session.referenceText}
          </p>
        </div>

        <div className="flex gap-4">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Waveform */}
            <div className="rounded-xl border border-border bg-bg-card p-4 mb-4">
              <div ref={waveformRef} className="mb-4" />

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={ws.playPause}
                    className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-light transition-colors"
                  >
                    {ws.isPlaying ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <span className="font-mono text-sm text-text-muted">
                    {formatTime(ws.currentTime)} / {formatTime(ws.duration)}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Speed control */}
                  <div className="flex items-center gap-1">
                    {[0.5, 0.75, 1].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => ws.setPlaybackRate(rate)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          ws.playbackRate === rate
                            ? "bg-primary text-white"
                            : "bg-bg text-text-muted hover:bg-border"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  {/* Zoom */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">Zoom</span>
                    <input
                      type="range"
                      min={20}
                      max={200}
                      value={zoomLevel}
                      onChange={(e) => handleZoom(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recognized text with errors highlighted */}
            <div className="rounded-xl border border-border bg-bg-card p-4">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                Transcription
              </h2>
              <p className="text-sm leading-relaxed">
                {session.wordTimings.map((wt, i) => (
                  <span
                    key={i}
                    className={`cursor-pointer hover:underline ${
                      wt.isError
                        ? "text-error bg-error/10 rounded px-0.5"
                        : "text-text"
                    }`}
                    onClick={() => ws.seekTo(wt.startTime)}
                  >
                    {wt.word}{" "}
                  </span>
                ))}
              </p>
            </div>
          </div>

          {/* Error sidebar */}
          <div className="w-72 shrink-0">
            <div className="rounded-xl border border-border bg-bg-card p-4 sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <ErrorSidebar
                errors={errors}
                onClickError={handleErrorClick}
                currentTime={ws.currentTime}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
