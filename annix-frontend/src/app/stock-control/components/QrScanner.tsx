"use client";

import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { useCallback, useEffect, useRef, useState } from "react";

interface QrScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScannedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const scannerId = "qr-scanner-container";
    let mounted = true;

    const startScanner = async () => {
      if (!containerRef.current || hasScannedRef.current) return;

      try {
        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (cameras.length === 0) {
          setError("No camera found on this device");
          setIsInitializing(false);
          return;
        }

        const backCamera = cameras.find(
          (c) =>
            c.label.toLowerCase().includes("back") ||
            c.label.toLowerCase().includes("rear") ||
            c.label.toLowerCase().includes("environment"),
        );
        const cameraId = backCamera?.id ?? cameras[0].id;

        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!hasScannedRef.current && mounted) {
              hasScannedRef.current = true;
              onScan(decodedText);
            }
          },
          () => {
            // QR code not detected - ignore
          },
        );

        if (mounted) {
          setIsInitializing(false);
        }
      } catch (err) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "Failed to start camera";
          if (message.includes("Permission")) {
            setError("Camera permission denied. Please allow camera access.");
          } else {
            setError(message);
          }
          setIsInitializing(false);
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [onScan, stopScanner]);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative h-full flex flex-col">
        <div className="flex items-center justify-between p-4 bg-black/80">
          <h2 className="text-white font-medium">Scan QR Code</h2>
          <button onClick={handleClose} className="p-2 text-white hover:bg-white/10 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          {isInitializing && !error && (
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p>Starting camera...</p>
            </div>
          )}

          {error && (
            <div className="text-center text-white p-6 max-w-sm">
              <svg
                className="w-16 h-16 text-red-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-lg font-medium mb-2">Camera Error</p>
              <p className="text-sm text-gray-300 mb-4">{error}</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-white text-black rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          )}

          <div
            ref={containerRef}
            id="qr-scanner-container"
            className={`w-full max-w-md ${error ? "hidden" : ""}`}
          />
        </div>

        {!error && !isInitializing && (
          <div className="p-4 bg-black/80 text-center">
            <p className="text-white/70 text-sm">Position the QR code within the frame</p>
          </div>
        )}
      </div>
    </div>
  );
}
