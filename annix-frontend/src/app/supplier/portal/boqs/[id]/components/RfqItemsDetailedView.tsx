"use client";

import { isArray, values } from "es-toolkit/compat";
import type { BoqSection, ConsolidatedItem, RfqItemDetail } from "@/app/lib/api/supplierApi";
import {
  weldCountPerBend,
  weldCountPerFitting,
  weldCountPerPipe,
} from "@/app/lib/config/rfq/pipeEndOptions";
import { currencyByCode, vatRateForCurrency } from "@/app/lib/currencies";
import {
  blankFlangeWeight as blankFlangeWeightLookup,
  flangeWeight as flangeWeightLookup,
  sansBlankFlangeWeight as sansBlankFlangeWeightLookup,
  useAllFlangeTypeWeights,
  useNbToOdMap,
} from "@/app/lib/query/hooks";
import {
  flangeCountFromConfig,
  formatCurrencyZA,
  isRotatingFlange,
  normalizeSteelSpec,
} from "../lib/boq-helpers";
import type { PricingInputs } from "../lib/types";

interface WeldBreakdown {
  flangeWeldMeters: number;
  buttWeldMeters: number;
  mitreWeldMeters: number;
  teeWeldMeters: number;
  tackWeldMeters: number;
  totalLinearMeters: number;
  wallThicknessMm: number;
}

function RfqSectionTable(props: { section: BoqSection }) {
  const section = props.section;
  const hasAreas = section.items.some((item) => {
    const areas = item.areas;
    if (!areas) return false;
    const intArea = areas.intAreaM2;
    const extArea = areas.extAreaM2;
    return intArea || extArea;
  });

  const sectionTotals = section.items.reduce(
    (acc, item) => {
      const extAreaValue = item.areas?.extAreaM2;
      const intAreaValue = item.areas?.intAreaM2;
      return {
        qty:
          acc.qty +
          (() => {
            const rawQty = item.qty;
            return rawQty || 0;
          })(),
        weight:
          acc.weight +
          Number(
            (() => {
              const rawWeightKg = item.weightKg;
              return rawWeightKg || 0;
            })(),
          ),
        extArea: acc.extArea + Number(extAreaValue ? extAreaValue : 0),
        intArea: acc.intArea + Number(intAreaValue ? intAreaValue : 0),
      };
    },
    { qty: 0, weight: 0, extArea: 0, intArea: 0 },
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-2">
        <h3 className="text-white font-semibold text-sm">
          {section.sectionTitle}
          <span className="ml-2 text-blue-200 font-normal">({section.itemCount} items)</span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-50 border-b border-blue-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-blue-800 w-24">
                Item #
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-blue-800">
                Description
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-20">
                Weld WT
              </th>
              {hasAreas && (
                <>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-20">
                    Ext m²
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-20">
                    Int m²
                  </th>
                </>
              )}
              <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-16">
                Qty
              </th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-blue-800 w-28">
                Weight/Item
              </th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-blue-800 w-28">
                Line Weight
              </th>
            </tr>
          </thead>
          <tbody>
            {section.items.map((item, idx) => {
              const itemNumber = `${section.sectionType.substring(0, 3).toUpperCase()}-${String(idx + 1).padStart(3, "0")}`;
              const weightPerItem =
                item.qty > 0
                  ? Number(
                      (() => {
                        const rawWeightKg = item.weightKg;
                        return rawWeightKg || 0;
                      })(),
                    ) / item.qty
                  : 0;
              const lineWeight = Number(
                (() => {
                  const rawWeightKg = item.weightKg;
                  return rawWeightKg || 0;
                })(),
              );

              const wtMatch = item.description.match(
                /W\/T\s*(\d+(?:\.\d+)?)\s*mm|(\d+(?:\.\d+)?)\s*mm\s*W\/T|Sch\w*\s*\((\d+(?:\.\d+)?)mm\)/i,
              );
              const wtGroup1 = wtMatch ? wtMatch[1] : undefined;
              const wtGroup2 = wtMatch ? wtMatch[2] : undefined;
              const wtGroup3 = wtMatch ? wtMatch[3] : undefined;
              const weldWt = wtMatch
                ? wtGroup1
                  ? wtGroup1
                  : wtGroup2
                    ? wtGroup2
                    : wtGroup3
                      ? wtGroup3
                      : null
                : null;

              return (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="py-2 px-3 text-xs text-blue-600 font-medium">{itemNumber}</td>
                  <td className="py-2 px-3 text-xs text-gray-700">{item.description}</td>
                  <td className="py-2 px-3 text-xs text-gray-600 text-center">
                    {weldWt ? `${weldWt}mm` : "-"}
                  </td>
                  {hasAreas && (
                    <>
                      <td className="py-2 px-3 text-xs text-gray-600 text-center">
                        {item.areas?.extAreaM2 ? Number(item.areas.extAreaM2).toFixed(2) : "-"}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600 text-center">
                        {item.areas?.intAreaM2 ? Number(item.areas.intAreaM2).toFixed(2) : "-"}
                      </td>
                    </>
                  )}
                  <td className="py-2 px-3 text-xs text-gray-900 text-center font-medium">
                    {item.qty}
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-600 text-right">
                    {weightPerItem.toFixed(2)} kg
                  </td>
                  <td className="py-2 px-3 text-xs text-green-700 text-right font-semibold">
                    {lineWeight.toFixed(2)} kg
                  </td>
                </tr>
              );
            })}
            <tr className="bg-blue-100 border-t-2 border-blue-300 font-semibold">
              <td className="py-2 px-3 text-xs text-blue-800" colSpan={2}>
                TOTAL
              </td>
              <td className="py-2 px-3 text-xs text-blue-800 text-center">-</td>
              {hasAreas && (
                <>
                  <td className="py-2 px-3 text-xs text-blue-800 text-center">
                    {sectionTotals.extArea > 0 ? sectionTotals.extArea.toFixed(2) : "-"}
                  </td>
                  <td className="py-2 px-3 text-xs text-blue-800 text-center">
                    {sectionTotals.intArea > 0 ? sectionTotals.intArea.toFixed(2) : "-"}
                  </td>
                </>
              )}
              <td className="py-2 px-3 text-xs text-blue-800 text-center">{sectionTotals.qty}</td>
              <td className="py-2 px-3 text-xs text-blue-800 text-right">-</td>
              <td className="py-2 px-3 text-xs text-green-700 text-right">
                {sectionTotals.weight.toFixed(2)} kg
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RfqItemsDetailedViewProps {
  items: RfqItemDetail[];
  sections?: BoqSection[];
  currencyCode: string;
  pricingInputs: PricingInputs;
  unitPrices: Record<string, Record<number, number>>;
}

function RfqItemsDetailedView(props: RfqItemsDetailedViewProps) {
  const items = props.items;
  const sections = props.sections;
  const currencyCode = props.currencyCode;
  const pricingInputs = props.pricingInputs;
  const unitPrices = props.unitPrices;

  const { data: nbToOdMap = {} } = useNbToOdMap();
  const { data: allWeights = [] } = useAllFlangeTypeWeights();

  const currency = currencyByCode(currencyCode);
  const symbolFromCurrency = currency?.symbol;
  const currencySymbol = symbolFromCurrency ? symbolFromCurrency : currencyCode;
  const totalWeight = items.reduce(
    (sum, item) =>
      sum +
      Number(
        (() => {
          const rawTotalWeightKg = item.totalWeightKg;
          return rawTotalWeightKg || 0;
        })(),
      ),
    0,
  );

  const accessoryBoltsPrice = pricingInputs.bnwTypes["bolts"];
  const accessoryNutsPrice = pricingInputs.bnwTypes["nuts"];
  const accessoryWashersPrice = pricingInputs.bnwTypes["washers"];
  const accessoryBlankFlangePrice = pricingInputs.flangeTypes["blank"];

  const accessorySectionOrder = ["bnw_sets", "gaskets"];
  const accessorySections =
    sections
      ?.filter((s) => accessorySectionOrder.includes(s.sectionType))
      .sort(
        (a, b) =>
          accessorySectionOrder.indexOf(a.sectionType) -
          accessorySectionOrder.indexOf(b.sectionType),
      ) || [];

  const accessoryWeight = accessorySections.reduce(
    (sum, s) =>
      sum +
      Number(
        (() => {
          const rawTotalWeightKg = s.totalWeightKg;
          return rawTotalWeightKg || 0;
        })(),
      ),
    0,
  );

  const itemTypeColors: Record<string, { bg: string; badge: string; badgeText: string }> = {
    straight_pipe: { bg: "bg-blue-50", badge: "bg-blue-200", badgeText: "text-blue-800" },
    bend: { bg: "bg-purple-50", badge: "bg-purple-200", badgeText: "text-purple-800" },
    fitting: { bg: "bg-green-50", badge: "bg-green-200", badgeText: "text-green-800" },
  };

  const formatItemType = (type: string) => {
    const labels: Record<string, string> = {
      straight_pipe: "Pipe",
      bend: "Bend",
      fitting: "Fitting",
    };
    const label = labels[type];
    return label ? label : type;
  };

  const formatScheduleDisplay = (scheduleNumber?: string, wallThicknessMm?: number): string => {
    if (!scheduleNumber && !wallThicknessMm) return "-";
    if (scheduleNumber?.startsWith("WT") || scheduleNumber?.includes("719")) {
      const wt = Number(wallThicknessMm) || parseFloat(scheduleNumber.replace(/[^0-9.]/g, ""));
      return wt && !Number.isNaN(wt) ? `${wt.toFixed(2)}mm W/T` : scheduleNumber || "-";
    }
    return (
      scheduleNumber || (wallThicknessMm ? `${Number(wallThicknessMm).toFixed(2)}mm W/T` : "-")
    );
  };

  const roundToNearestWeldThickness = (wt: number): number => {
    return Math.round(wt / 1.5) * 1.5;
  };

  const calculateWeldLinearMeterage = (item: RfqItemDetail): WeldBreakdown | null => {
    const TACK_WELD_LENGTH_MM = 20;
    const TACK_WELDS_PER_LOOSE_FLANGE = 8;

    const looseFlangeCountFromConfig = (endConfig: string): number => {
      if (endConfig === "2xLF") return 2;
      if (endConfig === "FOE_LF" || endConfig === "F2E_LF") return 1;
      return 0;
    };

    if (item.straightPipeDetails) {
      const details = item.straightPipeDetails;
      const endConfig = (() => {
        const rawPipeEndConfiguration = details.pipeEndConfiguration;
        return rawPipeEndConfiguration || "PE";
      })();
      const wt = Number(details.wallThicknessMm) || 6;
      const nb = Number(details.nominalBoreMm) || 0;
      const odLookup = nbToOdMap[nb];
      const od = odLookup ? odLookup : nb * 1.05;
      const circumferenceMm = Math.PI * od;

      let flangeWeldMeters = 0;
      if (details.totalFlangeWeldLengthM) {
        flangeWeldMeters = Number(details.totalFlangeWeldLengthM);
      } else if (details.numberOfFlangeWelds) {
        flangeWeldMeters = (Number(details.numberOfFlangeWelds) * 2 * circumferenceMm) / 1000;
      } else if (endConfig && endConfig !== "PE") {
        const flangeConnections = weldCountPerPipe(endConfig);
        flangeWeldMeters = (flangeConnections * 2 * circumferenceMm) / 1000;
      }

      let buttWeldMeters = 0;
      if (details.totalButtWeldLengthM) {
        buttWeldMeters = Number(details.totalButtWeldLengthM);
      } else if (details.numberOfButtWelds) {
        buttWeldMeters = (Number(details.numberOfButtWelds) * circumferenceMm) / 1000;
      }

      const looseFlangeCount = looseFlangeCountFromConfig(endConfig);
      const tackWeldMeters =
        (looseFlangeCount * TACK_WELDS_PER_LOOSE_FLANGE * TACK_WELD_LENGTH_MM) / 1000;

      const totalLinearMeters = flangeWeldMeters + buttWeldMeters + tackWeldMeters;
      if (totalLinearMeters === 0 || Number.isNaN(totalLinearMeters)) return null;

      return {
        flangeWeldMeters,
        buttWeldMeters,
        mitreWeldMeters: 0,
        teeWeldMeters: 0,
        tackWeldMeters,
        totalLinearMeters,
        wallThicknessMm: wt,
      };
    }

    if (item.bendDetails) {
      const details = item.bendDetails;
      const endConfig = (() => {
        const rawBendEndConfiguration = details.bendEndConfiguration;
        return rawBendEndConfiguration || "PE";
      })();
      const wt = Number(details.wallThicknessMm) || 6;
      const nb = Number(details.nominalBoreMm) || 0;
      const odLookup = nbToOdMap[nb];
      const od = odLookup ? odLookup : nb * 1.05;
      const circumferenceMm = Math.PI * od;
      const calcData = details.calculationData;

      let flangeWeldMeters = 0;
      if (details.totalFlangeWeldLengthM) {
        flangeWeldMeters = Number(details.totalFlangeWeldLengthM);
      } else if (details.numberOfFlangeWelds) {
        flangeWeldMeters = (Number(details.numberOfFlangeWelds) * 2 * circumferenceMm) / 1000;
      } else if (endConfig && endConfig !== "PE") {
        const flangeConnections = weldCountPerBend(endConfig);
        flangeWeldMeters = (flangeConnections * 2 * circumferenceMm) / 1000;
      }

      let buttWeldMeters = 0;
      if (details.totalButtWeldLengthM) {
        buttWeldMeters = Number(details.totalButtWeldLengthM);
      } else if (details.numberOfButtWelds) {
        buttWeldMeters = (Number(details.numberOfButtWelds) * circumferenceMm) / 1000;
      } else if (calcData?.numberOfButtWelds) {
        buttWeldMeters = (Number(calcData.numberOfButtWelds) * circumferenceMm) / 1000;
      } else if (calcData?.tangentButtWelds) {
        buttWeldMeters = (Number(calcData.tangentButtWelds) * circumferenceMm) / 1000;
      } else if (details.numberOfTangents && details.numberOfTangents > 0) {
        buttWeldMeters = (Number(details.numberOfTangents) * circumferenceMm) / 1000;
      }

      let mitreWeldMeters = 0;
      if (calcData?.mitreWeldLengthM) {
        mitreWeldMeters = Number(calcData.mitreWeldLengthM);
      } else if (calcData?.numberOfMitreWelds) {
        mitreWeldMeters = (Number(calcData.numberOfMitreWelds) * circumferenceMm) / 1000;
      } else if (calcData?.numberOfSegments && Number(calcData.numberOfSegments) > 1) {
        mitreWeldMeters = ((Number(calcData.numberOfSegments) - 1) * circumferenceMm) / 1000;
      }

      let teeWeldMeters = 0;
      const rawStubs = calcData?.stubs;
      const stubs = rawStubs ? rawStubs : [];
      if (isArray(stubs) && stubs.length > 0) {
        stubs.forEach((stub: { nominalBoreMm?: number }) => {
          const stubNb = Number(stub.nominalBoreMm) || nb;
          const stubOdLookup = nbToOdMap[stubNb];
          const stubOd = stubOdLookup ? stubOdLookup : stubNb * 1.05;
          const stubCirc = Math.PI * stubOd;
          teeWeldMeters += stubCirc / 1000;
        });
      } else if (calcData?.numberOfStubs && Number(calcData.numberOfStubs) > 0) {
        const stubNb = Number(calcData.stubNominalBoreMm) || nb;
        const stubOdLookup = nbToOdMap[stubNb];
        const stubOd = stubOdLookup ? stubOdLookup : stubNb * 1.05;
        const stubCirc = Math.PI * stubOd;
        teeWeldMeters = (Number(calcData.numberOfStubs) * stubCirc) / 1000;
      }

      if (stubs.length > 0) {
        stubs.forEach((stub: { flangeSpec?: string; nominalBoreMm?: number }) => {
          if (stub.flangeSpec && stub.flangeSpec !== "PE" && stub.flangeSpec !== "") {
            const stubNb = Number(stub.nominalBoreMm) || nb;
            const stubOdLookup = nbToOdMap[stubNb];
            const stubOd = stubOdLookup ? stubOdLookup : stubNb * 1.05;
            const stubCirc = Math.PI * stubOd;
            flangeWeldMeters += (2 * stubCirc) / 1000;
          }
        });
      }

      const looseFlangeCount = looseFlangeCountFromConfig(endConfig);
      const tackWeldMeters =
        (looseFlangeCount * TACK_WELDS_PER_LOOSE_FLANGE * TACK_WELD_LENGTH_MM) / 1000;

      const totalLinearMeters =
        flangeWeldMeters + buttWeldMeters + mitreWeldMeters + teeWeldMeters + tackWeldMeters;
      if (totalLinearMeters === 0 || Number.isNaN(totalLinearMeters)) return null;

      return {
        flangeWeldMeters,
        buttWeldMeters,
        mitreWeldMeters,
        teeWeldMeters,
        tackWeldMeters,
        totalLinearMeters,
        wallThicknessMm: wt,
      };
    }

    if (item.fittingDetails) {
      const details = item.fittingDetails;
      const endConfig = (() => {
        const rawPipeEndConfiguration = details.pipeEndConfiguration;
        return rawPipeEndConfiguration || "PE";
      })();
      const wt = Number(details.wallThicknessMm) || 6;
      const mainNb = Number(details.nominalDiameterMm) || 0;
      const branchNb = Number(details.branchNominalDiameterMm) || mainNb;
      const mainOdLookup = nbToOdMap[mainNb];
      const branchOdLookup = nbToOdMap[branchNb];
      const mainOd = mainOdLookup ? mainOdLookup : mainNb * 1.05;
      const branchOd = branchOdLookup ? branchOdLookup : branchNb * 1.05;
      const mainCirc = Math.PI * mainOd;
      const branchCirc = Math.PI * branchOd;

      let flangeWeldMeters = 0;
      const flangeConnections = weldCountPerFitting(endConfig);
      if (
        (() => {
          const rawNumberOfFlangeWelds = details.numberOfFlangeWelds;
          return rawNumberOfFlangeWelds || (endConfig && endConfig !== "PE");
        })()
      ) {
        if (flangeConnections >= 3) {
          flangeWeldMeters = (2 * mainCirc * 2 + branchCirc * 2) / 1000;
        } else if (flangeConnections === 2) {
          flangeWeldMeters = (2 * mainCirc * 2) / 1000;
        } else if (flangeConnections === 1) {
          flangeWeldMeters = (mainCirc * 2) / 1000;
        }
      }

      let teeWeldMeters = 0;
      if (details.numberOfTeeWelds) {
        teeWeldMeters = (Number(details.numberOfTeeWelds) * branchCirc) / 1000;
      } else {
        const calcData = details.calculationData;
        if (calcData?.teeWeldLengthM) {
          teeWeldMeters = Number(calcData.teeWeldLengthM);
        }
      }

      const looseFlangeCount = looseFlangeCountFromConfig(endConfig);
      const tackWeldMeters =
        (looseFlangeCount * TACK_WELDS_PER_LOOSE_FLANGE * TACK_WELD_LENGTH_MM) / 1000;

      const totalLinearMeters = flangeWeldMeters + teeWeldMeters + tackWeldMeters;
      if (totalLinearMeters === 0 || Number.isNaN(totalLinearMeters)) return null;

      return {
        flangeWeldMeters,
        buttWeldMeters: 0,
        mitreWeldMeters: 0,
        teeWeldMeters,
        tackWeldMeters,
        totalLinearMeters,
        wallThicknessMm: wt,
      };
    }

    return null;
  };

  const calculateItemUnitPrice = (item: RfqItemDetail): number => {
    const weightPerUnit = Number(
      (() => {
        const rawWeightPerUnitKg = item.weightPerUnitKg;
        return rawWeightPerUnitKg || 0;
      })(),
    );

    const straightSpec = item.straightPipeDetails?.pipeStandard;
    const bendSpec = item.bendDetails?.pipeStandard;
    const fittingSpec = item.fittingDetails?.fittingStandard;
    const itemSteelSpec = straightSpec
      ? straightSpec
      : bendSpec
        ? bendSpec
        : fittingSpec
          ? fittingSpec
          : "";
    const normalizedSpec = normalizeSteelSpec(itemSteelSpec);
    const specSteelPrice = pricingInputs.steelSpecs[normalizedSpec];
    const firstSteelPriceLocal = values(pricingInputs.steelSpecs)[0];
    const steelPricePerKg = specSteelPrice
      ? specSteelPrice
      : firstSteelPriceLocal
        ? firstSteelPriceLocal
        : 0;

    const steelPrice = weightPerUnit * steelPricePerKg;
    let flangePrice = 0;
    let weldPrice = 0;

    const details = (() => {
      const rawStraightPipeDetails = item.straightPipeDetails;
      const rawBendDetails = item.bendDetails;
      const rawFittingDetails = item.fittingDetails;
      return rawStraightPipeDetails || rawBendDetails || rawFittingDetails;
    })();
    if (details) {
      const straightEnd = item.straightPipeDetails?.pipeEndConfiguration;
      const bendEnd = item.bendDetails?.bendEndConfiguration;
      const fittingEnd = item.fittingDetails?.pipeEndConfiguration;
      const endConfig = straightEnd ? straightEnd : bendEnd ? bendEnd : fittingEnd;

      if (endConfig && endConfig !== "PE") {
        const straightNb = item.straightPipeDetails?.nominalBoreMm;
        const bendNb = item.bendDetails?.nominalBoreMm;
        const fittingNb = item.fittingDetails?.nominalDiameterMm;
        const nb = straightNb ? straightNb : bendNb ? bendNb : fittingNb ? fittingNb : 0;
        const flangeCount = flangeCountFromConfig(endConfig, item.itemType);
        const flangeStandard = (() => {
          const rawFlangeStandardCode = item.flangeStandardCode;
          return rawFlangeStandardCode || "SANS 1123";
        })();
        const pressureClass = (() => {
          const rawFlangePressureClassDesignation = item.flangePressureClassDesignation;
          return rawFlangePressureClassDesignation || "1000/3";
        })();
        const flangeWeightPerUnit =
          flangeCount * flangeWeightLookup(allWeights, nb, pressureClass, flangeStandard, "3");

        const rotatingRate = pricingInputs.flangeTypes["rotating"];
        const slipOnRate = pricingInputs.flangeTypes["slipOn"];
        if (isRotatingFlange(endConfig)) {
          flangePrice = flangeWeightPerUnit * (rotatingRate ? rotatingRate : 0);
        } else {
          flangePrice = flangeWeightPerUnit * (slipOnRate ? slipOnRate : 0);
        }
      }

      if (item.fittingDetails?.addBlankFlange && item.fittingDetails.blankFlangeCount) {
        const blankNb = (() => {
          const rawNominalDiameterMm = item.fittingDetails.nominalDiameterMm;
          return rawNominalDiameterMm || 0;
        })();
        const flangeStandard = (() => {
          const rawFlangeStandardCode = item.flangeStandardCode;
          return rawFlangeStandardCode || "SANS 1123";
        })();
        const pressureClass = (() => {
          const rawFlangePressureClassDesignation = item.flangePressureClassDesignation;
          return rawFlangePressureClassDesignation || "1000/3";
        })();
        const isSans = flangeStandard.toUpperCase().includes("SANS");
        const singleBlankWt = isSans
          ? sansBlankFlangeWeightLookup(allWeights, blankNb, pressureClass)
          : blankFlangeWeightLookup(allWeights, blankNb, pressureClass);
        const blankWt = singleBlankWt * item.fittingDetails.blankFlangeCount;
        const blankRate = pricingInputs.flangeTypes["blank"];
        flangePrice += blankWt * (blankRate ? blankRate : 0);
      }

      const weldInfo = calculateWeldLinearMeterage(item);
      if (weldInfo) {
        const flangeWeldRaw = pricingInputs.weldTypes["flangeWeld"];
        const mitreWeldRaw = pricingInputs.weldTypes["mitreWeld"];
        const teeWeldRaw = pricingInputs.weldTypes["teeWeld"];
        const tackWeldRaw = pricingInputs.weldTypes["tackWeld"];
        const flangeWeldRate = flangeWeldRaw ? flangeWeldRaw : 0;
        const mitreWeldRate = mitreWeldRaw ? mitreWeldRaw : 0;
        const teeWeldRate = teeWeldRaw ? teeWeldRaw : 0;
        const tackWeldRate = tackWeldRaw ? tackWeldRaw : 0;
        const weldRate = flangeWeldRate || mitreWeldRate || teeWeldRate || tackWeldRate;
        weldPrice = Number(weldInfo.totalLinearMeters) * weldRate;
      }
    }

    const subtotal = steelPrice + flangePrice + weldPrice;
    const labourExtras = subtotal * (pricingInputs.labourExtrasPercent / 100);

    return subtotal + labourExtras;
  };

  const calculateItemLineTotal = (item: RfqItemDetail): number => {
    const unitPrice = calculateItemUnitPrice(item);
    const qty = (() => {
      const rawQuantity = item.quantity;
      return rawQuantity || 1;
    })();
    return unitPrice * qty;
  };

  const itemsSubtotal = items.reduce((sum, item) => sum + calculateItemLineTotal(item), 0);

  return (
    <div className="space-y-6">
      {/* Items List */}
      <div className="space-y-2">
        {items.map((item, index) => {
          const itemTypeColor = itemTypeColors[item.itemType];
          const colors = itemTypeColor ? itemTypeColor : itemTypeColors.straight_pipe;
          const details = (() => {
            const rawStraightPipeDetails = item.straightPipeDetails;
            const rawBendDetails = item.bendDetails;
            const rawFittingDetails = item.fittingDetails;
            return rawStraightPipeDetails || rawBendDetails || rawFittingDetails;
          })();
          const unitPrice = calculateItemUnitPrice(item);
          const lineTotal = calculateItemLineTotal(item);
          const qty = (() => {
            const rawQuantity = item.quantity;
            return rawQuantity || 1;
          })();

          return (
            <div key={item.id} className={`border border-gray-200 rounded-lg p-3 ${colors.bg}`}>
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded ${colors.badge} ${colors.badgeText}`}
                  >
                    {formatItemType(item.itemType)}
                  </span>
                  <h4 className="font-medium text-gray-800 text-sm">
                    Item #{(() => {
                      const rawLineNumber = item.lineNumber;
                      return rawLineNumber || index + 1;
                    })()}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-700">
                    {Number(
                      (() => {
                        const rawTotalWeightKg = item.totalWeightKg;
                        return rawTotalWeightKg || 0;
                      })(),
                    ).toFixed(2)}{" "}
                    kg
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-700 mb-2 font-medium">{item.description}</p>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-x-3 gap-y-1 text-xs">
                {item.straightPipeDetails && (
                  <>
                    <div>
                      <span className="text-gray-500">NB:</span>{" "}
                      <span className="font-medium">
                        {Math.round(Number(item.straightPipeDetails.nominalBoreMm))}mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Wall Thickness:</span>{" "}
                      <span className="font-medium">
                        {formatScheduleDisplay(
                          item.straightPipeDetails.scheduleNumber,
                          item.straightPipeDetails.wallThicknessMm,
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Length:</span>{" "}
                      <span className="font-medium">
                        {item.straightPipeDetails.individualPipeLength
                          ? Number(item.straightPipeDetails.individualPipeLength).toFixed(3)
                          : item.straightPipeDetails.totalLength
                            ? Number(item.straightPipeDetails.totalLength).toFixed(3)
                            : "-"}
                        m
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Qty:</span>{" "}
                      <span className="font-medium">
                        {(() => {
                          const rawQuantity = item.quantity;
                          const rawQuantityValue = item.straightPipeDetails.quantityValue;
                          return rawQuantity || rawQuantityValue || 1;
                        })()}
                      </span>
                    </div>
                    {item.straightPipeDetails.pipeEndConfiguration &&
                      item.straightPipeDetails.pipeEndConfiguration !== "PE" && (
                        <div>
                          <span className="text-gray-500">End Config:</span>{" "}
                          <span className="font-medium text-blue-600">
                            {item.straightPipeDetails.pipeEndConfiguration}
                          </span>
                        </div>
                      )}
                    <div>
                      <span className="text-gray-500">Weight/Unit:</span>{" "}
                      <span className="font-medium">
                        {Number(
                          (() => {
                            const rawWeightPerUnitKg = item.weightPerUnitKg;
                            return rawWeightPerUnitKg || 0;
                          })(),
                        ).toFixed(2)}{" "}
                        kg
                      </span>
                    </div>
                    {item.straightPipeDetails.pipeEndConfiguration &&
                      item.straightPipeDetails.pipeEndConfiguration !== "PE" &&
                      (() => {
                        const nb = Math.round(Number(item.straightPipeDetails.nominalBoreMm));
                        const itemQty = (() => {
                          const rawQuantity = item.quantity;
                          const rawQuantityValue = item.straightPipeDetails.quantityValue;
                          return rawQuantity || rawQuantityValue || 1;
                        })();
                        const flangeCount = flangeCountFromConfig(
                          item.straightPipeDetails.pipeEndConfiguration,
                          "straight_pipe",
                        );
                        const totalFlanges = flangeCount * itemQty;
                        const flangeStandard = (() => {
                          const rawFlangeStandardCode = item.flangeStandardCode;
                          return rawFlangeStandardCode || "SANS 1123";
                        })();
                        const pressureClass = (() => {
                          const rawFlangePressureClassDesignation =
                            item.flangePressureClassDesignation;
                          return rawFlangePressureClassDesignation || "1000/3";
                        })();
                        const singleFlangeWt = flangeWeightLookup(
                          allWeights,
                          nb,
                          pressureClass,
                          flangeStandard,
                          "3",
                        );
                        const totalFlangeWt = singleFlangeWt * totalFlanges;
                        return totalFlanges > 0 ? (
                          <div className="col-span-2">
                            <span className="text-gray-500">Flanges:</span>{" "}
                            <span className="font-medium">
                              {totalFlanges}x {nb}NB {flangeStandard} {pressureClass} ={" "}
                              {totalFlangeWt.toFixed(2)} kg
                            </span>
                            <span className="text-gray-500 text-xs ml-2">
                              ({singleFlangeWt.toFixed(2)} kg each)
                            </span>
                          </div>
                        ) : null;
                      })()}
                    {(() => {
                      const weldInfo = calculateWeldLinearMeterage(item);
                      if (!weldInfo) return null;
                      const parts: string[] = [];
                      if (Number(weldInfo.flangeWeldMeters) > 0)
                        parts.push(`Flange: ${Number(weldInfo.flangeWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.buttWeldMeters) > 0)
                        parts.push(`Butt: ${Number(weldInfo.buttWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.tackWeldMeters) > 0)
                        parts.push(`Tack: ${Number(weldInfo.tackWeldMeters).toFixed(2)}m`);
                      return (
                        <div className="col-span-2">
                          <span className="text-gray-500">Weld L/m:</span>{" "}
                          <span className="font-medium text-purple-600">
                            {parts.join(" + ")} = {Number(weldInfo.totalLinearMeters).toFixed(2)}m (
                            {roundToNearestWeldThickness(Number(weldInfo.wallThicknessMm)).toFixed(
                              1,
                            )}
                            mm WT)
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}

                {item.bendDetails && (
                  <>
                    <div>
                      <span className="text-gray-500">NB:</span>{" "}
                      <span className="font-medium">
                        {Math.round(Number(item.bendDetails.nominalBoreMm))}mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Wall Thickness:</span>{" "}
                      <span className="font-medium">
                        {formatScheduleDisplay(
                          item.bendDetails.scheduleNumber,
                          item.bendDetails.wallThicknessMm,
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Angle:</span>{" "}
                      <span className="font-medium">{item.bendDetails.bendDegrees}°</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>{" "}
                      <span className="font-medium">
                        {item.bendDetails.bendRadiusType
                          ? `${item.bendDetails.bendRadiusType.charAt(0).toUpperCase() + item.bendDetails.bendRadiusType.slice(1)} Radius`
                          : (() => {
                              const rawBendType = item.bendDetails.bendType;
                              return rawBendType || "1.5D";
                            })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Qty:</span>{" "}
                      <span className="font-medium">
                        {(() => {
                          const rawQuantity = item.quantity;
                          return rawQuantity || 1;
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Weight/Unit:</span>{" "}
                      <span className="font-medium">
                        {Number(
                          (() => {
                            const rawWeightPerUnitKg = item.weightPerUnitKg;
                            return rawWeightPerUnitKg || 0;
                          })(),
                        ).toFixed(2)}{" "}
                        kg
                      </span>
                    </div>
                    {(() => {
                      const weldInfo = calculateWeldLinearMeterage(item);
                      if (!weldInfo) return null;
                      const parts: string[] = [];
                      if (Number(weldInfo.flangeWeldMeters) > 0)
                        parts.push(`Flange: ${Number(weldInfo.flangeWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.buttWeldMeters) > 0)
                        parts.push(`Butt: ${Number(weldInfo.buttWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.mitreWeldMeters) > 0)
                        parts.push(`Mitre: ${Number(weldInfo.mitreWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.teeWeldMeters) > 0)
                        parts.push(`Tee: ${Number(weldInfo.teeWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.tackWeldMeters) > 0)
                        parts.push(`Tack: ${Number(weldInfo.tackWeldMeters).toFixed(2)}m`);
                      return (
                        <div className="col-span-2">
                          <span className="text-gray-500">Weld L/m:</span>{" "}
                          <span className="font-medium text-purple-600">
                            {parts.join(" + ")} = {Number(weldInfo.totalLinearMeters).toFixed(2)}m (
                            {roundToNearestWeldThickness(Number(weldInfo.wallThicknessMm)).toFixed(
                              1,
                            )}
                            mm WT)
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}

                {item.fittingDetails && (
                  <>
                    <div>
                      <span className="text-gray-500">NB:</span>{" "}
                      <span className="font-medium">
                        {Math.round(Number(item.fittingDetails.nominalDiameterMm))}mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Wall Thickness:</span>{" "}
                      <span className="font-medium">
                        {formatScheduleDisplay(
                          item.fittingDetails.scheduleNumber,
                          item.fittingDetails.wallThicknessMm,
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>{" "}
                      <span className="font-medium">
                        {(() => {
                          const rawFittingType = item.fittingDetails.fittingType;
                          return rawFittingType || "Tee";
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Qty:</span>{" "}
                      <span className="font-medium">
                        {(() => {
                          const rawQuantity = item.quantity;
                          return rawQuantity || 1;
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Weight/Unit:</span>{" "}
                      <span className="font-medium">
                        {Number(
                          (() => {
                            const rawWeightPerUnitKg = item.weightPerUnitKg;
                            return rawWeightPerUnitKg || 0;
                          })(),
                        ).toFixed(2)}{" "}
                        kg
                      </span>
                    </div>
                    {(() => {
                      const weldInfo = calculateWeldLinearMeterage(item);
                      if (!weldInfo) return null;
                      const parts: string[] = [];
                      if (Number(weldInfo.flangeWeldMeters) > 0)
                        parts.push(`Flange: ${Number(weldInfo.flangeWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.teeWeldMeters) > 0)
                        parts.push(`Tee: ${Number(weldInfo.teeWeldMeters).toFixed(2)}m`);
                      if (Number(weldInfo.tackWeldMeters) > 0)
                        parts.push(`Tack: ${Number(weldInfo.tackWeldMeters).toFixed(2)}m`);
                      return (
                        <div className="col-span-2">
                          <span className="text-gray-500">Weld L/m:</span>{" "}
                          <span className="font-medium text-purple-600">
                            {parts.join(" + ")} = {Number(weldInfo.totalLinearMeters).toFixed(2)}m (
                            {roundToNearestWeldThickness(Number(weldInfo.wallThicknessMm)).toFixed(
                              1,
                            )}
                            mm WT)
                          </span>
                        </div>
                      );
                    })()}
                  </>
                )}

                {!item.straightPipeDetails && !item.bendDetails && !item.fittingDetails && (
                  <>
                    <div>
                      <span className="text-gray-500">Qty:</span>{" "}
                      <span className="font-medium">
                        {(() => {
                          const rawQuantity = item.quantity;
                          return rawQuantity || 1;
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Weight/Unit:</span>{" "}
                      <span className="font-medium">
                        {Number(
                          (() => {
                            const rawWeightPerUnitKg = item.weightPerUnitKg;
                            return rawWeightPerUnitKg || 0;
                          })(),
                        ).toFixed(2)}{" "}
                        kg
                      </span>
                    </div>
                  </>
                )}
              </div>

              {item.notes && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Notes:</span>{" "}
                  <span className="text-xs text-gray-700">{item.notes}</span>
                </div>
              )}

              {/* Pricing summary */}
              <div className="mt-2 pt-2 border-t border-gray-300">
                <div className="flex justify-end items-center gap-6">
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Unit Value:</span>{" "}
                    <span className="text-sm font-semibold text-gray-800">
                      {currencySymbol} {formatCurrencyZA(unitPrice)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Qty:</span>{" "}
                    <span className="text-sm font-medium text-gray-700">{qty}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Line Total:</span>{" "}
                    <span className="text-sm font-bold text-green-700">
                      {currencySymbol} {formatCurrencyZA(lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accessory Sections */}
      {accessorySections.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Accessories</h3>
          {accessorySections.map((section) => {
            const calculateAccessoryItemPrice = (item: ConsolidatedItem): number => {
              const weight = Number(
                (() => {
                  const rawWeightKg = item.weightKg;
                  return rawWeightKg || 0;
                })(),
              );
              if (section.sectionType === "bnw_sets") {
                const boltWeight = weight * 0.55;
                const nutWeight = weight * 0.3;
                const washerWeight = weight * 0.15;
                return (
                  (accessoryBoltsPrice ? accessoryBoltsPrice : 0) * boltWeight +
                  (accessoryNutsPrice ? accessoryNutsPrice : 0) * nutWeight +
                  (accessoryWashersPrice ? accessoryWashersPrice : 0) * washerWeight
                );
              } else if (section.sectionType === "blank_flanges") {
                return (accessoryBlankFlangePrice ? accessoryBlankFlangePrice : 0) * weight;
              }
              return 0;
            };

            const sectionTotal = section.items.reduce(
              (sum, item) => sum + calculateAccessoryItemPrice(item),
              0,
            );

            return (
              <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-200">
                  <h4 className="font-medium text-amber-800">{section.sectionTitle}</h4>
                </div>
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase w-12">
                          #
                        </th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">
                          Description
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase w-16">
                          Qty
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase w-16">
                          Unit
                        </th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase w-24">
                          Weight
                        </th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase w-28">
                          Line Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, idx) => {
                        const itemTotal = calculateAccessoryItemPrice(item);
                        return (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                            <td className="py-2 px-2 text-gray-900">{item.description}</td>
                            <td className="py-2 px-3 text-gray-900 text-right">{item.qty}</td>
                            <td className="py-2 px-3 text-gray-500">{item.unit}</td>
                            <td className="py-2 px-2 text-gray-900 text-right">
                              {Number(
                                (() => {
                                  const rawWeightKg = item.weightKg;
                                  return rawWeightKg || 0;
                                })(),
                              ).toFixed(2)}{" "}
                              kg
                            </td>
                            <td className="py-2 px-2 text-green-700 text-right font-medium">
                              {currencySymbol} {formatCurrencyZA(itemTotal)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={2} className="py-2 px-2 text-gray-900">
                          TOTAL
                        </td>
                        <td className="py-2 px-3 text-gray-900 text-right">
                          {section.items.reduce(
                            (sum, i) =>
                              sum +
                              (() => {
                                const rawQty = i.qty;
                                return rawQty || 0;
                              })(),
                            0,
                          )}
                        </td>
                        <td className="py-2 px-3"></td>
                        <td className="py-2 px-2 text-gray-900 text-right">
                          {Number(
                            (() => {
                              const rawTotalWeightKg = section.totalWeightKg;
                              return rawTotalWeightKg || 0;
                            })(),
                          ).toFixed(2)}{" "}
                          kg
                        </td>
                        <td className="py-2 px-2 text-green-700 text-right font-bold">
                          {currencySymbol} {formatCurrencyZA(sectionTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Financial Totals */}
      {(() => {
        const accessoriesTotal = accessorySections.reduce((sum, section) => {
          return (
            sum +
            section.items.reduce((itemSum, item) => {
              const weight = Number(
                (() => {
                  const rawWeightKg = item.weightKg;
                  return rawWeightKg || 0;
                })(),
              );
              if (section.sectionType === "bnw_sets") {
                const boltWeight = weight * 0.55;
                const nutWeight = weight * 0.3;
                const washerWeight = weight * 0.15;
                return (
                  itemSum +
                  (accessoryBoltsPrice ? accessoryBoltsPrice : 0) * boltWeight +
                  (accessoryNutsPrice ? accessoryNutsPrice : 0) * nutWeight +
                  (accessoryWashersPrice ? accessoryWashersPrice : 0) * washerWeight
                );
              } else if (section.sectionType === "blank_flanges") {
                return (
                  itemSum + (accessoryBlankFlangePrice ? accessoryBlankFlangePrice : 0) * weight
                );
              }
              return itemSum;
            }, 0)
          );
        }, 0);

        const subtotal = itemsSubtotal + accessoriesTotal;
        const contingenciesAmount = subtotal * (pricingInputs.contingenciesPercent / 100);
        const grandTotalExVat = subtotal + contingenciesAmount;
        const vatRate = vatRateForCurrency(currencyCode);
        const vatAmount = grandTotalExVat * (vatRate / 100);
        const grandTotalIncVat = grandTotalExVat + vatAmount;

        return (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quote Summary</h3>
            <div className="space-y-2 max-w-md ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items Subtotal:</span>
                <span className="font-medium text-gray-900">
                  {currencySymbol} {formatCurrencyZA(itemsSubtotal)}
                </span>
              </div>
              {accessoriesTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Accessories:</span>
                  <span className="font-medium text-gray-900">
                    {currencySymbol} {formatCurrencyZA(accessoriesTotal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">
                  {currencySymbol} {formatCurrencyZA(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Contingencies ({pricingInputs.contingenciesPercent}%):
                </span>
                <span className="font-medium text-gray-900">
                  {currencySymbol} {formatCurrencyZA(contingenciesAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span className="text-gray-700">Grand Total (Ex VAT):</span>
                <span className="text-gray-900">
                  {currencySymbol} {formatCurrencyZA(grandTotalExVat)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT ({vatRate}%):</span>
                <span className="font-medium text-gray-900">
                  {currencySymbol} {formatCurrencyZA(vatAmount)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                <span className="text-gray-800">Grand Total (Inc VAT):</span>
                <span className="text-green-700">
                  {currencySymbol} {formatCurrencyZA(grandTotalIncVat)}
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default RfqItemsDetailedView;
export { RfqSectionTable };
