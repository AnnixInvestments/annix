"use client";

import { useDroppable } from "@dnd-kit/core";
import { useRef, useState } from "react";
import { DraggablePanel } from "./DraggablePanel";
import type { JigsawRoll, PlacedPanel } from "./jigsawTypes";

function GridLines({ roll, scale }: { roll: JigsawRoll; scale: number }) {
  const gridMm = 100;
  const vLines = Math.floor(roll.lengthMm / gridMm);
  const hLines = Math.floor(roll.widthMm / gridMm);

  return (
    <>
      {Array.from({ length: vLines }, (_, i) => {
        const xPx = (i + 1) * gridMm * scale;
        return (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 border-l border-gray-300/30"
            style={{ left: `${xPx}px` }}
          />
        );
      })}
      {Array.from({ length: hLines }, (_, i) => {
        const yPx = (i + 1) * gridMm * scale;
        return (
          <div
            key={`h-${i}`}
            className="absolute left-0 right-0 border-t border-gray-300/30"
            style={{ top: `${yPx}px` }}
          />
        );
      })}
    </>
  );
}

export function RollCanvas(props: {
  rollIndex: number;
  roll: JigsawRoll;
  panels: PlacedPanel[];
  onRotate: (panelId: string) => void;
  rotateFailedId: string | null;
  onUpdateRoll: (rollIndex: number, field: keyof JigsawRoll, value: number) => void;
  onRemoveRoll: (rollIndex: number) => void;
}) {
  const { rollIndex, roll, panels, onRotate, rotateFailedId, onUpdateRoll, onRemoveRoll } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(700);

  const { isOver, setNodeRef } = useDroppable({
    id: `roll-${rollIndex}`,
  });

  const observerRef = useRef<ResizeObserver | null>(null);
  const setRefs = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    if (el) {
      containerRef.current = el;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      observer.observe(el);
      observerRef.current = observer;
      setContainerWidth(el.clientWidth);
    }
  };

  const scale = containerWidth / roll.lengthMm;
  const heightPx = roll.widthMm * scale;

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b text-xs">
        <span className="font-semibold text-gray-700">Roll {rollIndex + 1}</span>
        <label className="flex items-center gap-1 text-gray-500">
          W
          <input
            type="number"
            value={roll.widthMm}
            onChange={(e) => onUpdateRoll(rollIndex, "widthMm", Number(e.target.value))}
            className="w-16 px-1 py-0.5 border rounded text-xs"
            min={100}
            max={2000}
            step={50}
          />
          mm
        </label>
        <label className="flex items-center gap-1 text-gray-500">
          L
          <input
            type="number"
            value={roll.lengthMm}
            onChange={(e) => onUpdateRoll(rollIndex, "lengthMm", Number(e.target.value))}
            className="w-20 px-1 py-0.5 border rounded text-xs"
            min={1000}
            max={25000}
            step={100}
          />
          mm
        </label>
        <label className="flex items-center gap-1 text-gray-500">
          T
          <input
            type="number"
            value={roll.thicknessMm}
            onChange={(e) => onUpdateRoll(rollIndex, "thicknessMm", Number(e.target.value))}
            className="w-14 px-1 py-0.5 border rounded text-xs"
            min={1}
            max={50}
            step={0.5}
          />
          mm
        </label>
        <span className="text-gray-400 ml-auto">
          {(roll.widthMm / 1000).toFixed(2)}m x {(roll.lengthMm / 1000).toFixed(1)}m
        </span>
        <button
          type="button"
          onClick={() => onRemoveRoll(rollIndex)}
          className="text-red-400 hover:text-red-600 ml-1 font-bold"
          title="Remove roll"
        >
          X
        </button>
      </div>

      <div
        ref={setRefs}
        className={`relative transition-colors ${isOver ? "bg-blue-50/50" : "bg-gray-100"}`}
        style={{
          height: `${Math.max(heightPx, 60)}px`,
          minHeight: "60px",
        }}
      >
        <GridLines roll={roll} scale={scale} />

        {panels.map((panel) => (
          <div
            key={panel.panelId}
            className="absolute"
            style={{
              left: `${panel.xMm * scale}px`,
              top: `${panel.yMm * scale}px`,
            }}
          >
            <DraggablePanel
              panel={panel}
              scale={scale}
              onRotate={onRotate}
              rotateFailed={rotateFailedId === panel.panelId}
              isPlaced={true}
            />
          </div>
        ))}

        {panels.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs pointer-events-none">
            Drop panels here
          </div>
        )}
      </div>
    </div>
  );
}
