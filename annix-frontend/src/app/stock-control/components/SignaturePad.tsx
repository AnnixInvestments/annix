"use client";

import { Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  existingSignature?: string | null;
  width?: number;
  height?: number;
}

export function SignaturePad(props: SignaturePadProps) {
  const { onSave, onCancel, existingSignature, width = 400, height = 200 } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [showDrawPad, setShowDrawPad] = useState(!existingSignature);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!showDrawPad) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [width, height, showDrawPad]);

  const canvasPosition = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      const pos = canvasPosition(e);
      lastPointRef.current = pos;
    },
    [canvasPosition],
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !lastPointRef.current) return;

      const pos = canvasPosition(e);

      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      lastPointRef.current = pos;
      setHasSignature(true);
    },
    [isDrawing, canvasPosition],
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
  }, [width, height]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  }, [onSave]);

  const useExisting = useCallback(() => {
    if (existingSignature) {
      onSave("");
    }
  }, [existingSignature, onSave]);

  if (existingSignature && !showDrawPad) {
    return (
      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-4">
          <p className="text-sm text-gray-500 mb-2">Your saved signature</p>
          <div className="bg-white rounded border border-gray-200 p-3 flex items-center justify-center">
            <img
              src={existingSignature}
              alt="Saved signature"
              className="max-h-24 object-contain"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setShowDrawPad(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
          >
            <Pencil className="h-3.5 w-3.5" />
            Draw New Signature
          </button>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={useExisting}
              className="px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700"
            >
              Use This Signature
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <p className="text-sm text-gray-500 text-center">
        Draw your signature above using mouse or touch
      </p>

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={clearCanvas}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
        >
          Clear
        </button>

        <div className="flex space-x-3">
          {existingSignature && (
            <button
              type="button"
              onClick={() => setShowDrawPad(false)}
              className="px-4 py-2 text-sm text-teal-600 hover:text-teal-700 border border-teal-300 rounded-md"
            >
              Use Saved
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasSignature}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}
