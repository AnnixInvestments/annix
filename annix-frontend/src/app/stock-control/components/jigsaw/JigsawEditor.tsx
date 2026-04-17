"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RubberDimensionOverride, RubberPlanManualRoll } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
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

function unplacePanel(panel: PlacedPanel): JigsawPanel {
  return {
    panelId: panel.panelId,
    itemId: panel.itemId,
    itemNo: panel.itemNo,
    description: panel.description,
    widthMm: panel.widthMm,
    lengthMm: panel.lengthMm,
    originalWidthMm: panel.originalWidthMm,
    originalLengthMm: panel.originalLengthMm,
    rotated: panel.rotated,
    colorIndex: panel.colorIndex,
    dimensionContext: panel.dimensionContext,
  };
}

export function JigsawEditor(props: {
  parsedItems: ParsedPipeItem[];
  rubberSpec: RubberSpec | null | undefined;
  existingManualRolls: RubberPlanManualRoll[];
  onSave: (rolls: RubberPlanManualRoll[], overrides: RubberDimensionOverride[]) => void;
  saving: boolean;
}) {
  const { parsedItems, rubberSpec, existingManualRolls, onSave, saving } = props;

  const allPanels = useMemo(() => panelsFromParsedItems(parsedItems), [parsedItems]);

  const defaultRollWidthMm = useMemo(() => {
    const widest = allPanels.reduce((max, p) => Math.max(max, Math.min(p.widthMm, p.lengthMm)), 0);
    const clamped = Math.max(1200, Math.min(1450, widest));
    return Math.ceil(clamped / 50) * 50;
  }, [allPanels]);

  const [rolls, setRolls] = useState<JigsawRoll[]>(() => {
    const thicknessMm = rubberSpec?.thicknessMm;
    if (existingManualRolls.length > 0) {
      return existingManualRolls.map((r) => ({
        widthMm: r.widthMm,
        lengthMm: r.lengthM * 1000,
        thicknessMm: r.thicknessMm,
      }));
    }
    return [
      {
        widthMm: defaultRollWidthMm,
        lengthMm: 12500,
        thicknessMm: thicknessMm || 5,
      },
    ];
  });

  const [placedPanels, setPlacedPanels] = useState<PlacedPanel[]>([]);
  const [unplacedPanels, setUnplacedPanels] = useState<JigsawPanel[]>(() => allPanels);

  useEffect(() => {
    const specThickness = rubberSpec?.thicknessMm;
    if (!specThickness) return;
    setRolls((prev) =>
      prev.some((r) => r.thicknessMm !== specThickness)
        ? prev.map((r) => ({ ...r, thicknessMm: specThickness }))
        : prev,
    );
  }, [rubberSpec?.thicknessMm]);

  useEffect(() => {
    const allIds = new Set(allPanels.map((p) => p.panelId));
    const trackedIds = new Set([
      ...placedPanels.map((p) => p.panelId),
      ...unplacedPanels.map((p) => p.panelId),
    ]);
    const sameSet =
      allIds.size === trackedIds.size && [...allIds].every((id) => trackedIds.has(id));
    if (!sameSet) {
      setPlacedPanels([]);
      setUnplacedPanels(allPanels);
    }
  }, [allPanels, placedPanels, unplacedPanels]);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [suggestionsApplied, setSuggestionsApplied] = useState(false);

  useEffect(() => {
    if (suggestionsApplied || existingManualRolls.length > 0) return;

    const contexts = new Map<string, JigsawPanel>();
    unplacedPanels.forEach((p) => {
      const itemType = p.dimensionContext.itemType;
      const schedule = p.dimensionContext.schedule;
      const nbMm = p.dimensionContext.nbMm;
      const flangeConfig = p.dimensionContext.flangeConfig;
      if (p.panelId !== p.itemId) return;
      const key = [
        itemType || "",
        nbMm || 0,
        schedule || "",
        p.dimensionContext.lengthMm,
        flangeConfig || "",
      ].join("|");
      if (!contexts.has(key)) contexts.set(key, p);
    });

    const fetchSuggestions = async () => {
      const entries = Array.from(contexts.entries());
      const results = await Promise.all(
        entries.map(async ([key, panel]) => {
          try {
            const suggestions = await stockControlApiClient.rubberDimensionSuggestions({
              itemType: panel.dimensionContext.itemType,
              nbMm: panel.dimensionContext.nbMm,
              schedule: panel.dimensionContext.schedule,
              pipeLengthMm: panel.dimensionContext.lengthMm,
              flangeConfig: panel.dimensionContext.flangeConfig,
            });
            if (suggestions.length > 0) {
              return { key, suggestion: suggestions[0] };
            }
          } catch {
            // Suggestions are best-effort
          }
          return null;
        }),
      );

      const suggestionMap = new Map<string, RubberDimensionOverride>();
      results.forEach((r) => {
        if (r) suggestionMap.set(r.key, r.suggestion);
      });

      if (suggestionMap.size > 0) {
        setUnplacedPanels((prev) =>
          prev.map((p) => {
            const itemType = p.dimensionContext.itemType;
            const schedule = p.dimensionContext.schedule;
            const nbMm = p.dimensionContext.nbMm;
            const flangeConfig = p.dimensionContext.flangeConfig;
            if (p.panelId !== p.itemId) return p;
            const key = [
              itemType || "",
              nbMm || 0,
              schedule || "",
              p.dimensionContext.lengthMm,
              flangeConfig || "",
            ].join("|");
            const suggestion = suggestionMap.get(key);
            if (suggestion) {
              return {
                ...p,
                widthMm: suggestion.overrideWidthMm,
                lengthMm: suggestion.overrideLengthMm,
              };
            }
            return p;
          }),
        );
      }
      setSuggestionsApplied(true);
    };

    fetchSuggestions();
  }, [suggestionsApplied, existingManualRolls.length, unplacedPanels]);

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
      const activatorEvent = event.activatorEvent as PointerEvent | MouseEvent | null;

      const otherOnRoll = placedPanels.filter(
        (p) => p.rollIndex === rollIndex && p.panelId !== panelId,
      );

      const buildCandidate = (rotated: boolean): PlacedPanel | null => {
        const probe: PlacedPanel = { ...panel, rotated, rollIndex, xMm: 0, yMm: 0 };
        const el = effectiveLength(probe);
        const ew = effectiveWidth(probe);
        if (el > roll.lengthMm || ew > roll.widthMm) return null;

        if (activatorEvent && overRect && overRect.width > 0 && overRect.height > 0) {
          const pointerClientX = activatorEvent.clientX + event.delta.x;
          const pointerClientY = activatorEvent.clientY + event.delta.y;
          const scaleX = overRect.width / roll.lengthMm;
          const scaleY = overRect.height / roll.widthMm;
          const rawX = (pointerClientX - overRect.left) / scaleX - el / 2;
          const rawY = (pointerClientY - overRect.top) / scaleY - ew / 2;
          const clampedX = Math.max(0, Math.min(rawX, roll.lengthMm - el));
          const clampedY = Math.max(0, Math.min(rawY, roll.widthMm - ew));

          const horizontallyOverlapping = otherOnRoll.filter((p) => {
            const pl = effectiveLength(p);
            return p.xMm < clampedX + el && p.xMm + pl > clampedX;
          });
          const sortedByY = [...horizontallyOverlapping].sort((a, b) => a.yMm - b.yMm);
          let gravityY = 0;
          for (const p of sortedByY) {
            if (gravityY + ew <= p.yMm) break;
            const pBottom = p.yMm + effectiveWidth(p);
            if (pBottom > gravityY) gravityY = pBottom;
          }

          const snappedY = Math.max(0, Math.min(snapToGrid(gravityY), roll.widthMm - ew));

          const verticallyOverlapping = otherOnRoll.filter((p) => {
            const pw = effectiveWidth(p);
            return p.yMm < snappedY + ew && p.yMm + pw > snappedY;
          });
          const gravityX = verticallyOverlapping
            .map((p) => p.xMm + effectiveLength(p))
            .filter((x) => x <= clampedX + el / 2)
            .reduce((max, x) => Math.max(max, x), 0);

          const snappedX = Math.max(0, Math.min(snapToGrid(gravityX), roll.lengthMm - el));

          probe.xMm = snappedX;
          probe.yMm = snappedY;
        } else {
          const packLeftX = otherOnRoll.reduce(
            (maxX, p) => Math.max(maxX, p.xMm + effectiveLength(p)),
            0,
          );
          probe.xMm = Math.max(0, Math.min(packLeftX, roll.lengthMm - el));
          probe.yMm = 0;
        }

        if (!isWithinBounds(probe, roll)) return null;
        return probe;
      };

      const candidate = buildCandidate(panel.rotated) ?? buildCandidate(!panel.rotated);
      if (!candidate) {
        setRotateFailedId(panelId);
        setTimeout(() => setRotateFailedId(null), 1500);
        return;
      }

      if (source === "tray") {
        setUnplacedPanels((prev) => prev.filter((p) => p.panelId !== panelId));
        setPlacedPanels((prev) => [...prev.filter((p) => p.panelId !== panelId), candidate]);
      } else {
        setPlacedPanels((prev) => prev.map((p) => (p.panelId === panelId ? candidate : p)));
      }
    }
  };

  const handleEditDimensions = useCallback(
    (panelId: string, newWidth: number, newLength: number) => {
      const target = unplacedPanels.find((p) => p.panelId === panelId);
      if (!target) return;

      setUnplacedPanels((prev) =>
        prev.map((p) => {
          if (p.panelId !== panelId) return p;
          return { ...p, widthMm: newWidth, lengthMm: newLength };
        }),
      );

      const placedSiblings = placedPanels.filter((p) => p.panelId === panelId);
      if (placedSiblings.length > 0) {
        const updated = placedSiblings.map((p) => ({
          ...p,
          widthMm: newWidth,
          lengthMm: newLength,
        }));

        const stillValid = updated.filter((p) => {
          const roll = rolls[p.rollIndex];
          return roll && isWithinBounds(p, roll);
        });

        const ejected = updated.filter((p) => {
          const roll = rolls[p.rollIndex];
          return !roll || !isWithinBounds(p, roll);
        });

        const ejectedUnplaced: JigsawPanel[] = ejected.map((p) => unplacePanel(p));

        setPlacedPanels((prev) => [...prev.filter((p) => p.panelId !== panelId), ...stillValid]);
        setUnplacedPanels((prev) => [...prev, ...ejectedUnplaced]);
      }
    },
    [unplacedPanels, placedPanels, rolls],
  );

  const [rotateFailedId, setRotateFailedId] = useState<string | null>(null);

  const handleRotate = useCallback(
    (panelId: string) => {
      const placedIdx = placedPanels.findIndex((p) => p.panelId === panelId);
      if (placedIdx >= 0) {
        const panel = placedPanels[placedIdx];
        const rotated: PlacedPanel = { ...panel, rotated: !panel.rotated };
        const roll = rolls[rotated.rollIndex];
        if (roll && isWithinBounds(rotated, roll) && !hasOverlap(rotated, placedPanels)) {
          setPlacedPanels((prev) => prev.map((p) => (p.panelId === panelId ? rotated : p)));
        } else {
          setRotateFailedId(panelId);
          setTimeout(() => setRotateFailedId(null), 1500);
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
    const thicknessMm = rubberSpec?.thicknessMm;
    setRolls((prev) => [
      ...prev,
      {
        widthMm: 1200,
        lengthMm: 12500,
        thicknessMm: thicknessMm || 5,
      },
    ]);
  };

  const removeRoll = (rollIndex: number) => {
    const panelsOnRoll = placedPanels.filter((p) => p.rollIndex === rollIndex);
    const movedBack: JigsawPanel[] = panelsOnRoll.map((p) => unplacePanel(p));

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
      const movedBack: JigsawPanel[] = outOfBounds.map((p) => unplacePanel(p));
      setPlacedPanels((prev) =>
        prev.filter((p) => !(p.rollIndex === rollIndex && !isWithinBounds(p, newRoll))),
      );
      setUnplacedPanels((prev) => [...prev, ...movedBack]);
    }

    setRolls(newRolls);
  };

  const handleSave = () => {
    const serialized = serializeToManualRolls(rolls, placedPanels);

    const allCurrentPanels = [...unplacedPanels, ...placedPanels];
    const seenBaseIds = new Set<string>();
    const overrides: RubberDimensionOverride[] = allCurrentPanels
      .filter((p) => {
        const changed = p.widthMm !== p.originalWidthMm || p.lengthMm !== p.originalLengthMm;
        const baseId = p.panelId.split("-")[0];
        if (!changed || seenBaseIds.has(baseId)) return false;
        seenBaseIds.add(baseId);
        return true;
      })
      .map((p) => ({
        itemType: p.dimensionContext.itemType,
        nbMm: p.dimensionContext.nbMm,
        odMm: p.dimensionContext.odMm,
        schedule: p.dimensionContext.schedule,
        pipeLengthMm: p.dimensionContext.lengthMm,
        flangeConfig: p.dimensionContext.flangeConfig,
        calculatedWidthMm: p.originalWidthMm,
        calculatedLengthMm: p.originalLengthMm,
        overrideWidthMm: p.widthMm,
        overrideLengthMm: p.lengthMm,
      }));

    onSave(serialized, overrides);
  };

  const activePanel = activeDragId ? findPanel(activeDragId) : null;
  const panel = activePanel?.panel;
  const activePanelData = panel || null;

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3">
          <PanelTray
            panels={unplacedPanels}
            onRotate={handleRotate}
            onEditDimensions={handleEditDimensions}
          />

          <div className="flex-1 space-y-3">
            {rolls.map((roll, idx) => (
              <RollCanvas
                key={idx}
                rollIndex={idx}
                roll={roll}
                panels={placedPanels.filter((p) => p.rollIndex === idx)}
                onRotate={handleRotate}
                rotateFailedId={rotateFailedId}
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
          {activePanelData &&
            (() => {
              const rawActiveItemNo = activePanelData.itemNo;
              return (
                <div
                  className={`${CUT_COLORS[activePanelData.colorIndex % CUT_COLORS.length]} rounded px-2 py-1 text-white text-xs font-bold shadow-lg opacity-90`}
                >
                  {rawActiveItemNo || activePanelData.panelId}
                  <span className="ml-1 text-[10px] opacity-80">
                    {effectiveWidth(activePanelData)}x{effectiveLength(activePanelData)}
                  </span>
                </div>
              );
            })()}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
