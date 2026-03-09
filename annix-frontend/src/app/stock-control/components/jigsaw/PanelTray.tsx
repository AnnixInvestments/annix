"use client";

import { useDroppable } from "@dnd-kit/core";
import { DraggablePanel } from "./DraggablePanel";
import type { JigsawPanel } from "./jigsawTypes";

export function PanelTray(props: {
  panels: JigsawPanel[];
  onRotate: (panelId: string) => void;
  onEditDimensions: (panelId: string, widthMm: number, lengthMm: number) => void;
}) {
  const { panels, onRotate, onEditDimensions } = props;
  const { isOver, setNodeRef } = useDroppable({ id: "tray" });

  return (
    <div
      ref={setNodeRef}
      className={`w-52 flex-shrink-0 border rounded-lg p-2 overflow-y-auto max-h-[600px] space-y-1.5 transition-colors ${isOver ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-200"}`}
    >
      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 px-1">
        Panel Tray
      </div>
      {panels.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">All panels placed</p>
      ) : (
        panels.map((panel) => (
          <DraggablePanel
            key={panel.panelId}
            panel={panel}
            scale={null}
            onRotate={onRotate}
            onEditDimensions={onEditDimensions}
            isPlaced={false}
          />
        ))
      )}
      <div className="text-[10px] text-gray-400 text-center pt-1">{panels.length} remaining</div>
    </div>
  );
}
