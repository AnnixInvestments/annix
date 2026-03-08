"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CUT_COLORS } from "./jigsawLayout";
import { effectiveLength, effectiveWidth, type JigsawPanel } from "./jigsawTypes";

export function DraggablePanel(props: {
  panel: JigsawPanel;
  scale: number | null;
  onRotate: (panelId: string) => void;
  isPlaced: boolean;
}) {
  const { panel, scale, onRotate, isPlaced } = props;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: panel.panelId,
  });

  const colorClass = CUT_COLORS[panel.colorIndex % CUT_COLORS.length];
  const ew = effectiveWidth(panel);
  const el = effectiveLength(panel);

  const dragTransform = transform ? CSS.Translate.toString(transform) : undefined;

  if (isPlaced && scale !== null) {
    const widthPx = el * scale;
    const heightPx = ew * scale;
    const showFullLabel = widthPx > 60 && heightPx > 30;

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
        className={`${colorClass} absolute rounded cursor-grab active:cursor-grabbing border border-white/40 flex flex-col items-center justify-center text-white overflow-hidden select-none ${isDragging ? "opacity-50 shadow-lg" : "shadow-sm"}`}
      >
        {showFullLabel ? (
          <>
            <span className="text-[10px] font-bold leading-tight truncate px-0.5">
              {panel.itemNo || panel.panelId}
            </span>
            <span className="text-[8px] leading-tight opacity-80">
              {ew}x{el}
            </span>
          </>
        ) : (
          <span className="text-[8px] font-bold truncate px-0.5">
            {panel.itemNo || panel.panelId}
          </span>
        )}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRotate(panel.panelId);
          }}
          className="absolute top-0 right-0 w-4 h-4 bg-white/30 hover:bg-white/50 rounded-bl text-[8px] leading-none flex items-center justify-center"
          title="Rotate"
        >
          R
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: dragTransform, zIndex: isDragging ? 50 : 1 }}
      {...listeners}
      {...attributes}
      className={`${colorClass} rounded cursor-grab active:cursor-grabbing border border-white/40 p-2 text-white select-none flex items-center gap-2 ${isDragging ? "opacity-50 shadow-lg" : "shadow-sm"}`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold truncate">{panel.itemNo || panel.panelId}</div>
        <div className="text-[10px] opacity-80 truncate">
          {ew}mm x {el}mm
        </div>
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRotate(panel.panelId);
        }}
        className="w-6 h-6 bg-white/30 hover:bg-white/50 rounded text-[10px] font-bold flex items-center justify-center flex-shrink-0"
        title="Rotate"
      >
        R
      </button>
    </div>
  );
}
