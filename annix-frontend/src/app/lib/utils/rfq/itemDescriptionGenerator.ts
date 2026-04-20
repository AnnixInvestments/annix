interface MasterData {
  steelSpecs: Array<{ id: number; steelSpecName: string }>;
  flangeStandards?: Array<{ id: number; code: string }>;
  pressureClasses?: Array<{ id: number; designation: string }>;
}

interface GlobalSpecs {
  steelSpecificationId?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;
  workingPressureBar?: number;
}

function formatBendType(bendTypeRaw: string): string {
  if (bendTypeRaw === "elbow") return "Short Radius";
  if (bendTypeRaw === "medium") return "Medium Radius";
  if (bendTypeRaw === "long") return "Long Radius";
  if (bendTypeRaw === "1.5D") return "1.5D (Short Radius)";
  if (bendTypeRaw === "3D") return "3D (Long Radius)";
  if (bendTypeRaw === "5D") return "5D (Extra Long Radius)";
  return bendTypeRaw;
}

function titleCaseWords(input: string): string {
  return input
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function resolveFlangeSpecs(
  entry: any,
  globalSpecs: GlobalSpecs,
  masterData: MasterData,
): { flangeStandard: string; pressureClass: string } {
  const rawFlangeStandardId = entry.specs?.flangeStandardId;
  const flangeStandardId = rawFlangeStandardId || globalSpecs?.flangeStandardId;
  const rawFlangePressureClassId = entry.specs?.flangePressureClassId;
  const flangePressureClassId = rawFlangePressureClassId || globalSpecs?.flangePressureClassId;
  const flangeStandard = flangeStandardId
    ? masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId)?.code
    : "";
  const pressureClass = flangePressureClassId
    ? masterData.pressureClasses?.find((p: any) => p.id === flangePressureClassId)?.designation
    : "";
  return { flangeStandard: flangeStandard || "", pressureClass: pressureClass || "" };
}

function resolveSteelSpec(steelSpecId: number | null, masterData: MasterData): string | undefined {
  if (!steelSpecId) return undefined;
  return masterData.steelSpecs.find((s: any) => s.id === steelSpecId)?.steelSpecName;
}

function bendEndConfigLabel(bendEndConfig: string): string {
  if (bendEndConfig === "FBE") return "FBE";
  if (bendEndConfig === "FOE") return "FOE";
  if (bendEndConfig === "FOE_LF") return "FOE+L/F";
  if (bendEndConfig === "FOE_RF") return "FOE+R/F";
  if (bendEndConfig === "2xLF") return "2xL/F";
  if (bendEndConfig === "2X_RF") return "2xR/F";
  return bendEndConfig;
}

function bendEndMainConfigLabel(bendEndConfig: string): string {
  if (bendEndConfig === "FBE") return "F2E";
  if (bendEndConfig === "FOE") return "FOE";
  if (bendEndConfig === "FOE_LF") return "FOE+L/F";
  if (bendEndConfig === "FOE_RF") return "FOE+R/F";
  if (bendEndConfig === "2xLF") return "2xL/F";
  if (bendEndConfig === "2X_RF") return "2xR/F";
  return bendEndConfig;
}

function describeBend(entry: any, globalSpecs: GlobalSpecs, masterData: MasterData): string {
  const rawNominalBoreMm = entry.specs?.nominalBoreMm;
  const nb = rawNominalBoreMm || "XX";
  const rawScheduleNumber = entry.specs?.scheduleNumber;
  let schedule = rawScheduleNumber || "XX";
  if (schedule.toString().toLowerCase().startsWith("sch")) {
    schedule = schedule.substring(3);
  }
  const rawBendRadiusType = entry.specs?.bendRadiusType;
  const rawBendType = entry.specs?.bendType;
  const bendTypeRaw = rawBendRadiusType || rawBendType || "X.XD";
  const rawBendDegrees = entry.specs?.bendDegrees;
  const bendAngle = rawBendDegrees || "XX";
  const centerToFace = entry.specs?.centerToFaceMm;
  const rawBendEndConfiguration = entry.specs?.bendEndConfiguration;
  const bendEndConfig = rawBendEndConfiguration || "PE";

  const bendType = formatBendType(bendTypeRaw);

  const rawSteelSpecificationId = entry.specs?.steelSpecificationId;
  const steelSpecId = rawSteelSpecificationId || globalSpecs?.steelSpecificationId;
  const steelSpec = resolveSteelSpec(steelSpecId, masterData);

  const isSABS719Bend = steelSpecId === 8;
  const rawWallThicknessMm = entry.specs?.wallThicknessMm;
  const rawCalcWallThickness = entry.calculation?.wallThicknessMm;
  const wallThicknessBend = isSABS719Bend
    ? rawWallThicknessMm || entry.calculation?.wallThicknessMm
    : rawCalcWallThickness || entry.specs?.wallThicknessMm;

  const { flangeStandard, pressureClass } = resolveFlangeSpecs(entry, globalSpecs, masterData);

  let description = `${nb}NB`;

  if (isSABS719Bend) {
    if (wallThicknessBend) {
      description += ` W/T ${wallThicknessBend}mm`;
    }
    if (steelSpec) {
      description += ` ${steelSpec}`;
    }
  } else {
    description += ` Sch ${schedule}`;
    if (wallThicknessBend) {
      description += ` (${wallThicknessBend}mm)`;
    }
    if (steelSpec) {
      description += ` ${steelSpec}`;
    }
  }

  const rawNumberOfSegments = entry.specs?.numberOfSegments;
  const numSegments = rawNumberOfSegments || 0;
  if (numSegments > 1) {
    description += ` ${bendAngle}° ${bendType} ${numSegments} Seg Bend`;
  } else {
    description += ` ${bendAngle}° ${bendType} Bend`;
  }

  const rawTangentLengths = entry.specs?.tangentLengths;
  const tangentLengths = rawTangentLengths || [];
  const rawItem0 = tangentLengths[0];
  const tangent1 = rawItem0 || 0;
  const rawItem1 = tangentLengths[1];
  const tangent2 = rawItem1 || 0;
  const rawNumberOfTangents = entry.specs?.numberOfTangents;
  const numTangents = rawNumberOfTangents || 0;

  if (centerToFace) {
    const cf = Number(centerToFace);
    if (numTangents > 0 && (tangent1 > 0 || tangent2 > 0)) {
      const end1 = cf + tangent1;
      const end2 = cf + tangent2;
      if (numTangents === 2 && tangent1 > 0 && tangent2 > 0) {
        description += ` ${end1.toFixed(0)}x${end2.toFixed(0)} C/F`;
      } else if (tangent1 > 0) {
        description += ` ${end1.toFixed(0)}x${cf.toFixed(0)} C/F`;
      } else if (tangent2 > 0) {
        description += ` ${cf.toFixed(0)}x${end2.toFixed(0)} C/F`;
      } else {
        description += ` C/F ${cf.toFixed(0)}mm`;
      }
    } else {
      description += ` C/F ${cf.toFixed(0)}mm`;
    }
  }

  const rawNumberOfStubs = entry.specs?.numberOfStubs;
  const numStubs = rawNumberOfStubs || 0;
  const rawStubs = entry.specs?.stubs;
  const stubs = rawStubs || [];
  const stub1NB = stubs[0]?.nominalBoreMm;
  const stub1Length = stubs[0]?.length;
  const stub2NB = stubs[1]?.nominalBoreMm;
  const stub2Length = stubs[1]?.length;
  const rawHasFlangeOverride = stubs[0]?.hasFlangeOverride;
  const stub1HasFlange =
    rawHasFlangeOverride || (stubs[0]?.flangeStandardId && stubs[0]?.flangePressureClassId);
  const rawHasFlangeOverride2 = stubs[1]?.hasFlangeOverride;
  const stub2HasFlange =
    rawHasFlangeOverride2 || (stubs[1]?.flangeStandardId && stubs[1]?.flangePressureClassId);

  if (numStubs > 0) {
    if (numStubs === 1 && stub1NB && stub1Length) {
      description += ` + ${stub1NB}NB x ${stub1Length}mm Stub`;
    } else if (numStubs === 2 && stub1NB && stub1Length && stub2NB && stub2Length) {
      if (stub1NB === stub2NB && stub1Length === stub2Length) {
        description += ` + 2x${stub1NB}NB x ${stub1Length}mm Stubs`;
      } else {
        description += ` + ${stub1NB}NB x ${stub1Length}mm Stub + ${stub2NB}NB x ${stub2Length}mm Stub`;
      }
    }
  }

  if (bendEndConfig && bendEndConfig !== "PE") {
    let configLabel = bendEndConfigLabel(bendEndConfig);

    if (numStubs > 0 && (stub1HasFlange || stub2HasFlange)) {
      const rawFlangeType = stubs[0]?.flangeType;
      const stub1FlangeType = rawFlangeType || "S/O";
      const rawFlangeType2 = stubs[1]?.flangeType;
      const stub2FlangeType = rawFlangeType2 || "S/O";

      const stubFlangeLabels: string[] = [];
      if (stub1HasFlange && stubs[0]?.nominalBoreMm) {
        stubFlangeLabels.push(stub1FlangeType);
      }
      if (stub2HasFlange && stubs[1]?.nominalBoreMm) {
        stubFlangeLabels.push(stub2FlangeType);
      }

      if (stubFlangeLabels.length > 0) {
        const mainConfig = bendEndMainConfigLabel(bendEndConfig);
        configLabel = `${mainConfig}+${stubFlangeLabels.join("+")}`;
      }
    } else if (numStubs > 0) {
      configLabel = bendEndConfig === "FBE" ? "F2E+OE" : configLabel;
    }

    description += ` ${configLabel}`;
    if (flangeStandard && pressureClass) {
      description += ` ${flangeStandard} ${pressureClass}`;
    }
  }

  return description;
}

function describeFitting(entry: any, globalSpecs: GlobalSpecs, masterData: MasterData): string {
  const rawNominalDiameterMm = entry.specs?.nominalDiameterMm;
  const rawNominalBoreMm = entry.specs?.nominalBoreMm;
  const fittingNb = rawNominalDiameterMm || rawNominalBoreMm || "XX";
  const rawFittingType = entry.specs?.fittingType;
  const fittingTypeRaw = rawFittingType || "Fitting";
  const rawFittingStandard = entry.specs?.fittingStandard;
  const fittingStandard = rawFittingStandard || "";
  const rawScheduleNumber = entry.specs?.scheduleNumber;
  const fittingSchedule = rawScheduleNumber || "";
  const fittingWallThickness = entry.specs?.wallThicknessMm;
  const rawPipeEndConfiguration = entry.specs?.pipeEndConfiguration;
  const fittingEndConfig = rawPipeEndConfiguration || "PE";
  const pipeLengthA = entry.specs?.pipeLengthAMm;
  const pipeLengthB = entry.specs?.pipeLengthBMm;

  const rawSteelSpecificationId = entry.specs?.steelSpecificationId;
  const fittingSteelSpecId = rawSteelSpecificationId || globalSpecs?.steelSpecificationId;
  const fittingSteelSpec = resolveSteelSpec(fittingSteelSpecId, masterData);

  let fittingType = titleCaseWords(fittingTypeRaw);

  const isEqualTeeType = ["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(fittingTypeRaw);
  if (isEqualTeeType && !fittingType.includes("Equal")) {
    fittingType = fittingType.replace(/\bTee\b/i, "Equal Tee");
  }

  let fittingDesc = `${fittingNb}NB ${fittingType}`;

  const isSABS719Fitting = fittingSteelSpecId === 8;

  if (isSABS719Fitting) {
    if (fittingWallThickness) {
      fittingDesc += ` W/T ${fittingWallThickness}mm`;
    }
    if (fittingSteelSpec) {
      fittingDesc += ` ${fittingSteelSpec}`;
    } else if (fittingStandard) {
      fittingDesc += ` ${fittingStandard}`;
    }
  } else {
    if (fittingSchedule) {
      const cleanSchedule = fittingSchedule.replace("Sch", "").replace("sch", "");
      fittingDesc += ` Sch${cleanSchedule}`;
      if (fittingWallThickness) {
        fittingDesc += ` (${fittingWallThickness}mm)`;
      }
    }
    if (fittingStandard) {
      fittingDesc += ` ${fittingStandard}`;
    } else if (fittingSteelSpec) {
      fittingDesc += ` ${fittingSteelSpec}`;
    }
  }

  if (pipeLengthA || pipeLengthB) {
    const lenA = pipeLengthA ? Math.round(pipeLengthA) : 0;
    const lenB = pipeLengthB ? Math.round(pipeLengthB) : 0;
    if (lenA > 0 && lenB > 0) {
      fittingDesc += ` (${lenA}x${lenB})`;
    } else if (lenA > 0) {
      fittingDesc += ` (${lenA}mm)`;
    } else if (lenB > 0) {
      fittingDesc += ` (${lenB}mm)`;
    }
  }

  if (fittingEndConfig && fittingEndConfig !== "PE") {
    const configLabel =
      fittingEndConfig === "F2E"
        ? "F2E"
        : fittingEndConfig === "F2E_LF"
          ? "F2E+L/F"
          : fittingEndConfig === "F2E_RF"
            ? "F2E+R/F"
            : fittingEndConfig === "3X_RF"
              ? "3xR/F"
              : fittingEndConfig === "2X_RF_FOE"
                ? "2xR/F+FOE"
                : fittingEndConfig;
    fittingDesc += ` ${configLabel}`;

    const { flangeStandard, pressureClass } = resolveFlangeSpecs(entry, globalSpecs, masterData);

    if (flangeStandard && pressureClass) {
      fittingDesc += ` ${flangeStandard} ${pressureClass}`;
    }
  }

  return fittingDesc;
}

function describeValve(entry: any): string {
  const rawValveType = entry.specs?.valveType;
  const valveType = rawValveType || "Valve";
  const rawSize = entry.specs?.size;
  const rawNominalBoreMmValve = entry.specs?.nominalBoreMm;
  const valveSize = rawSize || rawNominalBoreMmValve || "";
  const rawPressureClass = entry.specs?.pressureClass;
  const pressureClass = rawPressureClass || "";
  const rawBodyMaterial = entry.specs?.bodyMaterial;
  const bodyMaterial = rawBodyMaterial || "";
  const rawActuatorType = entry.specs?.actuatorType;
  const actuatorType = rawActuatorType || "";

  let valveDesc = valveSize ? `${valveSize}NB ` : "";
  valveDesc += titleCaseWords(valveType);

  if (pressureClass) {
    valveDesc += ` ${pressureClass}`;
  }
  if (bodyMaterial) {
    valveDesc += ` ${bodyMaterial}`;
  }
  if (actuatorType && actuatorType !== "manual" && actuatorType !== "none") {
    valveDesc += ` ${actuatorType.charAt(0).toUpperCase() + actuatorType.slice(1)} Actuated`;
  }

  return valveDesc;
}

function describeInstrument(entry: any): string {
  const rawInstrumentType = entry.specs?.instrumentType;
  const instrumentType = rawInstrumentType || "Instrument";
  const rawCategory = entry.specs?.category;
  const instrumentCategory = rawCategory || "";
  const rawSize = entry.specs?.size;
  const rawNominalBoreMmInstrument = entry.specs?.nominalBoreMm;
  const size = rawSize || rawNominalBoreMmInstrument || "";
  const rawOutputSignal = entry.specs?.outputSignal;
  const outputSignal = rawOutputSignal || "";
  const rawProcessConnection = entry.specs?.processConnection;
  const processConnection = rawProcessConnection || "";

  let instrumentDesc = "";
  if (instrumentCategory) {
    instrumentDesc += `${instrumentCategory.charAt(0).toUpperCase() + instrumentCategory.slice(1).toLowerCase()} `;
  }
  instrumentDesc += titleCaseWords(instrumentType);

  if (size) {
    instrumentDesc += ` ${size}NB`;
  }
  if (processConnection) {
    instrumentDesc += ` ${processConnection}`;
  }
  if (outputSignal) {
    instrumentDesc += ` ${outputSignal}`;
  }

  return instrumentDesc;
}

function describePump(entry: any): string {
  const rawPumpType = entry.specs?.pumpType;
  const pumpType = rawPumpType || "Pump";
  const rawFlowRate = entry.specs?.flowRate;
  const flowRate = rawFlowRate || "";
  const rawTotalHead = entry.specs?.totalHead;
  const head = rawTotalHead || "";
  const rawMotorPower = entry.specs?.motorPower;
  const motorPower = rawMotorPower || "";
  const rawCasingMaterial = entry.specs?.casingMaterial;
  const casingMaterial = rawCasingMaterial || "";

  let pumpDesc = titleCaseWords(pumpType);

  if (flowRate) {
    pumpDesc += ` ${flowRate}m³/h`;
  }
  if (head) {
    pumpDesc += ` ${head}m Head`;
  }
  if (motorPower) {
    pumpDesc += ` ${motorPower}kW`;
  }
  if (casingMaterial) {
    pumpDesc += ` ${casingMaterial}`;
  }

  return pumpDesc;
}

function describeTankChute(entry: any): string {
  const rawAssemblyType = entry.specs?.assemblyType;
  const assemblyType = rawAssemblyType || "Assembly";
  const typeLabel = assemblyType.charAt(0).toUpperCase() + assemblyType.slice(1);
  const rawMaterialGrade = entry.specs?.materialGrade;
  const grade = rawMaterialGrade || "";
  const rawDrawingReference = entry.specs?.drawingReference;
  const drawing = rawDrawingReference || "";
  const weight = entry.specs?.totalSteelWeightKg;
  const rawQuantityValue = entry.specs?.quantityValue;
  const qty = rawQuantityValue || 1;

  const parts = [typeLabel];
  if (drawing) parts.push(drawing);
  if (grade) parts.push(grade);
  if (weight) parts.push(`${weight}kg`);
  if (qty > 1) parts.push(`x${qty}`);
  return parts.join(" - ");
}

function describeFastener(entry: any): string {
  const rawFastenerCategory = entry.specs?.fastenerCategory;
  const cat = rawFastenerCategory || "fastener";
  const rawSpecificType = entry.specs?.specificType;
  const type = rawSpecificType || "";
  const rawSize = entry.specs?.size;
  const size = rawSize || "";
  const rawGrade = entry.specs?.grade;
  const grade = rawGrade || "";
  const rawQuantityValue = entry.specs?.quantityValue;
  const qty = rawQuantityValue || 1;
  const parts = [cat.replace(/_/g, " "), type.replace(/_/g, " "), size];
  if (grade) parts.push(grade);
  if (qty > 1) parts.push(`x${qty}`);
  return parts.filter(Boolean).join(" - ");
}

function describeStraightPipe(
  entry: any,
  globalSpecs: GlobalSpecs,
  masterData: MasterData,
): string {
  const rawNominalBoreMm = entry.specs.nominalBoreMm;
  const nb = rawNominalBoreMm || "XX";
  const rawScheduleNumber = entry.specs.scheduleNumber;
  let schedule =
    rawScheduleNumber || (entry.specs.wallThicknessMm ? `${entry.specs.wallThicknessMm}WT` : "XX");
  const wallThickness = entry.specs.wallThicknessMm;
  const pipeLength = entry.specs.individualPipeLength;
  const rawPipeEndConfiguration = entry.specs.pipeEndConfiguration;
  const pipeEndConfig = rawPipeEndConfiguration || "PE";

  if (schedule.startsWith("Sch")) {
    schedule = schedule.substring(3);
  }

  const flangeDisplay = (config: string): string => {
    if (config === "FOE") return "1X R/F";
    if (config === "FBE") return "2X R/F";
    if (config === "FOE_LF") return "1X R/F, 1X L/F";
    if (config === "FOE_RF") return "2X R/F";
    if (config === "2X_RF") return "2X R/F";
    return "";
  };

  const { flangeStandard, pressureClass } = resolveFlangeSpecs(entry, globalSpecs, masterData);

  const rawSteelSpecificationId = entry.specs?.steelSpecificationId;
  const pipesteelSpecId = rawSteelSpecificationId || globalSpecs?.steelSpecificationId;
  const pipeSteelSpec = resolveSteelSpec(pipesteelSpecId, masterData);

  const isSABS719 = pipesteelSpecId === 8;

  let description = `${nb}NB`;

  if (isSABS719) {
    if (wallThickness) {
      description += ` W/T ${wallThickness}mm`;
    }
    if (pipeSteelSpec) {
      description += ` ${pipeSteelSpec}`;
    }
  } else {
    description += ` Sch ${schedule}`;
    if (wallThickness) {
      description += ` (${wallThickness}mm)`;
    }
    if (pipeSteelSpec) {
      description += ` ${pipeSteelSpec}`;
    }
  }

  description += " Pipe";

  if (pipeLength) {
    description += `, ${pipeLength}Lg`;
  }

  const flangeText = flangeDisplay(pipeEndConfig);
  if (flangeText) {
    description += `, ${flangeText}`;
  }

  if (flangeText && flangeStandard && pressureClass) {
    description += `, ${flangeStandard} ${pressureClass}`;
  }

  return description;
}

export function itemDescription(
  entry: any,
  globalSpecs: GlobalSpecs,
  masterData: MasterData,
): string {
  if (entry.itemType === "bend") return describeBend(entry, globalSpecs, masterData);
  if (entry.itemType === "fitting") return describeFitting(entry, globalSpecs, masterData);
  if (entry.itemType === "valve") return describeValve(entry);
  if (entry.itemType === "instrument") return describeInstrument(entry);
  if (entry.itemType === "pump") return describePump(entry);
  if (entry.itemType === "tank_chute") return describeTankChute(entry);
  if (entry.itemType === "fastener") return describeFastener(entry);
  return describeStraightPipe(entry, globalSpecs, masterData);
}
