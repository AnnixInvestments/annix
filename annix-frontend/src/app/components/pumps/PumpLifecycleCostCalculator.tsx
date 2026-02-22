"use client";

import {
  calculateLifecycleCost,
  LifecycleCostInputs,
  LifecycleCostResult,
} from "@product-data/pumps/pumpComparison";
import { useMemo, useState } from "react";

interface PumpLifecycleCostCalculatorProps {
  initialInputs?: Partial<LifecycleCostInputs>;
  onCalculate?: (result: LifecycleCostResult, inputs: LifecycleCostInputs) => void;
}

function formatCurrency(value: number): string {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;
}

const DEFAULT_INPUTS: LifecycleCostInputs = {
  purchasePrice: 100000,
  installationCost: 15000,
  powerKw: 15,
  efficiency: 75,
  operatingHoursPerYear: 6000,
  electricityRatePerKwh: 2.5,
  maintenanceCostPerYear: 5000,
  expectedLifeYears: 15,
  discountRate: 8,
};

const BREAKDOWN_COLORS: Record<string, string> = {
  "Purchase & Installation": "bg-blue-500",
  Energy: "bg-orange-500",
  Maintenance: "bg-green-500",
};

export function PumpLifecycleCostCalculator({
  initialInputs,
  onCalculate,
}: PumpLifecycleCostCalculatorProps) {
  const [inputs, setInputs] = useState<LifecycleCostInputs>({
    ...DEFAULT_INPUTS,
    ...initialInputs,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const result = useMemo<LifecycleCostResult>(() => {
    return calculateLifecycleCost(inputs);
  }, [inputs]);

  const updateInput = <K extends keyof LifecycleCostInputs>(
    key: K,
    value: LifecycleCostInputs[K],
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleCalculate = () => {
    if (onCalculate) {
      onCalculate(result, inputs);
    }
  };

  const yearlyBreakdown = useMemo(() => {
    const years: { year: number; energy: number; maintenance: number; cumulative: number }[] = [];
    let cumulative = inputs.purchasePrice + inputs.installationCost;

    const actualPowerKw =
      inputs.efficiency > 0 ? inputs.powerKw / (inputs.efficiency / 100) : inputs.powerKw;
    const annualEnergyKwh = actualPowerKw * inputs.operatingHoursPerYear;
    const annualEnergyCost = annualEnergyKwh * inputs.electricityRatePerKwh;

    Array.from({ length: Math.min(inputs.expectedLifeYears, 20) }).forEach((_, idx) => {
      cumulative += annualEnergyCost + inputs.maintenanceCostPerYear;
      years.push({
        year: idx + 1,
        energy: annualEnergyCost,
        maintenance: inputs.maintenanceCostPerYear,
        cumulative,
      });
    });

    return years;
  }, [inputs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center mb-4">
            <svg
              className="w-5 h-5 text-blue-500 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Purchase Costs</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Price (R)
              </label>
              <input
                type="number"
                value={inputs.purchasePrice}
                onChange={(e) => updateInput("purchasePrice", parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Installation Cost (R)
              </label>
              <input
                type="number"
                value={inputs.installationCost}
                onChange={(e) => updateInput("installationCost", parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center mb-4">
            <svg
              className="w-5 h-5 text-orange-500 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Energy Costs</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motor Power (kW)
              </label>
              <input
                type="number"
                value={inputs.powerKw}
                onChange={(e) => updateInput("powerKw", parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pump Efficiency (%)
              </label>
              <input
                type="number"
                value={inputs.efficiency}
                onChange={(e) => updateInput("efficiency", parseFloat(e.target.value) || 70)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                min={1}
                max={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operating Hours/Year
              </label>
              <input
                type="number"
                value={inputs.operatingHoursPerYear}
                onChange={(e) =>
                  updateInput("operatingHoursPerYear", parseFloat(e.target.value) || 0)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">24/7 = 8760 hrs, 8hr shifts = 2920 hrs</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Electricity Rate (R/kWh)
              </label>
              <input
                type="number"
                value={inputs.electricityRatePerKwh}
                onChange={(e) =>
                  updateInput("electricityRatePerKwh", parseFloat(e.target.value) || 0)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                step={0.01}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Operating Costs</h3>
            </div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showAdvanced ? "Hide" : "Show"} Advanced
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Cost/Year (R)
              </label>
              <input
                type="number"
                value={inputs.maintenanceCostPerYear}
                onChange={(e) =>
                  updateInput("maintenanceCostPerYear", parseFloat(e.target.value) || 0)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Life (Years)
              </label>
              <input
                type="number"
                value={inputs.expectedLifeYears}
                onChange={(e) =>
                  updateInput("expectedLifeYears", parseInt(e.target.value, 10) || 10)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                min={1}
                max={30}
              />
            </div>

            {showAdvanced && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Rate (%)
                </label>
                <input
                  type="number"
                  value={inputs.discountRate}
                  onChange={(e) => updateInput("discountRate", parseFloat(e.target.value) || 8)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  step={0.5}
                />
                <p className="text-xs text-gray-500 mt-1">For NPV calculation (typical 6-10%)</p>
              </div>
            )}
          </div>
        </div>

        {onCalculate && (
          <button
            onClick={handleCalculate}
            className="w-full px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
          >
            Use These Costs
          </button>
        )}
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(result.totalLifecycleCost)}
            </div>
            <div className="text-sm text-blue-600">Total Lifecycle Cost</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(result.npvLifecycleCost)}
            </div>
            <div className="text-sm text-green-600">NPV Lifecycle Cost</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-700">
              {formatCurrency(result.annualEnergyCost)}
            </div>
            <div className="text-sm text-orange-600">Annual Energy Cost</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(result.costPerOperatingHour)}
            </div>
            <div className="text-sm text-purple-600">Cost per Op. Hour</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
          <div className="space-y-4">
            {result.breakdown.map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.category}</span>
                  <span className="text-sm text-gray-600">
                    {formatCurrency(item.cost)} ({item.percent.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${BREAKDOWN_COLORS[item.category] || "bg-gray-500"}`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Energy as % of Total:</span>
              <span
                className={`font-bold ${result.energyCostPercent > 50 ? "text-red-600" : "text-gray-900"}`}
              >
                {result.energyCostPercent.toFixed(1)}%
              </span>
            </div>
            {result.energyCostPercent > 50 && (
              <p className="text-xs text-red-600 mt-1">
                Energy costs dominate - consider higher efficiency pump
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cumulative Cost Over Time</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Year</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-700">Energy</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-700">Maintenance</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-700">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2 px-2 font-medium">0</td>
                  <td className="text-right py-2 px-2">-</td>
                  <td className="text-right py-2 px-2">-</td>
                  <td className="text-right py-2 px-2 font-medium">
                    {formatCurrency(result.totalPurchaseCost)}
                  </td>
                </tr>
                {yearlyBreakdown.slice(0, 10).map((year) => (
                  <tr key={year.year} className="border-b border-gray-100">
                    <td className="py-2 px-2 font-medium">{year.year}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(year.energy)}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(year.maintenance)}</td>
                    <td className="text-right py-2 px-2 font-medium">
                      {formatCurrency(year.cumulative)}
                    </td>
                  </tr>
                ))}
                {yearlyBreakdown.length > 10 && (
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td className="py-2 px-2 font-medium" colSpan={3}>
                      ...
                    </td>
                    <td className="text-right py-2 px-2 font-bold text-lg">
                      {formatCurrency(result.totalLifecycleCost)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-blue-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Understanding Lifecycle Cost</h4>
              <p className="mt-1 text-sm text-blue-700">
                The total lifecycle cost includes purchase, installation, energy, and maintenance
                over the pump&apos;s expected life. A higher efficiency pump costs more upfront but
                saves significantly on energy over time. The NPV (Net Present Value) accounts for
                the time value of money using the discount rate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PumpLifecycleCostCalculator;
