export interface RecorderCallbacks {
  onDataAvailable?: (blob: Blob) => void;
  onStop?: (blob: Blob) => void;
  onError?: (error: string) => void;
}

export async function requestMicrophone(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return null;
  }
}

export function createMediaRecorder(
  stream: MediaStream,
  callbacks: RecorderCallbacks
): MediaRecorder | null {
  try {
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        callbacks.onDataAvailable?.(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      callbacks.onStop?.(blob);
    };

    recorder.onerror = () => {
      callbacks.onError?.("Erreur d'enregistrement audio");
    };

    return recorder;
  } catch {
    callbacks.onError?.("MediaRecorder non supporté");
    return null;
  }
}

/**
 * Create an AnalyserNode for live waveform visualization.
 */
export function createAnalyser(stream: MediaStream): {
  analyser: AnalyserNode;
  context: AudioContext;
} {
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  return { analyser, context };
}
