import {
  calculatePumpEstimate,
  calculateRentalCost,
  estimatePumpRequirements,
  getPumpsByCategory,
  IEC_FRAME_SIZES,
  NEMA_FRAME_SIZES,
  PUMP_SPARE_PARTS,
  PumpCategory,
  SPARE_PARTS_KITS,
} from "@annix/product-data/pumps";
import type {
  Api610SelectionCriteria,
  Api610SelectionResult,
} from "@annix/product-data/pumps/api610Classification";
import {
  type PumpFormData,
  type ValidationResult,
  validatePumpForm,
} from "@annix/product-data/pumps/formValidation";
import type {
  SelectionCriteria,
  SelectionResult,
} from "@annix/product-data/pumps/pumpSelectionGuide";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { PumpFormProps } from "../PumpForm";

export function usePumpFormLogic(props: PumpFormProps) {
  const {
    entry,
    index: _index,
    entriesCount: _entriesCount,
    globalSpecs: _globalSpecs,
    masterData: _masterData,
    onUpdateEntry,
    onRemoveEntry,
    generateItemDescription,
    requiredProducts: _requiredProducts = [],
  } = props;
  const [calculationResults, setCalculationResults] = useState<any>(null);
  const [selectedSparePartCategory, setSelectedSparePartCategory] = useState<string | null>(null);
  const [showSelectionWizard, setShowSelectionWizard] = useState(false);
  const [showApi610Wizard, setShowApi610Wizard] = useState(false);
  const [showMaterialChecker, setShowMaterialChecker] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const handleWizardComplete = useCallback(
    (result: SelectionResult, criteria: SelectionCriteria) => {
      const recommendedType = result.recommendedTypes[0]?.type;
      if (recommendedType) {
        const rawFluidType = criteria.fluidType;
        onUpdateEntry(entry.id, {
          specs: {
            ...entry.specs,
            pumpCategory: recommendedType.category,
            pumpType: recommendedType.value,
            flowRate: criteria.flowRateM3h,
            totalHead: criteria.headM,
            operatingTemp: criteria.temperatureC,
            specificGravity: 1.0,
            viscosity: criteria.viscosityCp,
            solidsContent: criteria.solidsPercent,
            fluidType: rawFluidType || "water",
          },
        });
      }
      setShowSelectionWizard(false);
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const handleSelectPumpType = useCallback(
    (pumpTypeValue: string) => {
      onUpdateEntry(entry.id, {
        specs: {
          ...entry.specs,
          pumpType: pumpTypeValue,
        },
      });
      setShowSelectionWizard(false);
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const handleApi610Complete = useCallback(
    (result: Api610SelectionResult, criteria: Api610SelectionCriteria) => {
      const recommendedType = result.suitableTypes[0]?.type;
      if (recommendedType) {
        onUpdateEntry(entry.id, {
          specs: {
            ...entry.specs,
            pumpCategory: "centrifugal",
            pumpType: recommendedType.code.toLowerCase(),
            api610Type: recommendedType.code,
            flowRate: criteria.flowRateM3h,
            totalHead: criteria.headM,
            operatingTemp: criteria.temperatureC,
            dischargePressure: criteria.pressureBar,
          },
        });
      }
      setShowApi610Wizard(false);
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const rawServiceType = entry.specs?.serviceType;

  const serviceType = rawServiceType || "new_pump";
  const rawPumpCategory = entry.specs?.pumpCategory;
  const pumpCategory = rawPumpCategory || "centrifugal";
  const rawPumpType = entry.specs?.pumpType;
  const pumpType = rawPumpType || "";
  const rawQuantityValue = entry.specs?.quantityValue;
  const quantity = rawQuantityValue || 1;

  const flowRate = entry.specs?.flowRate;
  const totalHead = entry.specs?.totalHead;
  const suctionHead = entry.specs?.suctionHead;
  const npshAvailable = entry.specs?.npshAvailable;
  const dischargePressure = entry.specs?.dischargePressure;
  const operatingTemp = entry.specs?.operatingTemp;

  const rawFluidType2 = entry.specs?.fluidType;

  const fluidType = rawFluidType2 || "water";
  const rawSpecificGravity = entry.specs?.specificGravity;
  const specificGravity = rawSpecificGravity || 1.0;
  const viscosity = entry.specs?.viscosity;
  const solidsContent = entry.specs?.solidsContent;
  const solidsSize = entry.specs?.solidsSize;
  const ph = entry.specs?.ph;
  const rawIsAbrasive = entry.specs?.isAbrasive;
  const isAbrasive = rawIsAbrasive || false;
  const rawIsCorrosive = entry.specs?.isCorrosive;
  const isCorrosive = rawIsCorrosive || false;

  const rawCasingMaterial = entry.specs?.casingMaterial;

  const casingMaterial = rawCasingMaterial || "cast_iron";
  const rawImpellerMaterial = entry.specs?.impellerMaterial;
  const impellerMaterial = rawImpellerMaterial || "cast_iron";
  const rawShaftMaterial = entry.specs?.shaftMaterial;
  const shaftMaterial = rawShaftMaterial || "ss_410";
  const rawSealType = entry.specs?.sealType;
  const sealType = rawSealType || "mechanical_single";
  const sealPlan = entry.specs?.sealPlan;

  const suctionSize = entry.specs?.suctionSize;
  const dischargeSize = entry.specs?.dischargeSize;
  const rawConnectionType = entry.specs?.connectionType;
  const connectionType = rawConnectionType || "flanged_pn16";

  const rawMotorType = entry.specs?.motorType;

  const motorType = rawMotorType || "electric_ac";
  const motorPower = entry.specs?.motorPower;
  const rawVoltage = entry.specs?.voltage;
  const voltage = rawVoltage || "380_3ph";
  const rawFrequency = entry.specs?.frequency;
  const frequency = rawFrequency || "50";
  const rawMotorEfficiency = entry.specs?.motorEfficiency;
  const motorEfficiency = rawMotorEfficiency || "ie3";
  const rawEnclosure = entry.specs?.enclosure;
  const enclosure = rawEnclosure || "tefc";
  const rawHazardousArea = entry.specs?.hazardousArea;
  const hazardousArea = rawHazardousArea || "none";
  const rawFrameStandard = entry.specs?.frameStandard;
  const frameStandard = rawFrameStandard || "iec";
  const rawFrameSize = entry.specs?.frameSize;
  const frameSize = rawFrameSize || "";

  const rawCouplingType = entry.specs?.couplingType;

  const couplingType = rawCouplingType || "flexible_jaw";
  const rawCouplingGuard = entry.specs?.couplingGuard;
  const couplingGuard = rawCouplingGuard || "standard";

  const rawBaseplateType = entry.specs?.baseplateType;

  const baseplateType = rawBaseplateType || "fabricated_steel";
  const rawDrainConnection = entry.specs?.drainConnection;
  const drainConnection = rawDrainConnection || "plugged_drain";
  const rawGroutType = entry.specs?.groutType;
  const groutType = rawGroutType || "none";

  const rawPressureInstruments = entry.specs?.pressureInstruments;

  const pressureInstruments = rawPressureInstruments || [];
  const rawFlowInstruments = entry.specs?.flowInstruments;
  const flowInstruments = rawFlowInstruments || [];
  const rawTemperatureInstruments = entry.specs?.temperatureInstruments;
  const temperatureInstruments = rawTemperatureInstruments || [];
  const rawVibrationInstruments = entry.specs?.vibrationInstruments;
  const vibrationInstruments = rawVibrationInstruments || [];

  const rawCertifications = entry.specs?.certifications;

  const certifications = rawCertifications || [];
  const rawSpareParts = entry.specs?.spareParts;
  const spareParts = rawSpareParts || [];
  const rawExistingPumpModel = entry.specs?.existingPumpModel;
  const existingPumpModel = rawExistingPumpModel || "";
  const rawExistingPumpSerial = entry.specs?.existingPumpSerial;
  const existingPumpSerial = rawExistingPumpSerial || "";
  const rawRentalDurationDays = entry.specs?.rentalDurationDays;
  const rentalDurationDays = rawRentalDurationDays || 7;

  const rawSupplierReference = entry.specs?.supplierReference;

  const supplierReference = rawSupplierReference || "";
  const unitCostFromSupplier = entry.specs?.unitCostFromSupplier;
  const rawMarkupPercentage = entry.specs?.markupPercentage;
  const markupPercentage = rawMarkupPercentage || 15;

  const filteredPumpTypes = useMemo(() => {
    return getPumpsByCategory(pumpCategory as PumpCategory);
  }, [pumpCategory]);

  const filteredFrameSizes = useMemo(() => {
    if (frameStandard === "iec") {
      return IEC_FRAME_SIZES;
    } else if (frameStandard === "nema") {
      return NEMA_FRAME_SIZES;
    }
    return [...IEC_FRAME_SIZES, ...NEMA_FRAME_SIZES];
  }, [frameStandard]);

  useEffect(() => {
    if (serviceType === "new_pump" && flowRate && totalHead) {
      const estimate = estimatePumpRequirements(flowRate, totalHead, specificGravity, 70, 3);

      let results: any = {
        ...estimate,
        serviceType: "new_pump",
      };

      if (unitCostFromSupplier) {
        const pricing = calculatePumpEstimate({
          basePrice: unitCostFromSupplier,
          material: casingMaterial,
          motorPowerKw: motorPower || estimate.recommendedMotorKw,
          quantity,
          markupPercent: markupPercentage,
        });
        results = { ...results, ...pricing };
      }

      setCalculationResults(results);
      onUpdateEntry(entry.id, {
        calculation: results,
      });
    }

    if (serviceType === "rental" && unitCostFromSupplier) {
      const rental = calculateRentalCost({
        dailyRate: unitCostFromSupplier,
        durationDays: rentalDurationDays,
        deliveryDistance: 50,
        includesOperator: false,
      });

      setCalculationResults(rental);
      onUpdateEntry(entry.id, {
        calculation: rental,
      });
    }

    if (
      (serviceType === "spare_parts" || serviceType === "repair_service") &&
      unitCostFromSupplier
    ) {
      const unitPrice = unitCostFromSupplier * (1 + markupPercentage / 100);
      const totalPrice = unitPrice * quantity;

      const results = {
        unitCost: Math.round(unitPrice * 100) / 100,
        totalCost: Math.round(totalPrice * 100) / 100,
        markupAmount: Math.round((unitPrice - unitCostFromSupplier) * 100) / 100,
      };

      setCalculationResults(results);
      onUpdateEntry(entry.id, {
        calculation: results,
      });
    }
  }, [
    serviceType,
    flowRate,
    totalHead,
    specificGravity,
    casingMaterial,
    motorPower,
    quantity,
    unitCostFromSupplier,
    markupPercentage,
    rentalDurationDays,
    entry.id,
    onUpdateEntry,
  ]);

  useEffect(() => {
    const formData: PumpFormData = {
      serviceType: serviceType as PumpFormData["serviceType"],
      pumpCategory,
      pumpType,
      quantity,
      flowRate,
      totalHead,
      suctionHead,
      npshAvailable,
      dischargePressure,
      operatingTemp,
      fluidType,
      specificGravity,
      viscosity,
      solidsContent,
      ph,
      isAbrasive,
      isCorrosive,
      casingMaterial,
      impellerMaterial,
      shaftMaterial,
      sealType,
      sealPlan,
      suctionSize,
      dischargeSize,
      connectionType,
      motorType,
      motorPower,
      voltage,
      frequency,
      hazardousArea,
      certifications,
      spareParts,
      existingPumpModel,
      existingPumpSerial,
      rentalDurationDays,
      unitCostFromSupplier,
    };
    const result = validatePumpForm(formData);
    setValidationResult(result);
  }, [
    serviceType,
    pumpCategory,
    pumpType,
    quantity,
    flowRate,
    totalHead,
    suctionHead,
    npshAvailable,
    dischargePressure,
    operatingTemp,
    fluidType,
    specificGravity,
    viscosity,
    solidsContent,
    ph,
    isAbrasive,
    isCorrosive,
    casingMaterial,
    impellerMaterial,
    shaftMaterial,
    sealType,
    sealPlan,
    suctionSize,
    dischargeSize,
    connectionType,
    motorType,
    motorPower,
    voltage,
    frequency,
    hazardousArea,
    certifications,
    spareParts,
    existingPumpModel,
    existingPumpSerial,
    rentalDurationDays,
    unitCostFromSupplier,
  ]);

  const updateSpec = (field: string, value: any) => {
    onUpdateEntry(entry.id, {
      specs: {
        ...entry.specs,
        [field]: value,
      },
    });
  };

  const toggleCertification = (cert: string) => {
    const newCerts = certifications.includes(cert)
      ? certifications.filter((c: string) => c !== cert)
      : [...certifications, cert];
    updateSpec("certifications", newCerts);
  };

  const addSparePart = (partValue: string, partLabel: string) => {
    const newParts = [...spareParts, { value: partValue, label: partLabel, quantity: 1 }];
    updateSpec("spareParts", newParts);
  };

  const removeSparePart = (index: number) => {
    const newParts = spareParts.filter((_: any, i: number) => i !== index);
    updateSpec("spareParts", newParts);
  };

  const updateSparePartQuantity = (index: number, qty: number) => {
    const newParts = spareParts.map((p: any, i: number) =>
      i === index ? { ...p, quantity: qty } : p,
    );
    updateSpec("spareParts", newParts);
  };

  const addSparePartsKit = (kitValue: string) => {
    const kit = SPARE_PARTS_KITS.find((k) => k.value === kitValue);
    if (kit) {
      const newParts = kit.typicalParts.map((partValue) => {
        const allParts = PUMP_SPARE_PARTS.flatMap((cat) => cat.parts);
        const part = allParts.find((p) => p.value === partValue);
        const rawLabel = part?.label;
        return { value: partValue, label: rawLabel || partValue, quantity: 1 };
      });
      updateSpec("spareParts", [...spareParts, ...newParts]);
    }
  };

  return {
    showApi610Wizard,
    setShowApi610Wizard,
    addSparePart,
    addSparePartsKit,
    baseplateType,
    calculationResults,
    casingMaterial,
    certifications,
    connectionType,
    couplingGuard,
    couplingType,
    dischargePressure,
    dischargeSize,
    drainConnection,
    enclosure,
    existingPumpModel,
    existingPumpSerial,
    filteredFrameSizes,
    filteredPumpTypes,
    flowInstruments,
    flowRate,
    fluidType,
    frameSize,
    frameStandard,
    frequency,
    groutType,
    handleApi610Complete,
    handleSelectPumpType,
    handleWizardComplete,
    hazardousArea,
    impellerMaterial,
    isAbrasive,
    isCorrosive,
    markupPercentage,
    motorEfficiency,
    motorPower,
    motorType,
    npshAvailable,
    operatingTemp,
    ph,
    pressureInstruments,
    pumpCategory,
    pumpType,
    quantity,
    rawBaseplateType,
    rawCasingMaterial,
    rawCertifications,
    rawConnectionType,
    rawCouplingGuard,
    rawCouplingType,
    rawDrainConnection,
    rawEnclosure,
    rawExistingPumpModel,
    rawExistingPumpSerial,
    rawFlowInstruments,
    rawFluidType2,
    rawFrameSize,
    rawFrameStandard,
    rawFrequency,
    rawGroutType,
    rawHazardousArea,
    rawImpellerMaterial,
    rawIsAbrasive,
    rawIsCorrosive,
    rawMarkupPercentage,
    rawMotorEfficiency,
    rawMotorType,
    rawPressureInstruments,
    rawPumpCategory,
    rawPumpType,
    rawQuantityValue,
    rawRentalDurationDays,
    rawSealType,
    rawServiceType,
    rawShaftMaterial,
    rawSpareParts,
    rawSpecificGravity,
    rawSupplierReference,
    rawTemperatureInstruments,
    rawVibrationInstruments,
    rawVoltage,
    removeSparePart,
    rentalDurationDays,
    sealPlan,
    sealType,
    selectedSparePartCategory,
    serviceType,
    setCalculationResults,
    setSelectedSparePartCategory,
    setShowMaterialChecker,
    setShowSelectionWizard,
    setValidationResult,
    shaftMaterial,
    showMaterialChecker,
    showSelectionWizard,
    solidsContent,
    solidsSize,
    spareParts,
    specificGravity,
    suctionHead,
    suctionSize,
    supplierReference,
    temperatureInstruments,
    toggleCertification,
    totalHead,
    unitCostFromSupplier,
    updateSparePartQuantity,
    updateSpec,
    validationResult,
    vibrationInstruments,
    viscosity,
    voltage,
  };
}

export type PumpFormLogic = ReturnType<typeof usePumpFormLogic>;
