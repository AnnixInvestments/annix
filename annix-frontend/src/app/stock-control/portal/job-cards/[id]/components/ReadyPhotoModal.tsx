"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { nowMillis } from "@/app/lib/datetime";
import { useUploadReadyPhoto } from "@/app/lib/query/hooks";

interface ReadyPhotoModalProps {
  isOpen: boolean;
  jobCardId: number;
  onClose: () => void;
  onUploaded: () => void;
}

export function ReadyPhotoModal(props: ReadyPhotoModalProps) {
  const isOpen = props.isOpen;
  const jobCardId = props.jobCardId;
  const onClose = props.onClose;
  const onUploaded = props.onUploaded;

  const { mutateAsync: uploadReadyPhoto } = useUploadReadyPhoto();

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraError(null);
  }, [cameraStream]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Could not access camera. Use 'Upload from Device' instead.");
    }
  }, []);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return;
    const file = new File([blob], `ready-photo-${nowMillis()}.jpg`, { type: "image/jpeg" });
    try {
      setIsUploading(true);
      await uploadReadyPhoto({ jobCardId, file });
      onUploaded();
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload photo";
      setCameraError(msg);
    } finally {
      setIsUploading(false);
    }
  }, [jobCardId, onUploaded, handleClose, uploadReadyPhoto]);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setIsUploading(true);
        await uploadReadyPhoto({ jobCardId, file });
        onUploaded();
        handleClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to upload photo";
        setCameraError(msg);
      } finally {
        setIsUploading(false);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [jobCardId, onUploaded, handleClose, uploadReadyPhoto],
  );

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Photo of Completed Item(s)</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {cameraStream ? (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg bg-black"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCapture}
                  disabled={isUploading}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? "Uploading..." : "Capture Photo"}
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-3 text-sm font-medium rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cameraError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{cameraError}</p>
              )}
              <button
                onClick={startCamera}
                className="w-full inline-flex items-center justify-center px-4 py-4 text-sm font-medium rounded-lg border-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                Take Photo with Camera
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                className="w-full inline-flex items-center justify-center px-4 py-4 text-sm font-medium rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {isUploading ? "Uploading..." : "Upload from Device"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
