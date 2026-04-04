"use client";

import { Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "sc_user_initials";

interface SavedInitials {
  text: string;
  imageDataUrl: string | null;
}

interface InitialsPadProps {
  onSave: (text: string, imageDataUrl: string | null) => void;
  onCancel: () => void;
  currentValue?: string | null;
}

function savedInitials(): SavedInitials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedInitials;
  } catch {
    return null;
  }
}

function persistInitials(initials: SavedInitials): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initials));
  } catch {
    // localStorage may be unavailable
  }
}

export function InitialsPad(props: InitialsPadProps) {
  const saved = savedInitials();
  const [mode, setMode] = useState<"type" | "draw">(saved?.imageDataUrl ? "draw" : "type");
  const [text, setText] = useState(props.currentValue || saved?.text || "");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [useSaved, setUseSaved] = useState(false);

  const canvasW = 160;
  const canvasH = 80;

  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (saved?.imageDataUrl && !hasDrawn) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvasW, canvasH);
        setHasDrawn(true);
      };
      img.src = saved.imageDataUrl;
    }
  }, [mode]);

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
      lastPointRef.current = canvasPosition(e);
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
      setHasDrawn(true);
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
    ctx.fillRect(0, 0, canvasW, canvasH);
    setHasDrawn(false);
  }, []);

  const handleSave = useCallback(() => {
    if (mode === "type") {
      const trimmed = text.trim();
      if (!trimmed) return;
      const toSave: SavedInitials = { text: trimmed, imageDataUrl: null };
      persistInitials(toSave);
      props.onSave(trimmed, null);
    } else {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      const dataUrl = canvas.toDataURL("image/png");
      const trimmed = text.trim() || saved?.text || "init";
      const toSave: SavedInitials = { text: trimmed, imageDataUrl: dataUrl };
      persistInitials(toSave);
      props.onSave(trimmed, dataUrl);
    }
  }, [mode, text, hasDrawn, props.onSave, saved?.text]);

  const handleUseSaved = useCallback(() => {
    if (!saved) return;
    props.onSave(saved.text, saved.imageDataUrl);
  }, [saved, props.onSave]);

  const canSave = mode === "type" ? text.trim().length > 0 : hasDrawn;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onCancel();
      }}
    >
      <div className="w-80 rounded-lg bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Enter Initials</h3>
          <button
            type="button"
            onClick={props.onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            X
          </button>
        </div>

        <div className="mb-3 flex rounded-md border border-gray-200">
          <button
            type="button"
            onClick={() => setMode("type")}
            className={`flex-1 rounded-l-md px-3 py-1.5 text-xs font-medium ${mode === "type" ? "bg-teal-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
          >
            Type
          </button>
          <button
            type="button"
            onClick={() => setMode("draw")}
            className={`flex-1 rounded-r-md px-3 py-1.5 text-xs font-medium ${mode === "draw" ? "bg-teal-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
          >
            <span className="inline-flex items-center gap-1">
              <Pencil className="h-3 w-3" /> Draw
            </span>
          </button>
        </div>

        {mode === "type" ? (
          <div className="mb-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={5}
              autoFocus
              placeholder="e.g. AB"
              className="w-full rounded border border-gray-300 px-3 py-2 text-center text-lg font-bold tracking-widest focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) handleSave();
              }}
            />
            <p className="mt-1 text-center text-[10px] text-gray-400">Max 5 characters</p>
          </div>
        ) : (
          <div className="mb-3">
            <div className="overflow-hidden rounded border border-gray-300 bg-white">
              <canvas
                ref={canvasRef}
                width={canvasW}
                height={canvasH}
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
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[10px] text-gray-400">Draw your initials above</p>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[10px] text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {saved && !useSaved && (
          <button
            type="button"
            onClick={handleUseSaved}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100"
          >
            Use saved: <span className="font-bold">{saved.text}</span>
            {saved.imageDataUrl && (
              <img src={saved.imageDataUrl} alt="Saved" className="h-5 rounded border bg-white" />
            )}
          </button>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={props.onCancel}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md bg-teal-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
