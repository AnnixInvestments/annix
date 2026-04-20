"use client";

import { toPairs as entries } from "es-toolkit/compat";
import { currencyByCode } from "@/app/lib/currencies";
import { formatCurrencyZA } from "../lib/boq-helpers";
import type { ExtractedSpecs, PricingInputs, WeldTotals } from "../lib/types";

const WELD_TYPE_LABELS: Record<string, string> = {
  flangeWeld: "Flange Weld",
  mitreWeld: "Mitre Weld",
  teeWeld: "Tee Weld",
  gussetTeeWeld: "Gusset Tee Weld",
  latWeld45Plus: "Lat Weld 45+",
  latWeldUnder45: "Lat Weld <45",
  tackWeld: "Tack Weld (Loose Flange)",
};

interface WeldsSectionProps {
  weldTotals: WeldTotals;
  extractedSpecs: ExtractedSpecs;
  pricingInputs: PricingInputs;
  currencyCode: string;
  weldUnitPrices: Record<string, number>;
  onWeldUnitPriceChange: (weldType: string, value: number) => void;
}

function WeldsSection(props: WeldsSectionProps) {
  const weldTotals = props.weldTotals;
  const extractedSpecs = props.extractedSpecs;
  const pricingInputs = props.pricingInputs;
  const currencyCode = props.currencyCode;
  const weldUnitPrices = props.weldUnitPrices;
  const onWeldUnitPriceChange = props.onWeldUnitPriceChange;

  const currency = currencyByCode(currencyCode);
  const symbolFromCurrency = currency?.symbol;
  const currencySymbol = symbolFromCurrency ? symbolFromCurrency : currencyCode;

  const weldTypes = entries(extractedSpecs.weldTypes)
    .filter(([, hasWeld]) => hasWeld)
    .map(([type]) => type);

  if (weldTypes.length === 0) {
    return null;
  }

  const calculateSuggestedPrice = (weldType: string): number => {
    const weldPricing = pricingInputs.weldTypes[weldType];
    const pricePerLm = weldPricing ? weldPricing : 0;
    const labourExtras = pricePerLm * (pricingInputs.labourExtrasPercent / 100);
    return pricePerLm + labourExtras;
  };

  const effectiveUnitPrice = (weldType: string): number => {
    const manualPrice = weldUnitPrices[weldType];
    if (manualPrice !== undefined && manualPrice > 0) {
      return manualPrice;
    }
    return calculateSuggestedPrice(weldType);
  };

  const totalAmount = weldTypes.reduce((sum, weldType) => {
    const quantity = weldTotals[weldType as keyof WeldTotals];
    const unitPrice = effectiveUnitPrice(weldType);
    return sum + quantity * unitPrice;
  }, 0);

  return (
    <div className="mb-8">
      <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
        Welding
        <span className="text-sm font-normal text-gray-500">({weldTypes.length} types)</span>
      </h3>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Weld Type
              </th>
              <th className="w-24 px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Total (Lm)
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {weldTypes.map((weldType, idx) => {
              const quantity = weldTotals[weldType as keyof WeldTotals];
              const suggestedPrice = calculateSuggestedPrice(weldType);
              const manualPrice = weldUnitPrices[weldType];
              const currentUnitPrice = effectiveUnitPrice(weldType);
              const lineTotalValue = quantity * currentUnitPrice;
              const isAutoCalculated =
                (manualPrice === undefined || manualPrice === 0) && suggestedPrice > 0;
              const weldLabel = WELD_TYPE_LABELS[weldType];

              return (
                <tr key={weldType}>
                  <td className="w-12 px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {weldLabel ? weldLabel : weldType}
                  </td>
                  <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                    {quantity.toFixed(3)}
                  </td>
                  <td className="w-16 px-3 py-2 text-sm text-gray-500">Lm</td>
                  <td className="w-32 px-2 py-1">
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 mr-1">{currencySymbol}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualPrice || ""}
                        onChange={(e) =>
                          onWeldUnitPriceChange(weldType, parseFloat(e.target.value) || 0)
                        }
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
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-medium">
              <td className="px-3 py-2 text-sm text-gray-900" colSpan={2}>
                TOTAL
              </td>
              <td className="w-24 px-3 py-2 text-sm text-gray-900 text-right">
                {(
                  weldTotals.flangeWeld +
                  weldTotals.mitreWeld +
                  weldTotals.teeWeld +
                  weldTotals.tackWeld
                ).toFixed(3)}
              </td>
              <td className="w-16 px-3 py-2 text-sm text-gray-500">Lm</td>
              <td className="w-32 px-3 py-2 text-sm text-gray-500"></td>
              <td className="w-32 px-3 py-2 text-sm text-green-700 text-right font-semibold">
                {currencySymbol} {formatCurrencyZA(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WeldsSection;
