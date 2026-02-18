"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { type SpeechSegment, useVoiceRecorder } from "@/app/hooks/useVoiceRecorder";
import {
  useCompleteRecordingUpload,
  useInitiateRecordingUpload,
  useMeeting,
  useMeetingRecording,
  useUploadRecordingChunk,
} from "@/app/lib/query/hooks";

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const s = seconds % 60;
  const m = minutes % 60;

  if (hours > 0) {
    return `${hours}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VADMeter({
  probability,
  energy,
  isSpeech,
}: {
  probability: number;
  energy: number;
  isSpeech: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${isSpeech ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isSpeech ? "Speech Detected" : "Silence"}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Voice Activity</span>
          <span>{Math.round(probability * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${isSpeech ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${probability * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Energy Level</span>
          <span>{energy.toFixed(4)}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-75"
            style={{ width: `${Math.min(energy * 1000, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function WaveformDisplay({ isRecording }: { isRecording: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isRecording) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      if (!analyserRef.current) {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.beginPath();
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#3b82f6";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={100}
      className="w-full h-24 rounded-lg bg-slate-800"
    />
  );
}

function SpeechTimeline({ segments, duration }: { segments: SpeechSegment[]; duration: number }) {
  if (duration === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Speech Timeline</span>
        <span>{segments.length} segments</span>
      </div>
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
        {segments.map((segment, index) => {
          const left = (segment.startTime / duration) * 100;
          const width = ((segment.endTime - segment.startTime) / duration) * 100;

          return (
            <div
              key={index}
              className="absolute top-0 h-full bg-green-500 opacity-70"
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function RecordMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = Number(params.id);

  const { data: meeting, isLoading: meetingLoading } = useMeeting(meetingId);
  const { data: existingRecording } = useMeetingRecording(meetingId);
  const initiateUpload = useInitiateRecordingUpload();
  const uploadChunk = useUploadRecordingChunk();
  const completeUpload = useCompleteRecordingUpload();

  const [recordingId, setRecordingId] = useState<number | null>(null);
  const [uploadedChunks, setUploadedChunks] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const chunkQueueRef = useRef<Array<{ blob: Blob; index: number }>>([]);
  const isUploadingChunkRef = useRef(false);

  const handleChunk = useCallback(
    async (blob: Blob, chunkIndex: number) => {
      if (!recordingId) {
        chunkQueueRef.current.push({ blob, index: chunkIndex });
        return;
      }

      chunkQueueRef.current.push({ blob, index: chunkIndex });

      if (isUploadingChunkRef.current) return;

      isUploadingChunkRef.current = true;

      while (chunkQueueRef.current.length > 0) {
        const chunk = chunkQueueRef.current.shift();
        if (!chunk) break;

        await uploadChunk.mutateAsync({
          recordingId,
          chunkIndex: chunk.index,
          data: chunk.blob,
        });

        setUploadedChunks((prev) => prev + 1);
      }

      isUploadingChunkRef.current = false;
    },
    [recordingId, uploadChunk],
  );

  const [recorderState, controls] = useVoiceRecorder({
    vadConfig: { threshold: 0.01, smoothingFrames: 5 },
    chunkIntervalMs: 5000,
    onChunk: handleChunk,
  });

  const handleStart = async () => {
    setUploadError(null);
    setUploadedChunks(0);
    chunkQueueRef.current = [];

    const result = await initiateUpload.mutateAsync({
      meetingId,
      filename: `meeting-${meetingId}-${Date.now()}.webm`,
      mimeType: "audio/webm;codecs=opus",
      sampleRate: 16000,
      channels: 1,
    });

    setRecordingId(result.recordingId);

    await controls.start();
  };

  const handleStop = async () => {
    setIsUploading(true);

    const blob = await controls.stop();

    if (!blob || !recordingId) {
      setIsUploading(false);
      return;
    }

    while (chunkQueueRef.current.length > 0 || isUploadingChunkRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await completeUpload.mutateAsync({
      recordingId,
      dto: {
        fileSizeBytes: blob.size,
        durationSeconds: Math.floor(recorderState.duration / 1000),
      },
    });

    setIsUploading(false);
    router.push(`/annix-rep/meetings/${meetingId}`);
  };

  useEffect(() => {
    if (recordingId && chunkQueueRef.current.length > 0 && !isUploadingChunkRef.current) {
      handleChunk(new Blob([]), -1);
    }
  }, [recordingId, handleChunk]);

  if (meetingLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Meeting not found</p>
      </div>
    );
  }

  if (existingRecording) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/annix-rep/meetings/${meetingId}`}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recording Exists</h1>
            <p className="text-gray-500 dark:text-gray-400">{meeting.title}</p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            This meeting already has a recording. Delete the existing recording to record again.
          </p>
        </div>
      </div>
    );
  }

  const isRecording = recorderState.state === "recording";
  const isPaused = recorderState.state === "paused";
  const canStart = recorderState.state === "idle" || recorderState.state === "stopped";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/annix-rep/meetings/${meetingId}`}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Record Meeting</h1>
          <p className="text-gray-500 dark:text-gray-400">{meeting.title}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-6">
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-gray-900 dark:text-white mb-2">
            {formatDuration(recorderState.duration)}
          </div>
          <div className="flex justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>Speech: {formatDuration(recorderState.totalSpeechDuration)}</span>
            <span>Segments: {recorderState.segments.length}</span>
            {uploadedChunks > 0 && <span>Uploaded: {uploadedChunks} chunks</span>}
          </div>
        </div>

        <WaveformDisplay isRecording={isRecording} />

        <VADMeter
          probability={recorderState.probability}
          energy={recorderState.energy}
          isSpeech={recorderState.speechState === "speech"}
        />

        <SpeechTimeline segments={recorderState.segments} duration={recorderState.duration} />

        {recorderState.error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {recorderState.error}
          </div>
        )}

        {uploadError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {uploadError}
          </div>
        )}

        <div className="flex justify-center gap-4">
          {canStart && (
            <button
              onClick={handleStart}
              disabled={initiateUpload.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
              </svg>
              {initiateUpload.isPending ? "Starting..." : "Start Recording"}
            </button>
          )}

          {isRecording && (
            <>
              <button
                onClick={controls.pause}
                className="flex items-center gap-2 px-4 py-3 bg-yellow-600 text-white rounded-full hover:bg-yellow-700"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause
              </button>

              <button
                onClick={handleStop}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
                {isUploading ? "Uploading..." : "Stop & Save"}
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                onClick={controls.resume}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Resume
              </button>

              <button
                onClick={handleStop}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
                {isUploading ? "Uploading..." : "Stop & Save"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Recording Tips</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
              <li>Speak clearly and at a normal pace</li>
              <li>Minimize background noise</li>
              <li>The green indicator shows when speech is detected</li>
              <li>Audio is uploaded in chunks for reliability</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
