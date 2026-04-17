"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { CUT_COLORS } from "./jigsawLayout";
import { effectiveLength, effectiveWidth, type JigsawPanel } from "./jigsawTypes";

function isOverridden(panel: JigsawPanel): boolean {
  return panel.widthMm !== panel.originalWidthMm || panel.lengthMm !== panel.originalLengthMm;
}

function RotateIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M2 8a6 6 0 0 1 10.2-4.2" strokeLinecap="round" />
      <path d="M12 1v4H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DraggablePanel(props: {
  panel: JigsawPanel;
  scale: number | null;
  onRotate: (panelId: string) => void;
  onEditDimensions?: (panelId: string, widthMm: number, lengthMm: number) => void;
  rotateFailed?: boolean;
  isPlaced: boolean;
}) {
  const { panel, scale, onRotate, onEditDimensions, rotateFailed, isPlaced } = props;
  const rawPanelItemNo = panel.itemNo;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: panel.panelId,
  });

  const [editing, setEditing] = useState(false);
  const [editWidth, setEditWidth] = useState(panel.widthMm);
  const [editLength, setEditLength] = useState(panel.lengthMm);

  const colorClass = CUT_COLORS[panel.colorIndex % CUT_COLORS.length];
  const ew = effectiveWidth(panel);
  const el = effectiveLength(panel);
  const overridden = isOverridden(panel);
  const rotatedLabel = panel.rotated ? "W\u2194L" : "";

  const dragTransform = transform ? CSS.Translate.toString(transform) : undefined;

  const handleStartEdit = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    setEditWidth(panel.widthMm);
    setEditLength(panel.lengthMm);
    setEditing(true);
  };

  const handleConfirmEdit = () => {
    if (onEditDimensions && (editWidth !== panel.widthMm || editLength !== panel.lengthMm)) {
      onEditDimensions(panel.panelId, editWidth, editLength);
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const rotateBtnClass = rotateFailed
    ? "bg-red-500/80 animate-pulse"
    : "bg-white/30 hover:bg-white/50";

  if (isPlaced && scale !== null) {
    const itemNo = panel.itemNo;
    const rawItemNo = panel.itemNo;
    const widthPx = el * scale;
    const heightPx = ew * scale;
    const showFullLabel = widthPx > 60 && heightPx > 30;
    const showRotateBtn = widthPx > 30 && heightPx > 20;

    return (
      <div
        ref={setNodeRef}
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          transform: dragTransform,
          zIndex: isDragging ? 50 : 10,
        }}
        {...listeners}
        {...attributes}
        className={`${colorClass} absolute rounded cursor-grab active:cursor-grabbing ${overridden ? "border-2 border-yellow-300" : "border border-white/40"} flex flex-col items-center justify-center text-white overflow-hidden select-none ${isDragging ? "opacity-50 shadow-lg" : "shadow-sm"}`}
      >
        {showFullLabel ? (
          <>
            <span className="text-[10px] font-bold leading-tight truncate px-0.5">
              {itemNo || panel.panelId}
            </span>
            <span className="text-[8px] leading-tight opacity-80">
              {ew}x{el}
              {panel.rotated ? " (rotated)" : ""}
            </span>
          </>
        ) : (
          <span className="text-[8px] font-bold truncate px-0.5">{rawItemNo || panel.panelId}</span>
        )}
        {showRotateBtn && (
          <button
            type="button"
            aria-label="Rotate panel"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRotate(panel.panelId);
            }}
            className={`absolute top-0 right-0 w-5 h-5 ${rotateBtnClass} rounded-bl flex items-center justify-center`}
            title={rotateFailed ? "Cannot rotate: panel too large for roll" : "Rotate 90\u00b0"}
          >
            <RotateIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (editing) {
    const itemNo = panel.itemNo;
    return (
      <div
        className={`${colorClass} rounded border-2 border-yellow-300 p-2 text-white select-none`}
      >
        <div className="text-xs font-bold truncate mb-1.5">{itemNo || panel.panelId}</div>
        <div className="flex items-center gap-1 mb-1">
          <label className="text-[10px] opacity-80">W</label>
          <input
            type="number"
            value={editWidth}
            onChange={(e) => setEditWidth(Number(e.target.value))}
            className="w-14 px-1 py-0.5 rounded text-[10px] text-gray-900 bg-white/90"
            min={50}
            max={2000}
            step={10}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <label className="text-[10px] opacity-80">L</label>
          <input
            type="number"
            value={editLength}
            onChange={(e) => setEditLength(Number(e.target.value))}
            className="w-14 px-1 py-0.5 rounded text-[10px] text-gray-900 bg-white/90"
            min={50}
            max={25000}
            step={10}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        {overridden && (
          <div className="text-[9px] opacity-60 mb-1">
            Calc: {panel.originalWidthMm}x{panel.originalLengthMm}
          </div>
        )}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleConfirmEdit}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 px-1 py-0.5 bg-white/30 hover:bg-white/50 rounded text-[10px] font-bold"
          >
            OK
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 px-1 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: dragTransform, zIndex: isDragging ? 50 : 1 }}
      {...listeners}
      {...attributes}
      className={`${colorClass} rounded cursor-grab active:cursor-grabbing ${overridden ? "border-2 border-yellow-300" : "border border-white/40"} p-2 text-white select-none flex items-center gap-2 ${isDragging ? "opacity-50 shadow-lg" : "shadow-sm"}`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold truncate">{rawPanelItemNo || panel.panelId}</div>
        <div
          className="text-[10px] opacity-80 truncate cursor-pointer hover:opacity-100 hover:underline"
          onPointerDown={onEditDimensions ? handleStartEdit : undefined}
        >
          {ew}mm x {el}mm
          {panel.rotated ? " (rotated)" : ""}
        </div>
        {overridden && (
          <div className="text-[9px] opacity-50 truncate">
            was {panel.originalWidthMm}x{panel.originalLengthMm}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        {onEditDimensions && (
          <button
            type="button"
            onPointerDown={handleStartEdit}
            className="w-6 h-5 bg-white/30 hover:bg-white/50 rounded text-[9px] flex items-center justify-center"
            title="Edit dimensions"
          >
            E
          </button>
        )}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRotate(panel.panelId);
          }}
          className={`w-6 h-6 ${rotateBtnClass} rounded flex items-center justify-center`}
          title={`Rotate 90\u00b0${rotatedLabel ? ` (${rotatedLabel})` : ""}`}
        >
          <RotateIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
