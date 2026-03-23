"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type WaveSurfer from "wavesurfer.js";
import type { TimelineRegion } from "@/lib/timeline";

export function useWavesurfer(containerRef: React.RefObject<HTMLDivElement | null>) {
  const wsRef = useRef<WaveSurfer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);

  const init = useCallback(
    async (audioUrl: string, regions: TimelineRegion[]) => {
      if (!containerRef.current) return;

      // Cleanup previous instance
      if (wsRef.current) {
        wsRef.current.destroy();
      }

      // Dynamic import to avoid SSR issues
      const WaveSurferModule = await import("wavesurfer.js");
      const RegionsPlugin = (
        await import("wavesurfer.js/dist/plugins/regions.js")
      ).default;

      const ws = WaveSurferModule.default.create({
        container: containerRef.current,
        waveColor: "#D6BCFA",
        progressColor: "#7C3AED",
        cursorColor: "#5B21B6",
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 120,
        normalize: true,
      });

      const regionsPlugin = ws.registerPlugin(RegionsPlugin.create());

      ws.on("ready", () => {
        setIsReady(true);
        setDuration(ws.getDuration());

        // Add regions
        for (const region of regions) {
          regionsPlugin.addRegion({
            start: region.startTime,
            end: region.endTime,
            color: region.color,
            drag: false,
            resize: false,
            id: region.id,
          });
        }
      });

      ws.on("audioprocess", () => {
        setCurrentTime(ws.getCurrentTime());
      });

      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));
      ws.on("finish", () => setIsPlaying(false));

      // Click on region shows info
      regionsPlugin.on("region-clicked", (region, e) => {
        e.stopPropagation();
        // Play just that region
        region.play();
      });

      await ws.load(audioUrl);
      wsRef.current = ws;
    },
    [containerRef]
  );

  const playPause = useCallback(() => {
    wsRef.current?.playPause();
  }, []);

  const seekTo = useCallback((time: number) => {
    const ws = wsRef.current;
    if (!ws) return;
    const dur = ws.getDuration();
    if (dur > 0) {
      ws.seekTo(time / dur);
    }
  }, []);

  const playSegment = useCallback((start: number, end: number) => {
    const ws = wsRef.current;
    if (!ws) return;
    const dur = ws.getDuration();
    if (dur > 0) {
      ws.seekTo(start / dur);
      ws.play();
      // Stop at end
      const checkInterval = setInterval(() => {
        if (ws.getCurrentTime() >= end) {
          ws.pause();
          clearInterval(checkInterval);
        }
      }, 50);
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    wsRef.current?.setPlaybackRate(rate);
    setPlaybackRateState(rate);
  }, []);

  const zoom = useCallback((pxPerSec: number) => {
    wsRef.current?.zoom(pxPerSec);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.destroy();
    };
  }, []);

  return {
    init,
    isReady,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    playPause,
    seekTo,
    playSegment,
    setPlaybackRate,
    zoom,
  };
}
