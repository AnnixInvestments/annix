"use client";

import { toPairs as entries } from "es-toolkit/compat";
import { Select } from "@/app/components/ui/Select";
import {
  sabs719CenterToFaceBySegments as getSABS719CenterToFaceBySegments,
  isNominalBoreValidForSpec,
  STEEL_SPEC_NB_FALLBACK,
  scheduleListForSpec,
} from "@/app/lib/config/rfq";
import { calculateMinWallThickness } from "@/app/lib/utils/pipeCalculations";
import {
  SABS62_BEND_RADIUS,
  SABS62BendType,
  sabs62CFInterpolated,
} from "@/app/lib/utils/sabs62CfData";
import type { SteelSpecItem } from "../shared";

interface BendNominalBoreSelectProps {
  entryId: string;
  entry: any;
  specs: any;
  index: number;
  globalSpecs: any;
  masterData: any;
  effectiveSteelSpecId: number | null;
  steelSpecName: string;
  isSegmentedStyle: boolean;
  nbToOdMap: Record<number, number>;
  bendRules: { minNominalBoreMm: number; maxNominalBoreMm: number; category: string } | null;
  errors: Record<string, string>;
  generateItemDescription: (entry: any) => string;
  onUpdateEntry: (id: string, updates: any) => void;
  debouncedCalculate: () => void;
  setLastFetchedParams: (v: string | null) => void;
  setPipeALengthSource: (v: "auto" | "override" | null) => void;
}

export function BendNominalBoreSelect(props: BendNominalBoreSelectProps) {
  const selectId = `bend-nb-${props.entryId}`;

  const nbOptions = (() => {
    const steelSpec = props.masterData.steelSpecs?.find(
      (s: SteelSpecItem) => s.id === props.effectiveSteelSpecId,
    );
    const rawSpecName = steelSpec?.steelSpecName;
    const specName = rawSpecName || "";
    const isSweepTeeItem = props.specs.bendItemType === "SWEEP_TEE";

    if (isSweepTeeItem) {
      const sweepTeeNBs = [
        200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,
      ];
      return sweepTeeNBs.map((nb: number) => ({
        value: String(nb),
        label: `${nb} NB`,
      }));
    }

    const fallbackNBs = entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) =>
      specName.includes(pattern),
    )?.[1];
    const nbs = fallbackNBs || [
      40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
    ];
    return nbs.map((nb: number) => ({
      value: String(nb),
      label: `${nb} NB`,
    }));
  })();

  const selectedNB = props.specs.nominalBoreMm;
  const nbValid = selectedNB ? isNominalBoreValidForSpec(props.steelSpecName, selectedNB) : true;

  const nbValue = props.specs.nominalBoreMm ? String(props.entry.specs.nominalBoreMm) : "";

  return (
    <>
      <Select
        id={selectId}
        value={nbValue}
        onChange={(value) => {
          const nominalBore = parseInt(value, 10);
          if (!nominalBore) return;

          const rawPressure = props.globalSpecs?.workingPressureBar;
          const pressure = rawPressure || 0;
          const rawSpecId = props.entry?.specs?.steelSpecificationId;
          const nbEffectiveSpecId = rawSpecId || props.globalSpecs?.steelSpecificationId;
          const schedules = scheduleListForSpec(
            nominalBore,
            nbEffectiveSpecId,
            props.steelSpecName,
          );

          let matchedSchedule: string | null = null;
          let matchedWT = 0;

          if (pressure > 0 && schedules.length > 0) {
            const rawOd = props.nbToOdMap[nominalBore];
            const od = rawOd || nominalBore * 1.05;
            const rawTemp = props.globalSpecs?.workingTemperatureC;
            const temperature = rawTemp || 20;
            const minWT = calculateMinWallThickness(
              od,
              pressure,
              "ASTM_A106_Grade_B",
              temperature,
              1.0,
              0,
              1.2,
            );

            const eligibleSchedules = schedules
              .filter((s) => s.wallThicknessMm >= minWT)
              .sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);

            if (eligibleSchedules.length > 0) {
              matchedSchedule = eligibleSchedules[0].scheduleDesignation;
              matchedWT = eligibleSchedules[0].wallThicknessMm;
            } else {
              const sorted = [...schedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
              matchedSchedule = sorted[0].scheduleDesignation;
              matchedWT = sorted[0].wallThicknessMm;
            }
          } else if (schedules.length > 0) {
            const sch40 = schedules.find(
              (s) => s.scheduleDesignation === "40" || s.scheduleDesignation === "Sch 40",
            );
            if (sch40) {
              matchedSchedule = sch40.scheduleDesignation;
              matchedWT = sch40.wallThicknessMm;
            } else {
              matchedSchedule = schedules[0].scheduleDesignation;
              matchedWT = schedules[0].wallThicknessMm;
            }
          }

          let newCenterToFace: number | undefined;
          let newBendRadius: number | undefined;

          if (
            props.isSegmentedStyle &&
            props.specs.bendRadiusType &&
            props.specs.numberOfSegments
          ) {
            const cfResult = getSABS719CenterToFaceBySegments(
              props.entry.specs.bendRadiusType,
              nominalBore,
              props.entry.specs.numberOfSegments,
            );
            if (cfResult) {
              newCenterToFace = cfResult.centerToFace;
              newBendRadius = cfResult.radius;
            }
          }

          if (!props.isSegmentedStyle && props.specs.bendType && props.specs.bendDegrees) {
            const bendType = props.entry.specs.bendType as SABS62BendType;
            newCenterToFace = sabs62CFInterpolated(
              bendType,
              props.entry.specs.bendDegrees,
              nominalBore,
            );
            const radiusLookup = SABS62_BEND_RADIUS[bendType];
            const radiusValue = radiusLookup ? radiusLookup[nominalBore] : undefined;
            newBendRadius = radiusValue;
          }

          const isSweepTee = props.specs.bendItemType === "SWEEP_TEE";
          const updatedEntry: any = {
            ...props.entry,
            specs: {
              ...props.entry.specs,
              nominalBoreMm: nominalBore,
              scheduleNumber: matchedSchedule,
              wallThicknessMm: matchedWT,
              centerToFaceMm: newCenterToFace,
              bendRadiusMm: newBendRadius,
              sweepTeePipeALengthMm: isSweepTee ? undefined : props.specs.sweepTeePipeALengthMm,
            },
          };
          if (isSweepTee) {
            props.setLastFetchedParams(null);
            props.setPipeALengthSource(null);
          }
          updatedEntry.description = props.generateItemDescription(updatedEntry);
          props.onUpdateEntry(props.entryId, updatedEntry);

          const hasBendSpecs = props.isSegmentedStyle
            ? props.specs.bendRadiusType && props.specs.bendDegrees
            : props.specs.bendType && props.specs.bendDegrees;
          if (matchedSchedule && hasBendSpecs) {
            props.debouncedCalculate();
          }
        }}
        options={nbOptions}
        placeholder="Select NB"
        disabled={false}
      />
      {selectedNB && !nbValid && props.bendRules && (
        <p className="text-xs text-orange-600 mt-0.5">
          {selectedNB} NB outside typical range ({props.bendRules.minNominalBoreMm}-
          {props.bendRules.maxNominalBoreMm} NB) for {props.bendRules.category.replace("_", " ")}
        </p>
      )}
      {props.errors[`bend_${props.index}_nb`] && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {props.errors[`bend_${props.index}_nb`]}
        </p>
      )}
    </>
  );
}
