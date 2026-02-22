"use client";

import React, { memo, useCallback, useMemo } from "react";
import { Select } from "@/app/components/ui/Select";
import { STEEL_SPEC_NB_FALLBACK } from "@/app/lib/config/rfq";

interface SelectOptionGroup {
  label: string;
  options: { value: string; label: string }[];
}

interface SpigotConfigurationSectionProps {
  entryId: string;
  spigotSteelSpecificationId: number | undefined;
  numberOfSpigots: number;
  spigotNominalBoreMm: number | null;
  spigotDistanceFromEndMm: number | null;
  spigotHeightMm: number | null;
  mainPipeSteelSpecificationId: number | undefined;
  mainPipeNominalBoreMm: number | undefined;
  globalSteelSpecificationId: number | undefined;
  steelSpecs: any[];
  nominalBores: number[];
  groupedSteelOptions: SelectOptionGroup[];
  onSpigotSteelSpecChange: (specId: number | undefined) => void;
  onNumberOfSpigots: (count: number) => void;
  onSpigotNominalBoreChange: (nb: number | null) => void;
  onSpigotDistanceChange: (distance: number | null) => void;
  onSpigotHeightChange: (height: number | null) => void;
}

function SpigotConfigurationSectionComponent({
  entryId,
  spigotSteelSpecificationId,
  numberOfSpigots,
  spigotNominalBoreMm,
  spigotDistanceFromEndMm,
  spigotHeightMm,
  mainPipeSteelSpecificationId,
  mainPipeNominalBoreMm,
  globalSteelSpecificationId,
  steelSpecs,
  nominalBores,
  groupedSteelOptions,
  onSpigotSteelSpecChange,
  onNumberOfSpigots,
  onSpigotNominalBoreChange,
  onSpigotDistanceChange,
  onSpigotHeightChange,
}: SpigotConfigurationSectionProps) {
  const mainPipeSpecId = mainPipeSteelSpecificationId || globalSteelSpecificationId;
  const effectiveSpigotSpecId = spigotSteelSpecificationId || mainPipeSpecId;
  const isFromMainPipe = !spigotSteelSpecificationId;
  const isOverride = spigotSteelSpecificationId && spigotSteelSpecificationId !== mainPipeSpecId;

  const spigotSpecName = useMemo(() => {
    return steelSpecs?.find((s: any) => s.id === effectiveSpigotSpecId)?.steelSpecName || "";
  }, [steelSpecs, effectiveSpigotSpecId]);

  const filteredNBOptions = useMemo(() => {
    const matchingPrefix = Object.keys(STEEL_SPEC_NB_FALLBACK).find((prefix) =>
      spigotSpecName.toUpperCase().includes(prefix.toUpperCase()),
    );
    const validNBsForSpec = matchingPrefix ? STEEL_SPEC_NB_FALLBACK[matchingPrefix] : nominalBores;
    const filteredNBs = validNBsForSpec.filter(
      (nb: number) => !mainPipeNominalBoreMm || nb <= mainPipeNominalBoreMm,
    );
    return [
      { value: "", label: "Select NB..." },
      ...filteredNBs.map((nb: number) => ({ value: String(nb), label: `${nb} NB` })),
    ];
  }, [spigotSpecName, nominalBores, mainPipeNominalBoreMm]);

  const handleSteelSpecChange = useCallback(
    (value: string) => {
      const specId = value ? Number(value) : undefined;
      onSpigotSteelSpecChange(specId);
      setTimeout(() => {
        const noSpigotSelectId = `spigot-count-${entryId}`;
        const noSpigotElement = document.getElementById(noSpigotSelectId);
        if (noSpigotElement) {
          noSpigotElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
    },
    [entryId, onSpigotSteelSpecChange],
  );

  const handleNumberOfSpigots = useCallback(
    (value: string) => {
      onNumberOfSpigots(parseInt(value, 10));
      setTimeout(() => {
        const spigotNbSelectId = `spigot-nb-${entryId}`;
        const spigotNbElement = document.getElementById(spigotNbSelectId);
        if (spigotNbElement) {
          spigotNbElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
    },
    [entryId, onNumberOfSpigots],
  );

  const handleNominalBoreChange = useCallback(
    (value: string) => {
      onSpigotNominalBoreChange(parseInt(value, 10) || null);
      setTimeout(() => {
        const distanceInputId = `spigot-distance-${entryId}`;
        const distanceElement = document.getElementById(distanceInputId);
        if (distanceElement) {
          distanceElement.scrollIntoView({ behavior: "smooth", block: "center" });
          distanceElement.focus();
        }
      }, 150);
    },
    [entryId, onSpigotNominalBoreChange],
  );

  const handleDistanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSpigotDistanceChange(parseInt(e.target.value, 10) || null);
    },
    [onSpigotDistanceChange],
  );

  const handleDistanceKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const heightInputId = `spigot-height-${entryId}`;
        const heightElement = document.getElementById(heightInputId);
        if (heightElement) {
          heightElement.scrollIntoView({ behavior: "smooth", block: "center" });
          heightElement.focus();
        }
      }
    },
    [entryId],
  );

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSpigotHeightChange(parseInt(e.target.value, 10) || null);
    },
    [onSpigotHeightChange],
  );

  const handleHeightKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const pipeLengthInput = document.getElementById(
          `pipe-length-${entryId}`,
        ) as HTMLInputElement;
        if (pipeLengthInput) {
          pipeLengthInput.scrollIntoView({ behavior: "smooth", block: "center" });
          pipeLengthInput.focus();
          pipeLengthInput.select();
        }
      }
    },
    [entryId],
  );

  const steelSpecClassName = isFromMainPipe
    ? "w-full px-2 py-1.5 border-2 border-green-500 rounded text-xs"
    : isOverride
      ? "w-full px-2 py-1.5 border-2 border-yellow-500 rounded text-xs"
      : "w-full px-2 py-1.5 border border-gray-300 rounded text-xs";

  return (
    <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-lg p-2 mt-2">
      <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-100 mb-1">
        Spigot Configuration
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
        {/* Spigot Steel Specification */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Steel Spec
            {isFromMainPipe && (
              <span className="text-green-600 text-xs ml-1 font-normal">(Main)</span>
            )}
            {isOverride && (
              <span className="text-yellow-600 text-xs ml-1 font-normal">(Override)</span>
            )}
          </label>
          <Select
            id={`spigot-steel-spec-${entryId}`}
            value={String(effectiveSpigotSpecId || "")}
            className={steelSpecClassName}
            onChange={handleSteelSpecChange}
            options={[]}
            groupedOptions={groupedSteelOptions}
            placeholder="Select steel spec..."
          />
        </div>

        {/* Number of Spigots */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
            No. of Spigots
          </label>
          <Select
            id={`spigot-count-${entryId}`}
            value={String(numberOfSpigots || 2)}
            onChange={handleNumberOfSpigots}
            options={[
              { value: "2", label: "2" },
              { value: "3", label: "3" },
              { value: "4", label: "4" },
            ]}
            className="w-full px-2 py-1.5 border border-teal-300 rounded text-xs"
          />
        </div>

        {/* NB of Spigot */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Spigot NB (mm)
          </label>
          <Select
            id={`spigot-nb-${entryId}`}
            value={String(spigotNominalBoreMm || "")}
            onChange={handleNominalBoreChange}
            options={filteredNBOptions}
            className="w-full px-2 py-1.5 border border-teal-300 rounded text-xs"
          />
        </div>

        {/* Distance from Pipe End */}
        <div>
          <label
            htmlFor={`spigot-distance-${entryId}`}
            className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1"
          >
            Distance from End (mm)
          </label>
          <input
            id={`spigot-distance-${entryId}`}
            type="number"
            value={spigotDistanceFromEndMm || ""}
            onChange={handleDistanceChange}
            onKeyDown={handleDistanceKeyDown}
            className="w-full px-2 py-1.5 border border-teal-300 dark:border-teal-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            placeholder="e.g. 1000"
            min="0"
          />
        </div>

        {/* Spigot Height */}
        <div>
          <label
            htmlFor={`spigot-height-${entryId}`}
            className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1"
          >
            Spigot Height (mm)
          </label>
          <input
            id={`spigot-height-${entryId}`}
            type="number"
            value={spigotHeightMm || ""}
            onChange={handleHeightChange}
            onKeyDown={handleHeightKeyDown}
            className="w-full px-2 py-1.5 border border-teal-300 dark:border-teal-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            placeholder="e.g. 150"
            min="50"
          />
        </div>
      </div>
    </div>
  );
}

export const SpigotConfigurationSection = memo(SpigotConfigurationSectionComponent);
