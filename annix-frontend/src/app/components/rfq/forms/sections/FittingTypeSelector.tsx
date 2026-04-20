"use client";

import { keys } from "es-toolkit/compat";
import { Select } from "@/app/components/ui/Select";
import { masterDataApi } from "@/app/lib/api/client";
import { log } from "@/app/lib/logger";
import type { GlobalSpecs } from "@/app/lib/types/rfqTypes";

interface FittingTypeSelectorProps {
  entry: any;
  specs: any;
  index: number;
  globalSpecs: GlobalSpecs;
  ansiFittingTypes: any[];
  forgedFittingTypes: any[];
  malleableFittingTypes: string[];
  onUpdateEntry: (id: string, updates: any) => void;
  generateItemDescription: (entry: any) => string;
  debouncedCalculate: () => void;
  errors: Record<string, string>;
}

export function FittingTypeSelector(props: FittingTypeSelectorProps) {
  const {
    entry,
    specs,
    index,
    globalSpecs,
    ansiFittingTypes,
    forgedFittingTypes,
    malleableFittingTypes,
    onUpdateEntry,
    generateItemDescription,
    debouncedCalculate,
    errors,
  } = props;

  const selectId = `fitting-type-${entry.id}`;
  const rawSteelSpecificationId = specs.steelSpecificationId;
  const isSABS719 = (rawSteelSpecificationId || globalSpecs?.steelSpecificationId) === 8;
  const rawFittingStandard = specs.fittingStandard;
  const effectiveStandard = rawFittingStandard || (isSABS719 ? "SABS719" : "SABS62");
  const sabs62Options = [
    { value: "EQUAL_TEE", label: "Equal Tee" },
    { value: "UNEQUAL_TEE", label: "Unequal Tee" },
    { value: "LATERAL", label: "Lateral" },
    { value: "SWEEP_TEE", label: "Sweep Tee" },
    { value: "Y_PIECE", label: "Y-Piece" },
    { value: "GUSSETTED_TEE", label: "Gussetted Tee" },
    { value: "EQUAL_CROSS", label: "Equal Cross" },
    { value: "UNEQUAL_CROSS", label: "Unequal Cross" },
  ];
  const sabs719Options = [
    { value: "SHORT_TEE", label: "Short Tee (Equal)" },
    { value: "UNEQUAL_SHORT_TEE", label: "Short Tee (Unequal/Reducing)" },
    { value: "GUSSET_TEE", label: "Gusset Tee (Equal)" },
    { value: "UNEQUAL_GUSSET_TEE", label: "Gusset Tee (Unequal/Reducing)" },
    { value: "LATERAL", label: "Lateral" },
  ];
  const commonOptions = [
    { value: "CON_REDUCER", label: "Concentric Reducer" },
    { value: "ECCENTRIC_REDUCER", label: "Eccentric Reducer" },
    { value: "OFFSET_BEND", label: "Offset Bend" },
  ];
  const ansiOptions = ansiFittingTypes.map((t) => ({
    value: t.code,
    label: t.name,
  }));
  const forgedOptions = forgedFittingTypes.map((t) => ({
    value: t.code,
    label: t.name,
  }));
  const malleableOptions = malleableFittingTypes.map((t) => ({
    value: t,
    label: t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
  const optionsByStandard: Record<string, { value: string; label: string }[]> = {
    SABS62: [...sabs62Options, ...commonOptions],
    SABS719: [...sabs719Options, ...commonOptions],
    ASME_B16_9: ansiOptions,
    ASME_B16_11: forgedOptions,
    BS_143: malleableOptions,
  };
  const rawEffectiveStandard = optionsByStandard[effectiveStandard];
  const options = rawEffectiveStandard || [...sabs62Options, ...commonOptions];

  const rawFittingType = specs.fittingType;
  const errorKey = `fitting_${index}_type`;
  const errorMsg = errors[errorKey];

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Fitting Type *
      </label>
      <Select
        id={selectId}
        value={rawFittingType || ""}
        onChange={(fittingType) => {
          if (!fittingType) return;

          const isReducingTee = ["SHORT_REDUCING_TEE", "GUSSET_REDUCING_TEE"].includes(fittingType);
          const isEqualTee = ["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(fittingType);
          const isUnequalTee = ["UNEQUAL_SHORT_TEE", "UNEQUAL_GUSSET_TEE"].includes(fittingType);
          const isNewReducer = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(fittingType);
          const rawFittingType2 = specs.fittingType;
          const wasReducer = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(rawFittingType2 || "");
          const isNewOffsetBend = fittingType === "OFFSET_BEND";
          const wasOffsetBend = specs.fittingType === "OFFSET_BEND";
          const isNewTwoEndType = isNewReducer || isNewOffsetBend;
          const wasTwoEndType = wasReducer || wasOffsetBend;

          const currentEndConfig = specs.pipeEndConfiguration;
          const validTwoEndConfigs = [
            "PE",
            "FOE",
            "FBE",
            "2X_RF",
            "2X_LF",
            "FOE_RF",
            "FOE_LF",
            "RF_LF",
          ];
          const validFittingConfigs = [
            "PE",
            "FAE",
            "F2E",
            "F2E_LF",
            "F2E_RF",
            "3X_RF",
            "3X_LF",
            "2X_LF_FOE",
            "2X_RF_FOE",
          ];
          const needsEndConfigReset = isNewTwoEndType
            ? !validTwoEndConfigs.includes(currentEndConfig || "")
            : wasTwoEndType && !validFittingConfigs.includes(currentEndConfig || "");

          const updatedEntry = {
            ...entry,
            specs: {
              ...entry.specs,
              fittingType,
              pipeEndConfiguration: needsEndConfigReset ? "PE" : currentEndConfig,
              branchNominalDiameterMm: isReducingTee ? specs.branchNominalDiameterMm : undefined,
              teeNominalDiameterMm: isUnequalTee ? specs.teeNominalDiameterMm : undefined,
              teeSteelSpecificationId: isUnequalTee ? specs.teeSteelSpecificationId : undefined,
              stubLocation: isEqualTee ? undefined : specs.stubLocation,
              pipeLengthAOverride: isEqualTee ? false : specs.pipeLengthAOverride,
              pipeLengthBOverride: isEqualTee ? false : specs.pipeLengthBOverride,
            },
          };
          updatedEntry.description = generateItemDescription(updatedEntry);
          onUpdateEntry(entry.id, updatedEntry);

          if (fittingType && specs.nominalDiameterMm) {
            masterDataApi
              .getFittingDimensions(
                effectiveStandard as "SABS62" | "SABS719",
                fittingType,
                entry.specs.nominalDiameterMm,
                specs.angleRange,
              )
              .then((dims) => {
                if (dims) {
                  const pipeUpdates: Record<string, unknown> = {};
                  let pipeLengthA: number | null = null;
                  let pipeLengthB: number | null = null;

                  if (effectiveStandard === "SABS62") {
                    const centreToFace = dims.centreToFaceCMm ? Number(dims.centreToFaceCMm) : null;
                    if (isEqualTee && centreToFace) {
                      pipeLengthA = centreToFace * 2;
                      pipeLengthB = centreToFace;
                    } else if (centreToFace) {
                      pipeLengthA = centreToFace;
                      pipeLengthB = centreToFace;
                    }
                  } else {
                    const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                    const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
                    pipeLengthA = dimA;
                    pipeLengthB = dimB;
                  }

                  if (pipeLengthA && (isEqualTee || !specs.pipeLengthAOverride)) {
                    pipeUpdates.pipeLengthAMm = pipeLengthA;
                    pipeUpdates.pipeLengthAMmAuto = pipeLengthA;
                  }
                  if (pipeLengthB && (isEqualTee || !specs.pipeLengthBOverride)) {
                    pipeUpdates.pipeLengthBMm = pipeLengthB;
                    pipeUpdates.pipeLengthBMmAuto = pipeLengthB;
                  }
                  if (keys(pipeUpdates).length > 0) {
                    onUpdateEntry(entry.id, { specs: pipeUpdates });
                  }
                }
              })
              .catch((err) => {
                log.debug("Could not fetch fitting dimensions:", err);
              });
          }

          debouncedCalculate();
        }}
        options={options}
        placeholder="Select fitting type..."
      />
      {errorMsg && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
