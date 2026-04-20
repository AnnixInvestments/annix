"use client";

import { toPairs as entries, values } from "es-toolkit/compat";
import type { BoqSection, ConsolidatedItem, RfqItemDetail } from "@/app/lib/api/supplierApi";
import { currencyByCode, vatRateForCurrency } from "@/app/lib/currencies";
import {
  flangeCountFromConfig,
  formatCurrencyZA,
  isRotatingFlange,
  normalizeSteelSpec,
} from "../lib/boq-helpers";
import type { ExtractedSpecs, PricingInputs, WeldTotals } from "../lib/types";

interface GrandTotalsSectionProps {
  sections: BoqSection[];
  unitPrices: Record<string, Record<number, number>>;
  pricingInputs: PricingInputs;
  currencyCode: string;
  rfqItems: RfqItemDetail[];
  weldTotals: WeldTotals;
  extractedSpecs: ExtractedSpecs;
  weldUnitPrices: Record<string, number>;
}

function GrandTotalsSection(props: GrandTotalsSectionProps) {
  const sections = props.sections;
  const unitPrices = props.unitPrices;
  const pricingInputs = props.pricingInputs;
  const currencyCode = props.currencyCode;
  const rfqItems = props.rfqItems;
  const weldTotals = props.weldTotals;
  const extractedSpecs = props.extractedSpecs;
  const weldUnitPrices = props.weldUnitPrices;

  const currency = currencyByCode(currencyCode);
  const symbolFromCurrency = currency?.symbol;
  const currencySymbol = symbolFromCurrency ? symbolFromCurrency : currencyCode;

  const bnwBoltsPrice = pricingInputs.bnwTypes["bolts"];
  const bnwNutsPrice = pricingInputs.bnwTypes["nuts"];
  const bnwWashersPrice = pricingInputs.bnwTypes["washers"];
  const flangeBlankPrice = pricingInputs.flangeTypes["blank"];
  const flangeRotatingPrice = pricingInputs.flangeTypes["rotating"];
  const flangeSlipOnPrice = pricingInputs.flangeTypes["slipOn"];

  const valveBall = pricingInputs.valveTypes["ball_valve"];
  const valveGate = pricingInputs.valveTypes["gate_valve"];
  const valveGlobe = pricingInputs.valveTypes["globe_valve"];
  const valveButterfly = pricingInputs.valveTypes["butterfly_valve"];
  const valveCheck = pricingInputs.valveTypes["check_valve"];
  const valveControl = pricingInputs.valveTypes["control_valve"];
  const valveSafety = pricingInputs.valveTypes["safety_valve"];
  const valvePlug = pricingInputs.valveTypes["plug_valve"];
  const valveNeedle = pricingInputs.valveTypes["needle_valve"];
  const valveDiaphragm = pricingInputs.valveTypes["diaphragm_valve"];
  const valveGeneral = pricingInputs.valveTypes["general_valve"];

  const instFlowMeter = pricingInputs.instrumentTypes["flow_meter"];
  const instPressure = pricingInputs.instrumentTypes["pressure_instrument"];
  const instLevel = pricingInputs.instrumentTypes["level_instrument"];
  const instTemperature = pricingInputs.instrumentTypes["temperature_instrument"];
  const instAnalytical = pricingInputs.instrumentTypes["analytical_instrument"];
  const instGeneral = pricingInputs.instrumentTypes["general_instrument"];

  const pumpCentrifugal = pricingInputs.pumpTypes["centrifugal_pump"];
  const pumpSubmersible = pricingInputs.pumpTypes["submersible_pump"];
  const pumpProgressiveCavity = pricingInputs.pumpTypes["progressive_cavity_pump"];
  const pumpSlurry = pricingInputs.pumpTypes["slurry_pump"];
  const pumpDiaphragm = pricingInputs.pumpTypes["diaphragm_pump"];
  const pumpGear = pricingInputs.pumpTypes["gear_pump"];
  const pumpNewPump = pricingInputs.pumpTypes["new_pump"];
  const pumpImpeller = pricingInputs.pumpTypes["impeller"];
  const pumpMechanicalSeal = pricingInputs.pumpTypes["mechanical_seal"];
  const pumpBearingKit = pricingInputs.pumpTypes["bearing_kit"];
  const pumpWearRing = pricingInputs.pumpTypes["wear_ring"];
  const pumpCoupling = pricingInputs.pumpTypes["coupling"];
  const pumpShaftSleeve = pricingInputs.pumpTypes["shaft_sleeve"];
  const pumpPart = pricingInputs.pumpTypes["pump_part"];
  const pumpSpare = pricingInputs.pumpTypes["pump_spare"];
  const pumpMajorOverhaul = pricingInputs.pumpTypes["major_overhaul"];
  const pumpMinorOverhaul = pricingInputs.pumpTypes["minor_overhaul"];
  const pumpSealReplacement = pricingInputs.pumpTypes["seal_replacement"];
  const pumpBearingReplacement = pricingInputs.pumpTypes["bearing_replacement"];
  const pumpInspection = pricingInputs.pumpTypes["inspection"];
  const pumpRepair = pricingInputs.pumpTypes["pump_repair"];
  const pumpSlurryRental = pricingInputs.pumpTypes["slurry_rental"];
  const pumpLargeDewatering = pricingInputs.pumpTypes["large_dewatering"];
  const pumpMediumDewatering = pricingInputs.pumpTypes["medium_dewatering"];
  const pumpSmallDewatering = pricingInputs.pumpTypes["small_dewatering"];
  const pumpRental = pricingInputs.pumpTypes["pump_rental"];
  const firstValvePrice = values(pricingInputs.valveTypes)[0];
  const firstInstrumentPrice = values(pricingInputs.instrumentTypes)[0];
  const firstPumpPrice = values(pricingInputs.pumpTypes)[0];
  const firstSteelPrice = values(pricingInputs.steelSpecs)[0];

  const calculateSuggestedPriceForItem = (item: ConsolidatedItem, sectionType: string): number => {
    const isFabricatedSection = ["straight_pipes", "bends", "fittings", "tees"].includes(
      sectionType,
    );
    const isFlangesSection = sectionType === "flanges" || sectionType === "blank_flanges";
    const isBlankFlangesSection = sectionType === "blank_flanges";
    const isBnwSection = sectionType === "bnw_sets";
    const description = item.description.toUpperCase();
    const weightPerUnit = item.qty > 0 ? item.weightKg / item.qty : 0;

    if (isBnwSection) {
      const totalBnwWeight = weightPerUnit;
      const boltWeight = totalBnwWeight * 0.55;
      const nutWeight = totalBnwWeight * 0.3;
      const washerWeight = totalBnwWeight * 0.15;

      const boltPrice = (bnwBoltsPrice ? bnwBoltsPrice : 0) * boltWeight;
      const nutPrice = (bnwNutsPrice ? bnwNutsPrice : 0) * nutWeight;
      const washerPrice = (bnwWashersPrice ? bnwWashersPrice : 0) * washerWeight;

      return boltPrice + nutPrice + washerPrice;
    }

    if (isFlangesSection) {
      let flangePrice = 0;
      if (isBlankFlangesSection || description.includes("BLANK")) {
        flangePrice = (flangeBlankPrice ? flangeBlankPrice : 0) * weightPerUnit;
      } else if (description.includes("ROTATING") || description.includes("R/F")) {
        flangePrice = (flangeRotatingPrice ? flangeRotatingPrice : 0) * weightPerUnit;
      } else {
        flangePrice = (flangeSlipOnPrice ? flangeSlipOnPrice : 0) * weightPerUnit;
      }
      const labourExtras = flangePrice * (pricingInputs.labourExtrasPercent / 100);
      return flangePrice + labourExtras;
    }

    const isValveSectionFirst = sectionType === "valves";
    if (isValveSectionFirst) {
      let valvePrice = 0;
      if (description.includes("BALL")) {
        valvePrice = valveBall ? valveBall : valveGeneral ? valveGeneral : 0;
      } else if (description.includes("GATE")) {
        valvePrice = valveGate ? valveGate : valveGeneral ? valveGeneral : 0;
      } else if (description.includes("GLOBE")) {
        valvePrice = valveGlobe ? valveGlobe : valveGeneral ? valveGeneral : 0;
      } else if (description.includes("BUTTERFLY")) {
        valvePrice = valveButterfly ? valveButterfly : valveGeneral ? valveGeneral : 0;
      } else if (description.includes("CHECK")) {
        valvePrice = valveCheck ? valveCheck : valveGeneral ? valveGeneral : 0;
      } else if (description.includes("CONTROL") || description.includes("ACTUATOR")) {
        valvePrice = valveControl ? valveControl : valveGeneral ? valveGeneral : 0;
      } else if (
        description.includes("SAFETY") ||
        description.includes("RELIEF") ||
        description.includes("PSV")
      ) {
        valvePrice = valveSafety ? valveSafety : valveGeneral ? valveGeneral : 0;
      } else if (description.includes("PLUG")) {
        valvePrice = valvePlug ? valvePlug : valveGeneral ? valveGeneral : 0;
      } else if (description.includes("NEEDLE")) {
        valvePrice = valveNeedle ? valveNeedle : valveGeneral ? valveGeneral : 0;
      } else if (description.includes("DIAPHRAGM")) {
        valvePrice = valveDiaphragm ? valveDiaphragm : valveGeneral ? valveGeneral : 0;
      } else {
        valvePrice = valveGeneral ? valveGeneral : firstValvePrice ? firstValvePrice : 0;
      }
      const labourExtrasValve = valvePrice * (pricingInputs.labourExtrasPercent / 100);
      return valvePrice + labourExtrasValve;
    }

    const isInstrumentSectionFirst = [
      "instruments",
      "flow_meters",
      "pressure_instruments",
      "level_instruments",
      "temperature_instruments",
    ].includes(sectionType);
    if (isInstrumentSectionFirst) {
      let instrumentPrice = 0;
      if (
        sectionType === "flow_meters" ||
        description.includes("FLOW") ||
        description.includes("METER")
      ) {
        instrumentPrice = instFlowMeter ? instFlowMeter : instGeneral ? instGeneral : 0;
      } else if (
        sectionType === "pressure_instruments" ||
        description.includes("PRESSURE") ||
        description.includes("PSI") ||
        description.includes("BAR")
      ) {
        instrumentPrice = instPressure ? instPressure : instGeneral ? instGeneral : 0;
      } else if (
        sectionType === "level_instruments" ||
        description.includes("LEVEL") ||
        description.includes("RADAR") ||
        description.includes("ULTRASONIC")
      ) {
        instrumentPrice = instLevel ? instLevel : instGeneral ? instGeneral : 0;
      } else if (
        sectionType === "temperature_instruments" ||
        description.includes("TEMPERATURE") ||
        description.includes("RTD") ||
        description.includes("THERMOCOUPLE")
      ) {
        instrumentPrice = instTemperature ? instTemperature : instGeneral ? instGeneral : 0;
      } else if (
        description.includes("PH") ||
        description.includes("CONDUCTIVITY") ||
        description.includes("ANALYZER")
      ) {
        instrumentPrice = instAnalytical ? instAnalytical : instGeneral ? instGeneral : 0;
      } else {
        instrumentPrice = instGeneral
          ? instGeneral
          : firstInstrumentPrice
            ? firstInstrumentPrice
            : 0;
      }
      const labourExtrasInst = instrumentPrice * (pricingInputs.labourExtrasPercent / 100);
      return instrumentPrice + labourExtrasInst;
    }

    const isPumpSectionFirst = [
      "pumps",
      "pump_parts",
      "pump_spares",
      "pump_repairs",
      "pump_rental",
    ].includes(sectionType);
    if (isPumpSectionFirst) {
      let pumpPrice = 0;
      if (sectionType === "pumps") {
        if (description.includes("CENTRIFUGAL") || description.includes("END SUCTION")) {
          pumpPrice = pumpCentrifugal ? pumpCentrifugal : pumpNewPump ? pumpNewPump : 0;
        } else if (description.includes("SUBMERSIBLE") || description.includes("BOREHOLE")) {
          pumpPrice = pumpSubmersible ? pumpSubmersible : pumpNewPump ? pumpNewPump : 0;
        } else if (
          description.includes("PROGRESSIVE") ||
          description.includes("CAVITY") ||
          description.includes("MONO")
        ) {
          pumpPrice = pumpProgressiveCavity ? pumpProgressiveCavity : pumpNewPump ? pumpNewPump : 0;
        } else if (description.includes("SLURRY") || description.includes("WARMAN")) {
          pumpPrice = pumpSlurry ? pumpSlurry : pumpNewPump ? pumpNewPump : 0;
        } else if (description.includes("DIAPHRAGM")) {
          pumpPrice = pumpDiaphragm ? pumpDiaphragm : pumpNewPump ? pumpNewPump : 0;
        } else if (description.includes("GEAR")) {
          pumpPrice = pumpGear ? pumpGear : pumpNewPump ? pumpNewPump : 0;
        } else {
          pumpPrice = pumpNewPump ? pumpNewPump : firstPumpPrice ? firstPumpPrice : 0;
        }
      } else if (sectionType === "pump_parts" || sectionType === "pump_spares") {
        if (description.includes("IMPELLER")) {
          pumpPrice = pumpImpeller ? pumpImpeller : pumpPart ? pumpPart : 0;
        } else if (description.includes("SEAL")) {
          pumpPrice = pumpMechanicalSeal ? pumpMechanicalSeal : pumpPart ? pumpPart : 0;
        } else if (description.includes("BEARING")) {
          pumpPrice = pumpBearingKit ? pumpBearingKit : pumpPart ? pumpPart : 0;
        } else if (description.includes("WEAR RING")) {
          pumpPrice = pumpWearRing ? pumpWearRing : pumpPart ? pumpPart : 0;
        } else if (description.includes("COUPLING")) {
          pumpPrice = pumpCoupling ? pumpCoupling : pumpPart ? pumpPart : 0;
        } else if (description.includes("SHAFT") || description.includes("SLEEVE")) {
          pumpPrice = pumpShaftSleeve ? pumpShaftSleeve : pumpPart ? pumpPart : 0;
        } else {
          pumpPrice = pumpPart
            ? pumpPart
            : pumpSpare
              ? pumpSpare
              : firstPumpPrice
                ? firstPumpPrice
                : 0;
        }
      } else if (sectionType === "pump_repairs") {
        if (description.includes("MAJOR") || description.includes("OVERHAUL")) {
          pumpPrice = pumpMajorOverhaul ? pumpMajorOverhaul : pumpRepair ? pumpRepair : 0;
        } else if (description.includes("MINOR")) {
          pumpPrice = pumpMinorOverhaul ? pumpMinorOverhaul : pumpRepair ? pumpRepair : 0;
        } else if (description.includes("SEAL") && description.includes("REPLACE")) {
          pumpPrice = pumpSealReplacement ? pumpSealReplacement : pumpRepair ? pumpRepair : 0;
        } else if (description.includes("BEARING") && description.includes("REPLACE")) {
          pumpPrice = pumpBearingReplacement ? pumpBearingReplacement : pumpRepair ? pumpRepair : 0;
        } else if (description.includes("INSPECT")) {
          pumpPrice = pumpInspection ? pumpInspection : pumpRepair ? pumpRepair : 0;
        } else {
          pumpPrice = pumpRepair ? pumpRepair : firstPumpPrice ? firstPumpPrice : 0;
        }
      } else if (sectionType === "pump_rental") {
        if (description.includes("SLURRY")) {
          pumpPrice = pumpSlurryRental ? pumpSlurryRental : pumpRental ? pumpRental : 0;
        } else if (description.includes("LARGE") || description.includes("200")) {
          pumpPrice = pumpLargeDewatering ? pumpLargeDewatering : pumpRental ? pumpRental : 0;
        } else if (
          description.includes("MEDIUM") ||
          description.includes("100") ||
          description.includes("150")
        ) {
          pumpPrice = pumpMediumDewatering ? pumpMediumDewatering : pumpRental ? pumpRental : 0;
        } else if (
          description.includes("SMALL") ||
          description.includes("50") ||
          description.includes("75")
        ) {
          pumpPrice = pumpSmallDewatering ? pumpSmallDewatering : pumpRental ? pumpRental : 0;
        } else {
          pumpPrice = pumpRental ? pumpRental : firstPumpPrice ? firstPumpPrice : 0;
        }
      }
      const labourExtrasPump = pumpPrice * (pricingInputs.labourExtrasPercent / 100);
      return pumpPrice + labourExtrasPump;
    }

    if (!isFabricatedSection) return 0;

    let basePrice = 0;

    const firstEntry = item.entries[0];
    const rfqItem =
      item.entries.length > 0
        ? rfqItems.find((ri) => ri.lineNumber === firstEntry || ri.id === firstEntry)
        : null;

    const rfqStraightStandard = rfqItem?.straightPipeDetails?.pipeStandard;
    const rfqBendStandard = rfqItem?.bendDetails?.pipeStandard;
    const rfqFittingStandard = rfqItem?.fittingDetails?.fittingStandard;
    const itemSteelSpec = rfqItem
      ? normalizeSteelSpec(
          rfqStraightStandard
            ? rfqStraightStandard
            : rfqBendStandard
              ? rfqBendStandard
              : rfqFittingStandard
                ? rfqFittingStandard
                : "",
        )
      : "";

    entries(pricingInputs.steelSpecs).forEach(([spec, pricePerKg]) => {
      if (pricePerKg > 0) {
        const normalizedSpec = spec.toUpperCase();
        if (description.includes(normalizedSpec) || itemSteelSpec === normalizedSpec) {
          basePrice += weightPerUnit * pricePerKg;
        }
      }
    });

    if (basePrice === 0) {
      const defaultSteelPrice = firstSteelPrice ? firstSteelPrice : 0;
      if (defaultSteelPrice > 0) {
        basePrice = weightPerUnit * defaultSteelPrice;
      }
    }

    let flangePrice = 0;
    if (rfqItem) {
      const rfqStraightEnd = rfqItem.straightPipeDetails?.pipeEndConfiguration;
      const rfqBendEnd = rfqItem.bendDetails?.bendEndConfiguration;
      const rfqFittingEnd = rfqItem.fittingDetails?.pipeEndConfiguration;
      const endConfig = rfqStraightEnd
        ? rfqStraightEnd
        : rfqBendEnd
          ? rfqBendEnd
          : rfqFittingEnd
            ? rfqFittingEnd
            : "";

      if (endConfig && endConfig !== "PE") {
        const flangeCount = flangeCountFromConfig(endConfig, rfqItem.itemType);
        if (isRotatingFlange(endConfig)) {
          flangePrice += (flangeRotatingPrice ? flangeRotatingPrice : 0) * flangeCount;
        } else {
          flangePrice += (flangeSlipOnPrice ? flangeSlipOnPrice : 0) * flangeCount;
        }
      }

      if (rfqItem.fittingDetails?.addBlankFlange && rfqItem.fittingDetails.blankFlangeCount) {
        flangePrice +=
          (flangeBlankPrice ? flangeBlankPrice : 0) * rfqItem.fittingDetails.blankFlangeCount;
      }
    }

    const subtotal = basePrice + flangePrice;
    const labourExtras = subtotal * (pricingInputs.labourExtrasPercent / 100);

    return subtotal + labourExtras;
  };

  const calculateWeldingSectionTotal = (): number => {
    const weldTypes = entries(extractedSpecs.weldTypes)
      .filter(([, hasWeld]) => hasWeld)
      .map(([type]) => type);

    return weldTypes.reduce((sum, weldType) => {
      const quantity = weldTotals[weldType as keyof WeldTotals];
      const manualPrice = weldUnitPrices[weldType];
      const weldPricing = pricingInputs.weldTypes[weldType];
      const pricePerLm = weldPricing ? weldPricing : 0;
      const labourExtras = pricePerLm * (pricingInputs.labourExtrasPercent / 100);
      const suggestedPrice = pricePerLm + labourExtras;
      const effectivePrice =
        manualPrice !== undefined && manualPrice > 0 ? manualPrice : suggestedPrice;
      return sum + quantity * effectivePrice;
    }, 0);
  };

  const sectionsSubtotal = sections.reduce((total, section) => {
    const sectionPricesRaw = unitPrices[String(section.id)];
    const sectionPrices = sectionPricesRaw ? sectionPricesRaw : {};
    const sectionTotal = section.items.reduce((sum, item, idx) => {
      const manualPrice = sectionPrices[idx];
      const effectivePrice =
        manualPrice !== undefined && manualPrice > 0
          ? manualPrice
          : calculateSuggestedPriceForItem(item, section.sectionType);
      return sum + item.qty * effectivePrice;
    }, 0);
    return total + sectionTotal;
  }, 0);

  const weldingTotal = calculateWeldingSectionTotal();
  const subtotal = sectionsSubtotal + weldingTotal;

  const contingenciesAmount = subtotal * (pricingInputs.contingenciesPercent / 100);
  const grandTotalExVat = subtotal + contingenciesAmount;
  const vatRate = vatRateForCurrency(currencyCode);
  const vatAmount = grandTotalExVat * (vatRate / 100);
  const grandTotalIncVat = grandTotalExVat + vatAmount;

  return (
    <div className="mt-8 border-t-2 border-gray-300 pt-6">
      <div className="flex flex-col items-end space-y-2">
        <div className="flex justify-between w-80 text-sm">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium text-gray-900">
            {currencySymbol} {formatCurrencyZA(subtotal)}
          </span>
        </div>
        <div className="flex justify-between w-80 text-sm">
          <span className="text-gray-600">
            Contingencies ({pricingInputs.contingenciesPercent}%):
          </span>
          <span className="font-medium text-gray-900">
            {currencySymbol} {formatCurrencyZA(contingenciesAmount)}
          </span>
        </div>
        <div className="flex justify-between w-80 text-sm font-semibold border-t border-gray-300 pt-2 mt-2">
          <span className="text-gray-900">Grand Total (ex VAT):</span>
          <span className="text-gray-900">
            {currencySymbol} {formatCurrencyZA(grandTotalExVat)}
          </span>
        </div>
        <div className="flex justify-between w-80 text-sm">
          <span className="text-gray-600">VAT ({vatRate}%):</span>
          <span className="font-medium text-gray-900">
            {currencySymbol} {formatCurrencyZA(vatAmount)}
          </span>
        </div>
        <div className="flex justify-between w-80 text-lg font-bold border-t border-gray-300 pt-2 mt-2">
          <span className="text-gray-900">Total (inc VAT):</span>
          <span className="text-green-700">
            {currencySymbol} {formatCurrencyZA(grandTotalIncVat)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default GrandTotalsSection;
