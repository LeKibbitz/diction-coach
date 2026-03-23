"use client";

import { useState, useCallback, useRef } from "react";
import {
  requestMicrophone,
  createMediaRecorder,
  createAnalyser,
} from "@/lib/recorder";

export function useMediaRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const stoppedDurationRef = useRef<number>(0);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const stream = await requestMicrophone();
    if (stream) {
      // Stop tracks immediately — we just wanted to test permission
      stream.getTracks().forEach((t) => t.stop());
      setHasMicPermission(true);
      return true;
    }
    setHasMicPermission(false);
    setError("Accès au microphone refusé");
    return false;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    stoppedDurationRef.current = 0;
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    const stream = await requestMicrophone();
    if (!stream) {
      setError("Impossible d'accéder au microphone");
      setHasMicPermission(false);
      return;
    }

    streamRef.current = stream;
    setHasMicPermission(true);

    // Create analyser for waveform visualization
    const { analyser, context } = createAnalyser(stream);
    analyserRef.current = analyser;
    audioContextRef.current = context;

    const recorder = createMediaRecorder(stream, {
      onStop: (blob) => {
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsRecording(false);
      },
      onError: (err) => {
        setError(err);
        setIsRecording(false);
      },
    });

    if (recorder) {
      recorderRef.current = recorder;
      recorder.start(100); // collect data every 100ms
      startTimeRef.current = performance.now();
      setIsRecording(true);
    }
  }, [audioUrl]);

  const stop = useCallback(() => {
    // Freeze duration at the moment of stop, before async cleanup
    if (startTimeRef.current > 0) {
      stoppedDurationRef.current =
        (performance.now() - startTimeRef.current) / 1000;
    }
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
  }, []);

  const getDuration = useCallback((): number => {
    // Return frozen duration if stopped, otherwise live duration
    if (stoppedDurationRef.current > 0) return stoppedDurationRef.current;
    if (startTimeRef.current === 0) return 0;
    return (performance.now() - startTimeRef.current) / 1000;
  }, []);

  const getAnalyser = useCallback((): AnalyserNode | null => {
    return analyserRef.current;
  }, []);

  return {
    isRecording,
    audioBlob,
    audioUrl,
    error,
    hasMicPermission,
    requestPermission,
    start,
    stop,
    getDuration,
    getAnalyser,
  };
}
