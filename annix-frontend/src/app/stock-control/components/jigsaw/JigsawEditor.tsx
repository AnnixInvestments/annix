"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useState } from "react";
import type { RubberPlanManualRoll } from "@/app/lib/api/stockControlApi";
import type { ParsedPipeItem, RubberSpec } from "@/app/stock-control/lib/rubberCuttingCalculator";
import {
  CUT_COLORS,
  hasOverlap,
  isWithinBounds,
  panelsFromParsedItems,
  serializeToManualRolls,
} from "./jigsawLayout";
import {
  effectiveLength,
  effectiveWidth,
  type JigsawPanel,
  type JigsawRoll,
  type PlacedPanel,
  snapToGrid,
} from "./jigsawTypes";
import { PanelTray } from "./PanelTray";
import { RollCanvas } from "./RollCanvas";

export function JigsawEditor({
  parsedItems,
  rubberSpec,
  existingManualRolls,
  onSave,
  saving,
}: {
  parsedItems: ParsedPipeItem[];
  rubberSpec: RubberSpec | null | undefined;
  existingManualRolls: RubberPlanManualRoll[];
  onSave: (rolls: RubberPlanManualRoll[]) => void;
  saving: boolean;
}) {
  const [rolls, setRolls] = useState<JigsawRoll[]>(() => {
    if (existingManualRolls.length > 0) {
      return existingManualRolls.map((r) => ({
        widthMm: r.widthMm,
        lengthMm: r.lengthM * 1000,
        thicknessMm: r.thicknessMm,
      }));
    }
    return [
      {
        widthMm: 1200,
        lengthMm: 12500,
        thicknessMm: rubberSpec?.thicknessMm ?? 5,
      },
    ];
  });

  const allPanels = panelsFromParsedItems(parsedItems);

  const [placedPanels, setPlacedPanels] = useState<PlacedPanel[]>([]);
  const [unplacedPanels, setUnplacedPanels] = useState<JigsawPanel[]>(() => allPanels);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const findPanel = useCallback(
    (panelId: string): { panel: JigsawPanel | PlacedPanel; source: "tray" | "roll" } | null => {
      const placed = placedPanels.find((p) => p.panelId === panelId);
      if (placed) return { panel: placed, source: "roll" };
      const unplaced = unplacedPanels.find((p) => p.panelId === panelId);
      if (unplaced) return { panel: unplaced, source: "tray" };
      return null;
    },
    [placedPanels, unplacedPanels],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);

    const { active, over } = event;
    if (!over) return;

    const panelId = String(active.id);
    const overId = String(over.id);
    const found = findPanel(panelId);
    if (!found) return;

    const { panel, source } = found;

    if (overId === "tray") {
      if (source === "roll") {
        setPlacedPanels((prev) => prev.filter((p) => p.panelId !== panelId));
        setUnplacedPanels((prev) => [...prev, { ...panel, rotated: panel.rotated }]);
      }
      return;
    }

    if (overId.startsWith("roll-")) {
      const rollIndex = parseInt(overId.replace("roll-", ""), 10);
      const roll = rolls[rollIndex];
      if (!roll) return;

      const overRect = over.rect;
      const activeTranslated = active.rect.current.translated;

      let xMm = 0;
      let yMm = 0;

      if (overRect && activeTranslated) {
        const scale = (overRect.width || 700) / roll.lengthMm;

        const dropX = activeTranslated.left - overRect.left;
        const dropY = activeTranslated.top - overRect.top;

        xMm = snapToGrid(dropX / scale);
        yMm = snapToGrid(dropY / scale);
      }

      xMm = Math.max(0, xMm);
      yMm = Math.max(0, yMm);

      const candidate: PlacedPanel = {
        ...panel,
        rollIndex,
        xMm,
        yMm,
      };

      if (!isWithinBounds(candidate, roll)) {
        const ew = effectiveWidth(candidate);
        const el = effectiveLength(candidate);
        candidate.xMm = Math.min(candidate.xMm, roll.lengthMm - el);
        candidate.yMm = Math.min(candidate.yMm, roll.widthMm - ew);
        candidate.xMm = Math.max(0, snapToGrid(candidate.xMm));
        candidate.yMm = Math.max(0, snapToGrid(candidate.yMm));
      }

      if (!isWithinBounds(candidate, roll)) return;

      const otherPlaced = placedPanels.filter((p) => p.panelId !== panelId);
      if (hasOverlap(candidate, otherPlaced)) return;

      if (source === "tray") {
        setUnplacedPanels((prev) => prev.filter((p) => p.panelId !== panelId));
        setPlacedPanels((prev) => [...prev.filter((p) => p.panelId !== panelId), candidate]);
      } else {
        setPlacedPanels((prev) => prev.map((p) => (p.panelId === panelId ? candidate : p)));
      }
    }
  };

  const handleRotate = useCallback(
    (panelId: string) => {
      const placedIdx = placedPanels.findIndex((p) => p.panelId === panelId);
      if (placedIdx >= 0) {
        const panel = placedPanels[placedIdx];
        const rotated: PlacedPanel = { ...panel, rotated: !panel.rotated };
        const roll = rolls[rotated.rollIndex];
        if (roll && isWithinBounds(rotated, roll) && !hasOverlap(rotated, placedPanels)) {
          setPlacedPanels((prev) => prev.map((p) => (p.panelId === panelId ? rotated : p)));
        }
        return;
      }

      setUnplacedPanels((prev) =>
        prev.map((p) => (p.panelId === panelId ? { ...p, rotated: !p.rotated } : p)),
      );
    },
    [placedPanels, rolls],
  );

  const addRoll = () => {
    setRolls((prev) => [
      ...prev,
      {
        widthMm: 1200,
        lengthMm: 12500,
        thicknessMm: rubberSpec?.thicknessMm ?? 5,
      },
    ]);
  };

  const removeRoll = (rollIndex: number) => {
    const panelsOnRoll = placedPanels.filter((p) => p.rollIndex === rollIndex);
    const movedBack: JigsawPanel[] = panelsOnRoll.map(
      ({ rollIndex: _ri, xMm: _x, yMm: _y, ...rest }) => rest,
    );

    setPlacedPanels((prev) =>
      prev
        .filter((p) => p.rollIndex !== rollIndex)
        .map((p) => (p.rollIndex > rollIndex ? { ...p, rollIndex: p.rollIndex - 1 } : p)),
    );
    setUnplacedPanels((prev) => [...prev, ...movedBack]);
    setRolls((prev) => prev.filter((_, i) => i !== rollIndex));
  };

  const updateRoll = (rollIndex: number, field: keyof JigsawRoll, value: number) => {
    const newRolls = rolls.map((r, i) => (i === rollIndex ? { ...r, [field]: value } : r));
    const newRoll = newRolls[rollIndex];

    const outOfBounds = placedPanels.filter(
      (p) => p.rollIndex === rollIndex && !isWithinBounds(p, newRoll),
    );

    if (outOfBounds.length > 0) {
      const movedBack: JigsawPanel[] = outOfBounds.map(
        ({ rollIndex: _ri, xMm: _x, yMm: _y, ...rest }) => rest,
      );
      setPlacedPanels((prev) =>
        prev.filter((p) => !(p.rollIndex === rollIndex && !isWithinBounds(p, newRoll))),
      );
      setUnplacedPanels((prev) => [...prev, ...movedBack]);
    }

    setRolls(newRolls);
  };

  const handleSave = () => {
    const serialized = serializeToManualRolls(rolls, placedPanels);
    onSave(serialized);
  };

  const activePanel = activeDragId ? findPanel(activeDragId) : null;
  const activePanelData = activePanel?.panel ?? null;

  return (
    <div>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3">
          <PanelTray panels={unplacedPanels} onRotate={handleRotate} />

          <div className="flex-1 space-y-3">
            {rolls.map((roll, idx) => (
              <RollCanvas
                key={idx}
                rollIndex={idx}
                roll={roll}
                panels={placedPanels.filter((p) => p.rollIndex === idx)}
                onRotate={handleRotate}
                onUpdateRoll={updateRoll}
                onRemoveRoll={removeRoll}
              />
            ))}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addRoll}
                className="px-3 py-1.5 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-gray-400 hover:text-gray-600"
              >
                + Add Roll
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || placedPanels.length === 0}
                className="px-4 py-2 rounded text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 ml-auto"
              >
                {saving ? "Saving..." : "Save Manual Plan"}
              </button>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activePanelData && (
            <div
              className={`${CUT_COLORS[activePanelData.colorIndex % CUT_COLORS.length]} rounded px-2 py-1 text-white text-xs font-bold shadow-lg opacity-90`}
            >
              {activePanelData.itemNo || activePanelData.panelId}
              <span className="ml-1 text-[10px] opacity-80">
                {effectiveWidth(activePanelData)}x{effectiveLength(activePanelData)}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
