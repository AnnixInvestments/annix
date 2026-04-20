"use client";

import { toPairs as entries, values } from "es-toolkit/compat";
import React from "react";
import type { BoqSection, ConsolidatedItem, RfqItemDetail } from "@/app/lib/api/supplierApi";
import { currencyByCode } from "@/app/lib/currencies";
import { useAllFlangeTypeWeights } from "@/app/lib/query/hooks";
import {
  flangeCountFromConfig,
  formatCurrencyZA,
  isRotatingFlange,
  normalizeSteelSpec,
  recalculateFlangeWeight,
} from "../lib/boq-helpers";
import type { PricingInputs } from "../lib/types";

interface SectionTableProps {
  section: BoqSection;
  currencyCode: string;
  unitPrices: Record<number, number>;
  onUnitPriceChange: (itemIndex: number, value: number) => void;
  pricingInputs: PricingInputs;
  rfqItems: RfqItemDetail[];
}

function SectionTable(props: SectionTableProps) {
  const section = props.section;
  const currencyCode = props.currencyCode;
  const unitPrices = props.unitPrices;
  const onUnitPriceChange = props.onUnitPriceChange;
  const pricingInputs = props.pricingInputs;
  const rfqItems = props.rfqItems;

  const { data: allWeights = [] } = useAllFlangeTypeWeights();

  const hasWelds = section.items.some((item) => {
    const welds = item.welds;
    if (!welds) return false;
    const flange = welds.flangeWeld;
    const mitre = welds.mitreWeld;
    const tee = welds.teeWeld;
    const gusset = welds.gussetTeeWeld;
    const lat45 = welds.latWeld45Plus;
    const latUnder = welds.latWeldUnder45;
    return flange || mitre || tee || gusset || lat45 || latUnder;
  });
  const hasAreas = section.items.some((item) => {
    const areas = item.areas;
    if (!areas) return false;
    const intArea = areas.intAreaM2;
    const extArea = areas.extAreaM2;
    return intArea || extArea;
  });

  const currency = currencyByCode(currencyCode);
  const symbolFromCurrency = currency?.symbol;
  const currencySymbol = symbolFromCurrency ? symbolFromCurrency : currencyCode;

  const isFabricatedSection = ["straight_pipes", "bends", "fittings", "tees"].includes(
    section.sectionType,
  );
  const isFlangesSection =
    section.sectionType === "flanges" || section.sectionType === "blank_flanges";
  const isBlankFlangesSection = section.sectionType === "blank_flanges";
  const isBnwSection = section.sectionType === "bnw_sets";

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

  const effectiveItemWeight = (item: ConsolidatedItem): number => {
    if (isFlangesSection) {
      return recalculateFlangeWeight(allWeights, item.description, item.qty, isBlankFlangesSection);
    }
    return Number(
      (() => {
        const rawWeightKg = item.weightKg;
        return rawWeightKg || 0;
      })(),
    );
  };

  const calculateSuggestedPrice = (item: ConsolidatedItem): number => {
    const description = item.description.toUpperCase();
    const itemWeight = effectiveItemWeight(item);
    const weightPerUnit = item.qty > 0 ? itemWeight / item.qty : 0;

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

    const isValveSectionSecond = section.sectionType === "valves";
    if (isValveSectionSecond) {
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

    const isInstrumentSectionSecond = [
      "instruments",
      "flow_meters",
      "pressure_instruments",
      "level_instruments",
      "temperature_instruments",
    ].includes(section.sectionType);
    if (isInstrumentSectionSecond) {
      let instrumentPrice = 0;
      if (
        section.sectionType === "flow_meters" ||
        description.includes("FLOW") ||
        description.includes("METER")
      ) {
        instrumentPrice = instFlowMeter ? instFlowMeter : instGeneral ? instGeneral : 0;
      } else if (
        section.sectionType === "pressure_instruments" ||
        description.includes("PRESSURE") ||
        description.includes("PSI") ||
        description.includes("BAR")
      ) {
        instrumentPrice = instPressure ? instPressure : instGeneral ? instGeneral : 0;
      } else if (
        section.sectionType === "level_instruments" ||
        description.includes("LEVEL") ||
        description.includes("RADAR") ||
        description.includes("ULTRASONIC")
      ) {
        instrumentPrice = instLevel ? instLevel : instGeneral ? instGeneral : 0;
      } else if (
        section.sectionType === "temperature_instruments" ||
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

    const isPumpSectionSecond = [
      "pumps",
      "pump_parts",
      "pump_spares",
      "pump_repairs",
      "pump_rental",
    ].includes(section.sectionType);
    if (isPumpSectionSecond) {
      let pumpPrice = 0;
      if (section.sectionType === "pumps") {
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
      } else if (section.sectionType === "pump_parts" || section.sectionType === "pump_spares") {
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
      } else if (section.sectionType === "pump_repairs") {
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
      } else if (section.sectionType === "pump_rental") {
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

  const effectiveUnitPrice = (itemIndex: number, item: ConsolidatedItem): number => {
    const manualPrice = unitPrices[itemIndex];
    if (manualPrice !== undefined && manualPrice > 0) {
      return manualPrice;
    }
    return calculateSuggestedPrice(item);
  };

  const lineTotal = (itemIndex: number, item: ConsolidatedItem): number => {
    const unitPrice = effectiveUnitPrice(itemIndex, item);
    return item.qty * unitPrice;
  };

  const totalLineAmount = section.items.reduce((sum, item, idx) => sum + lineTotal(idx, item), 0);

  const totals = {
    flangeWeld: section.items.reduce((sum, item) => {
      const weldValue = item.welds?.flangeWeld;
      return sum + (weldValue ? weldValue : 0);
    }, 0),
    mitreWeld: section.items.reduce((sum, item) => {
      const weldValue = item.welds?.mitreWeld;
      return sum + (weldValue ? weldValue : 0);
    }, 0),
    teeWeld: section.items.reduce((sum, item) => {
      const weldValue = item.welds?.teeWeld;
      return sum + (weldValue ? weldValue : 0);
    }, 0),
    gussetTeeWeld: section.items.reduce((sum, item) => {
      const weldValue = item.welds?.gussetTeeWeld;
      return sum + (weldValue ? weldValue : 0);
    }, 0),
    latWeld45Plus: section.items.reduce((sum, item) => {
      const weldValue = item.welds?.latWeld45Plus;
      return sum + (weldValue ? weldValue : 0);
    }, 0),
    latWeldUnder45: section.items.reduce((sum, item) => {
      const weldValue = item.welds?.latWeldUnder45;
      return sum + (weldValue ? weldValue : 0);
    }, 0),
    intArea: section.items.reduce((sum, item) => {
      const areaValue = item.areas?.intAreaM2;
      return sum + (areaValue ? areaValue : 0);
    }, 0),
    extArea: section.items.reduce((sum, item) => {
      const areaValue = item.areas?.extAreaM2;
      return sum + (areaValue ? areaValue : 0);
    }, 0),
    weight: isFlangesSection
      ? section.items.reduce((sum, item) => sum + effectiveItemWeight(item), 0)
      : Number(section.totalWeightKg) || 0,
  };

  return (
    <div>
      <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
        {section.sectionTitle}
        <span className="text-sm font-normal text-gray-500">({section.itemCount} items)</span>
      </h3>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="w-16 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Qty
              </th>
              <th className="w-16 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Unit
              </th>
              <th className="w-32 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Unit Price ({currencySymbol})
              </th>
              <th className="w-32 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Line Total ({currencySymbol})
              </th>
              {hasWelds && (
                <>
                  <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Flange Weld (m)
                  </th>
                  <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Mitre Weld (m)
                  </th>
                  <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Tee Weld (m)
                  </th>
                  <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Gusset Tee (m)
                  </th>
                  <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Lat 45+ (m)
                  </th>
                  <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Lat &lt;45 (m)
                  </th>
                </>
              )}
              {hasAreas && (
                <>
                  <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Int m²
                  </th>
                  <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Ext m²
                  </th>
                </>
              )}
              <th className="w-28 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Weight (kg)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {section.items.map((item, idx) => {
              const manualPrice = unitPrices[idx];
              const suggestedPrice = calculateSuggestedPrice(item);
              const currentUnitPrice = effectiveUnitPrice(idx, item);
              const lineTotalValue = lineTotal(idx, item);
              const isAutoCalculated =
                (manualPrice === undefined || manualPrice === 0) && suggestedPrice > 0;
              const itemFlangeWeld = item.welds?.flangeWeld;
              const itemMitreWeld = item.welds?.mitreWeld;
              const itemTeeWeld = item.welds?.teeWeld;
              const itemGussetTeeWeld = item.welds?.gussetTeeWeld;
              const itemLatWeld45Plus = item.welds?.latWeld45Plus;
              const itemLatWeldUnder45 = item.welds?.latWeldUnder45;
              const totalWeldLm =
                (itemFlangeWeld ? itemFlangeWeld : 0) +
                (itemMitreWeld ? itemMitreWeld : 0) +
                (itemTeeWeld ? itemTeeWeld : 0) +
                (itemGussetTeeWeld ? itemGussetTeeWeld : 0) +
                (itemLatWeld45Plus ? itemLatWeld45Plus : 0) +
                (itemLatWeldUnder45 ? itemLatWeldUnder45 : 0);

              return (
                <React.Fragment key={idx}>
                  <tr>
                    <td className="w-12 px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.description}</td>
                    <td className="w-16 px-3 py-2 text-sm text-gray-900 text-right">{item.qty}</td>
                    <td className="w-16 px-3 py-2 text-sm text-gray-500">{item.unit}</td>
                    <td className="w-32 px-2 py-1">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={manualPrice || ""}
                          onChange={(e) => onUnitPriceChange(idx, parseFloat(e.target.value) || 0)}
                          placeholder={suggestedPrice > 0 ? suggestedPrice.toFixed(2) : "0.00"}
                          className={`w-full px-2 py-1 text-sm text-right border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isAutoCalculated ? "border-green-300 bg-green-50" : "border-gray-300"}`}
                        />
                      </div>
                      {isAutoCalculated && (
                        <div className="text-xs text-green-600 text-right mt-0.5">Auto</div>
                      )}
                    </td>
                    <td className="w-32 px-3 py-2 text-sm text-gray-900 text-right font-medium">
                      {currencySymbol} {formatCurrencyZA(lineTotalValue)}
                    </td>
                    {hasWelds && (
                      <>
                        <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.welds?.flangeWeld ? Number(item.welds.flangeWeld).toFixed(3) : "-"}
                        </td>
                        <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.welds?.mitreWeld ? Number(item.welds.mitreWeld).toFixed(3) : "-"}
                        </td>
                        <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.welds?.teeWeld ? Number(item.welds.teeWeld).toFixed(3) : "-"}
                        </td>
                        <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.welds?.gussetTeeWeld
                            ? Number(item.welds.gussetTeeWeld).toFixed(3)
                            : "-"}
                        </td>
                        <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.welds?.latWeld45Plus
                            ? Number(item.welds.latWeld45Plus).toFixed(3)
                            : "-"}
                        </td>
                        <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.welds?.latWeldUnder45
                            ? Number(item.welds.latWeldUnder45).toFixed(3)
                            : "-"}
                        </td>
                      </>
                    )}
                    {hasAreas && (
                      <>
                        <td className="w-20 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.areas?.intAreaM2 ? Number(item.areas.intAreaM2).toFixed(2) : "-"}
                        </td>
                        <td className="w-20 px-3 py-2 text-sm text-gray-900 text-right">
                          {item.areas?.extAreaM2 ? Number(item.areas.extAreaM2).toFixed(2) : "-"}
                        </td>
                      </>
                    )}
                    <td className="w-28 px-3 py-2 text-sm text-gray-900 text-right font-medium">
                      {effectiveItemWeight(item).toFixed(2)}
                    </td>
                  </tr>
                  {isFabricatedSection && totalWeldLm > 0 && (
                    <tr className="bg-blue-50 border-b border-blue-100">
                      <td className="w-12"></td>
                      <td
                        className="px-3 py-1 text-xs text-blue-700"
                        colSpan={hasWelds ? 11 : hasAreas ? 7 : 5}
                      >
                        <span className="font-medium">Total Weld Length:</span>{" "}
                        {totalWeldLm.toFixed(3)} Lm
                      </td>
                      <td className="w-28"></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {/* Totals row */}
            <tr className="bg-gray-100 font-medium">
              <td className="px-3 py-2 text-sm text-gray-900" colSpan={2}>
                TOTAL
              </td>
              <td className="w-16 px-3 py-2 text-sm text-gray-900 text-right">
                {section.items.reduce(
                  (sum, item) =>
                    sum +
                    (() => {
                      const rawQty = item.qty;
                      return rawQty || 0;
                    })(),
                  0,
                )}
              </td>
              <td className="w-16 px-3 py-2 text-sm text-gray-500"></td>
              <td className="w-32 px-3 py-2 text-sm text-gray-500"></td>
              <td className="w-32 px-3 py-2 text-sm text-green-700 text-right font-semibold">
                {currencySymbol} {formatCurrencyZA(totalLineAmount)}
              </td>
              {hasWelds && (
                <>
                  <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                    {Number(
                      (() => {
                        const rawFlangeWeld = totals.flangeWeld;
                        return rawFlangeWeld || 0;
                      })(),
                    ).toFixed(3)}
                  </td>
                  <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                    {Number(
                      (() => {
                        const rawMitreWeld = totals.mitreWeld;
                        return rawMitreWeld || 0;
                      })(),
                    ).toFixed(3)}
                  </td>
                  <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                    {Number(
                      (() => {
                        const rawTeeWeld = totals.teeWeld;
                        return rawTeeWeld || 0;
                      })(),
                    ).toFixed(3)}
                  </td>
                  <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                    {Number(
                      (() => {
                        const rawGussetTeeWeld = totals.gussetTeeWeld;
                        return rawGussetTeeWeld || 0;
                      })(),
                    ).toFixed(3)}
                  </td>
                  <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                    {Number(
                      (() => {
                        const rawLatWeld45Plus = totals.latWeld45Plus;
                        return rawLatWeld45Plus || 0;
                      })(),
                    ).toFixed(3)}
                  </td>
                  <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                    {Number(
                      (() => {
                        const rawLatWeldUnder45 = totals.latWeldUnder45;
                        return rawLatWeldUnder45 || 0;
                      })(),
                    ).toFixed(3)}
                  </td>
                </>
              )}
              {hasAreas && (
                <>
                  <td className="w-20 px-3 py-2 text-sm text-gray-900 text-right">
                    {Number(
                      (() => {
                        const rawIntArea = totals.intArea;
                        return rawIntArea || 0;
                      })(),
                    ).toFixed(2)}
                  </td>
                  <td className="w-20 px-3 py-2 text-sm text-gray-900 text-right">
                    {Number(
                      (() => {
                        const rawExtArea = totals.extArea;
                        return rawExtArea || 0;
                      })(),
                    ).toFixed(2)}
                  </td>
                </>
              )}
              <td className="w-28 px-3 py-2 text-sm text-gray-900 text-right">
                {Number(
                  (() => {
                    const rawWeight = totals.weight;
                    return rawWeight || 0;
                  })(),
                ).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SectionTable;
