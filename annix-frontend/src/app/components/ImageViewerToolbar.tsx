"use client";

import { useCallback, useRef, useState } from "react";

export interface ImageViewerState {
  scale: number;
  rotation: number;
  panX: number;
  panY: number;
}

const SCALE_MIN = 0.5;
const SCALE_MAX = 3.0;
const SCALE_STEP = 0.25;

export function useImageViewer(initialScale = 1.0) {
  const [state, setState] = useState<ImageViewerState>({
    scale: initialScale,
    rotation: 0,
    panX: 0,
    panY: 0,
  });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.min(prev.scale + SCALE_STEP, SCALE_MAX),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.max(prev.scale - SCALE_STEP, SCALE_MIN),
    }));
  }, []);

  const rotateClockwise = useCallback(() => {
    setState((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({ scale: initialScale, rotation: 0, panX: 0, panY: 0 });
  }, [initialScale]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (state.scale <= 1.0) return;
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: state.panX,
        startPanY: state.panY,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = moveEvent.clientX - dragRef.current.startX;
        const dy = moveEvent.clientY - dragRef.current.startY;
        setState((prev) => ({
          ...prev,
          panX: dragRef.current!.startPanX + dx,
          panY: dragRef.current!.startPanY + dy,
        }));
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [state.scale, state.panX, state.panY],
  );

  return { state, zoomIn, zoomOut, rotateClockwise, reset, handleMouseDown };
}

export function imageViewerTransform(state: ImageViewerState): React.CSSProperties {
  return {
    transform: `translate(${state.panX}px, ${state.panY}px) scale(${state.scale}) rotate(${state.rotation}deg)`,
    transformOrigin: "center center",
    transition: state.panX === 0 && state.panY === 0 ? "transform 0.2s ease" : "none",
    cursor: state.scale > 1.0 ? "grab" : "default",
  };
}

interface ImageViewerToolbarProps {
  state: ImageViewerState;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onReset: () => void;
}

export function ImageViewerToolbar(props: ImageViewerToolbarProps) {
  const { state, onZoomIn, onZoomOut, onRotate, onReset } = props;

  const btnClass =
    "p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors";

  return (
    <div className="flex items-center space-x-1">
      <button onClick={onZoomOut} className={btnClass} title="Zoom out">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <span className="text-xs text-gray-500 min-w-[3rem] text-center">
        {Math.round(state.scale * 100)}%
      </span>
      <button onClick={onZoomIn} className={btnClass} title="Zoom in">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <button onClick={onRotate} className={btnClass} title="Rotate 90°">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
      {(state.scale !== 1.0 || state.rotation !== 0) && (
        <button onClick={onReset} className={btnClass} title="Reset view">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
