"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compressPhoto, fileToDataUrl } from "../lib/offline/photoSync";

interface PhotoCaptureProps {
  onCapture: (file: File, previewUrl?: string) => void;
  currentPhotoUrl?: string;
  enableCamera?: boolean;
  compressOnCapture?: boolean;
}

export function PhotoCapture({
  onCapture,
  currentPhotoUrl,
  enableCamera = true,
  compressOnCapture = true,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCameraError(null);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(mediaStream);
      setShowCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to access camera";
      setCameraError(message);
      fileInputRef.current?.click();
    }
  };

  const captureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        await handleFileCapture(file);
        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  const handleFileCapture = async (file: File) => {
    setIsCompressing(true);
    try {
      let processedFile = file;

      if (compressOnCapture) {
        const compressed = await compressPhoto(file);
        processedFile = new File([compressed], file.name, {
          type: compressed.type,
        });
      }

      const dataUrl = await fileToDataUrl(processedFile);
      setPreviewUrl(dataUrl);
      onCapture(processedFile, dataUrl);
    } catch (error) {
      console.error("Failed to process photo:", error);
      onCapture(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileCapture(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (enableCamera && "mediaDevices" in navigator) {
      startCamera();
    } else {
      fileInputRef.current?.click();
    }
  };

  const displayUrl = previewUrl ?? currentPhotoUrl;

  if (showCamera) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-8 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={stopCamera}
            className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white"
            aria-label="Cancel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <button
            onClick={captureFromCamera}
            className="w-20 h-20 rounded-full bg-white border-4 border-white/50 flex items-center justify-center"
            aria-label="Capture photo"
          >
            <div className="w-16 h-16 rounded-full bg-white" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white"
            aria-label="Choose from gallery"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  if (displayUrl) {
    return (
      <div className="space-y-2">
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
          <img src={displayUrl} alt="Captured" className="w-full h-full object-cover" />
          {isCompressing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={isCompressing}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100 disabled:opacity-50"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Change Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div>
      {cameraError && (
        <p className="text-sm text-amber-600 mb-2">Camera unavailable. Using file picker.</p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isCompressing}
        className="inline-flex items-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors disabled:opacity-50"
      >
        {isCompressing ? (
          <>
            <div className="w-5 h-5 mr-2 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {enableCamera ? "Take Photo" : "Upload Photo"}
          </>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
