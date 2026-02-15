"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecordingState = "idle" | "requesting" | "recording" | "paused" | "stopped" | "error";
export type SpeechState = "silence" | "speech";

export interface VADConfig {
  threshold?: number;
  smoothingFrames?: number;
}

export interface SpeechSegment {
  startTime: number;
  endTime: number;
  duration: number;
}

export interface RecorderState {
  state: RecordingState;
  speechState: SpeechState;
  probability: number;
  energy: number;
  duration: number;
  totalSpeechDuration: number;
  segments: SpeechSegment[];
  error: string | null;
}

export interface RecorderControls {
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

interface UseVoiceRecorderOptions {
  vadConfig?: VADConfig;
  onSpeechStart?: (timestamp: number) => void;
  onSpeechEnd?: (segment: SpeechSegment) => void;
  onChunk?: (blob: Blob, chunkIndex: number) => void;
  chunkIntervalMs?: number;
  mimeType?: string;
}

export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {},
): [RecorderState, RecorderControls] {
  const {
    vadConfig = {},
    onSpeechStart,
    onSpeechEnd,
    onChunk,
    chunkIntervalMs = 5000,
    mimeType = "audio/webm;codecs=opus",
  } = options;

  const [state, setState] = useState<RecorderState>({
    state: "idle",
    speechState: "silence",
    probability: 0,
    energy: 0,
    duration: 0,
    totalSpeechDuration: 0,
    segments: [],
    error: null,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadWorkerRef = useRef<Worker | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkIndexRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentSegmentStartRef = useRef<number | null>(null);

  const updateState = useCallback((updates: Partial<RecorderState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const initVADWorker = useCallback(() => {
    if (vadWorkerRef.current) return;

    const worker = new Worker("/workers/vad-worker.js");

    worker.onmessage = (event) => {
      const { type, ...data } = event.data;

      switch (type) {
        case "probability":
          updateState({
            probability: data.probability,
            energy: data.energy,
            speechState: data.isSpeech ? "speech" : "silence",
          });
          break;

        case "speechStart":
          currentSegmentStartRef.current = data.timestamp;
          updateState({ speechState: "speech" });
          onSpeechStart?.(data.timestamp);
          break;

        case "speechEnd":
          if (currentSegmentStartRef.current !== null) {
            const segment: SpeechSegment = {
              startTime: currentSegmentStartRef.current,
              endTime: data.timestamp,
              duration: data.segmentDuration,
            };
            setState((prev) => ({
              ...prev,
              speechState: "silence",
              totalSpeechDuration: data.totalSpeechDuration,
              segments: [...prev.segments, segment],
            }));
            onSpeechEnd?.(segment);
            currentSegmentStartRef.current = null;
          }
          break;

        case "stateChange":
          updateState({ speechState: data.state });
          break;

        case "reset":
          updateState({
            speechState: "silence",
            probability: 0,
            energy: 0,
            totalSpeechDuration: 0,
            segments: [],
          });
          break;
      }
    };

    worker.postMessage({ type: "init" });
    worker.postMessage({
      type: "configure",
      data: {
        threshold: vadConfig.threshold ?? 0.01,
        smoothingFrames: vadConfig.smoothingFrames ?? 5,
      },
    });

    vadWorkerRef.current = worker;
  }, [vadConfig, updateState, onSpeechStart, onSpeechEnd]);

  const processAudio = useCallback(() => {
    if (!analyserRef.current || !vadWorkerRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const process = () => {
      if (state.state !== "recording") return;

      analyser.getFloatTimeDomainData(dataArray);

      const timestamp = performance.now() - startTimeRef.current;

      vadWorkerRef.current?.postMessage({
        type: "process",
        data: {
          samples: dataArray,
          timestamp,
        },
      });

      updateState({ duration: timestamp });
      animationFrameRef.current = requestAnimationFrame(process);
    };

    process();
  }, [state.state, updateState]);

  const startChunkInterval = useCallback(() => {
    if (chunkIntervalRef.current) return;

    chunkIntervalRef.current = setInterval(() => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.requestData();
      }
    }, chunkIntervalMs);
  }, [chunkIntervalMs]);

  const stopChunkInterval = useCallback(() => {
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    updateState({ state: "requesting", error: null });

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
      },
    });

    mediaStreamRef.current = stream;

    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;

    initVADWorker();

    const selectedMimeType = MediaRecorder.isTypeSupported(mimeType)
      ? mimeType
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      audioBitsPerSecond: 128000,
    });

    chunksRef.current = [];
    chunkIndexRef.current = 0;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);

        if (onChunk) {
          onChunk(event.data, chunkIndexRef.current);
          chunkIndexRef.current++;
        }
      }
    };

    mediaRecorderRef.current = mediaRecorder;

    startTimeRef.current = performance.now();
    mediaRecorder.start();
    startChunkInterval();

    updateState({
      state: "recording",
      duration: 0,
      totalSpeechDuration: 0,
      segments: [],
    });

    processAudio();
  }, [initVADWorker, mimeType, onChunk, processAudio, startChunkInterval, updateState]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    stopChunkInterval();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        updateState({ state: "stopped" });
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        audioContextRef.current?.close();

        mediaStreamRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
        mediaRecorderRef.current = null;

        updateState({ state: "stopped" });
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, [stopChunkInterval, updateState]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      stopChunkInterval();

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      updateState({ state: "paused" });
    }
  }, [stopChunkInterval, updateState]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      startChunkInterval();
      processAudio();
      updateState({ state: "recording" });
    }
  }, [processAudio, startChunkInterval, updateState]);

  const reset = useCallback(() => {
    stop();

    vadWorkerRef.current?.postMessage({ type: "reset" });

    chunksRef.current = [];
    chunkIndexRef.current = 0;
    currentSegmentStartRef.current = null;

    updateState({
      state: "idle",
      speechState: "silence",
      probability: 0,
      energy: 0,
      duration: 0,
      totalSpeechDuration: 0,
      segments: [],
      error: null,
    });
  }, [stop, updateState]);

  useEffect(() => {
    return () => {
      vadWorkerRef.current?.terminate();
      vadWorkerRef.current = null;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      stopChunkInterval();

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close();
    };
  }, [stopChunkInterval]);

  return [state, { start, stop, pause, resume, reset }];
}
