'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { currencyByCode, DEFAULT_CURRENCY } from '@/app/lib/currencies';

interface ValveSpecs {
  valveType: string;
  nominalBoreMm: number;
  pressureClass: string;
  actuatorType: 'none' | 'pneumatic' | 'electric' | 'hydraulic';
  actuatorPowerKw?: number;
  cyclesPerDay?: number;
  operatingHoursPerYear?: number;
}

interface CostInputs {
  purchaseCost: number;
  installationCost: number;
  electricityCostPerKwh: number;
  annualMaintenanceCost: number;
  majorOverhaulCost: number;
  overhaulIntervalYears: number;
  downtimeCostPerHour: number;
  expectedDowntimeHoursPerYear: number;
  lifespanYears: number;
  inflationRate: number;
  discountRate: number;
}

interface LifecycleCostResult {
  purchaseCost: number;
  installationCost: number;
  totalEnergyCost: number;
  totalMaintenanceCost: number;
  totalOverhaulCost: number;
  totalDowntimeCost: number;
  totalCostOfOwnership: number;
  netPresentValue: number;
  annualizedCost: number;
  costPerCycle?: number;
  breakdownByYear: YearlyCost[];
}

interface YearlyCost {
  year: number;
  energyCost: number;
  maintenanceCost: number;
  overhaulCost: number;
  downtimeCost: number;
  totalCost: number;
  presentValue: number;
  cumulativeCost: number;
}

const DEFAULT_VALVE_SPECS: ValveSpecs = {
  valveType: 'control_globe',
  nominalBoreMm: 100,
  pressureClass: 'PN16',
  actuatorType: 'pneumatic',
  actuatorPowerKw: 0.5,
  cyclesPerDay: 100,
  operatingHoursPerYear: 8000,
};

const DEFAULT_COST_INPUTS: CostInputs = {
  purchaseCost: 50000,
  installationCost: 15000,
  electricityCostPerKwh: 2.5,
  annualMaintenanceCost: 5000,
  majorOverhaulCost: 25000,
  overhaulIntervalYears: 5,
  downtimeCostPerHour: 10000,
  expectedDowntimeHoursPerYear: 2,
  lifespanYears: 15,
  inflationRate: 5,
  discountRate: 8,
};

const VALVE_TYPE_LABELS: Record<string, string> = {
  control_globe: 'Control Valve (Globe)',
  control_ball: 'Control Valve (Ball)',
  control_butterfly: 'Control Valve (Butterfly)',
  pressure_reducing: 'Pressure Reducing Valve',
  safety_relief: 'Safety Relief Valve',
};

const ACTUATOR_EFFICIENCY: Record<string, number> = {
  none: 0,
  pneumatic: 0.7,
  electric: 0.85,
  hydraulic: 0.75,
};

export default function LifecycleCostCalculator() {
  const [valveSpecs, setValveSpecs] = useState<ValveSpecs>(DEFAULT_VALVE_SPECS);
  const [costInputs, setCostInputs] = useState<CostInputs>(DEFAULT_COST_INPUTS);
  const [currencyCode, setCurrencyCode] = useState<string>(DEFAULT_CURRENCY);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const currency = currencyByCode(currencyCode);
  const currencySymbol = currency?.symbol || currencyCode;

  const formatCurrency = useCallback((value: number): string => {
    return value.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }, []);

  const results = useMemo<LifecycleCostResult>(() => {
    const {
      purchaseCost,
      installationCost,
      electricityCostPerKwh,
      annualMaintenanceCost,
      majorOverhaulCost,
      overhaulIntervalYears,
      downtimeCostPerHour,
      expectedDowntimeHoursPerYear,
      lifespanYears,
      inflationRate,
      discountRate,
    } = costInputs;

    const { actuatorType, actuatorPowerKw, cyclesPerDay, operatingHoursPerYear } = valveSpecs;

    const breakdownByYear: YearlyCost[] = [];
    let cumulativeCost = purchaseCost + installationCost;
    let totalEnergyCost = 0;
    let totalMaintenanceCost = 0;
    let totalOverhaulCost = 0;
    let totalDowntimeCost = 0;
    let totalNpv = purchaseCost + installationCost;

    for (let year = 1; year <= lifespanYears; year++) {
      const inflationMultiplier = Math.pow(1 + inflationRate / 100, year - 1);
      const discountFactor = 1 / Math.pow(1 + discountRate / 100, year);

      let yearlyEnergyCost = 0;
      if (actuatorType === 'electric' && actuatorPowerKw && operatingHoursPerYear) {
        const activeDutyCycle = 0.3;
        yearlyEnergyCost = actuatorPowerKw * operatingHoursPerYear * activeDutyCycle * electricityCostPerKwh * inflationMultiplier;
      } else if (actuatorType === 'pneumatic' && operatingHoursPerYear) {
        const airCompressorCostPerHour = 5;
        yearlyEnergyCost = operatingHoursPerYear * airCompressorCostPerHour * 0.1 * inflationMultiplier;
      }

      const yearlyMaintenanceCost = annualMaintenanceCost * inflationMultiplier;
      const yearlyOverhaulCost = year % overhaulIntervalYears === 0 ? majorOverhaulCost * inflationMultiplier : 0;
      const yearlyDowntimeCost = expectedDowntimeHoursPerYear * downtimeCostPerHour * inflationMultiplier;

      const yearlyTotalCost = yearlyEnergyCost + yearlyMaintenanceCost + yearlyOverhaulCost + yearlyDowntimeCost;
      const yearlyPresentValue = yearlyTotalCost * discountFactor;

      cumulativeCost += yearlyTotalCost;
      totalEnergyCost += yearlyEnergyCost;
      totalMaintenanceCost += yearlyMaintenanceCost;
      totalOverhaulCost += yearlyOverhaulCost;
      totalDowntimeCost += yearlyDowntimeCost;
      totalNpv += yearlyPresentValue;

      breakdownByYear.push({
        year,
        energyCost: yearlyEnergyCost,
        maintenanceCost: yearlyMaintenanceCost,
        overhaulCost: yearlyOverhaulCost,
        downtimeCost: yearlyDowntimeCost,
        totalCost: yearlyTotalCost,
        presentValue: yearlyPresentValue,
        cumulativeCost,
      });
    }

    const totalCostOfOwnership = purchaseCost + installationCost + totalEnergyCost + totalMaintenanceCost + totalOverhaulCost + totalDowntimeCost;
    const annualizedCost = totalCostOfOwnership / lifespanYears;

    const totalCycles = cyclesPerDay && operatingHoursPerYear
      ? cyclesPerDay * (operatingHoursPerYear / 24) * lifespanYears
      : undefined;
    const costPerCycle = totalCycles ? totalCostOfOwnership / totalCycles : undefined;

    return {
      purchaseCost,
      installationCost,
      totalEnergyCost,
      totalMaintenanceCost,
      totalOverhaulCost,
      totalDowntimeCost,
      totalCostOfOwnership,
      netPresentValue: totalNpv,
      annualizedCost,
      costPerCycle,
      breakdownByYear,
    };
  }, [costInputs, valveSpecs]);

  const updateValveSpec = (field: keyof ValveSpecs, value: any) => {
    setValveSpecs(prev => ({ ...prev, [field]: value }));
  };

  const updateCostInput = (field: keyof CostInputs, value: number) => {
    setCostInputs(prev => ({ ...prev, [field]: value }));
  };

  const costBreakdownPercentages = useMemo(() => {
    const total = results.totalCostOfOwnership;
    return {
      purchase: (results.purchaseCost / total) * 100,
      installation: (results.installationCost / total) * 100,
      energy: (results.totalEnergyCost / total) * 100,
      maintenance: (results.totalMaintenanceCost / total) * 100,
      overhaul: (results.totalOverhaulCost / total) * 100,
      downtime: (results.totalDowntimeCost / total) * 100,
    };
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold">Control Valve Lifecycle Cost Calculator</h2>
        <p className="text-indigo-100 mt-1">Calculate the total cost of ownership for control valves over their operational lifespan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-1 space-y-4">
          {/* Valve Specifications */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Valve Specifications
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valve Type</label>
                <select
                  value={valveSpecs.valveType}
                  onChange={(e) => updateValveSpec('valveType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {Object.entries(VALVE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size (NB mm)</label>
                  <input
                    type="number"
                    value={valveSpecs.nominalBoreMm}
                    onChange={(e) => updateValveSpec('nominalBoreMm', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pressure Class</label>
                  <input
                    type="text"
                    value={valveSpecs.pressureClass}
                    onChange={(e) => updateValveSpec('pressureClass', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actuator Type</label>
                <select
                  value={valveSpecs.actuatorType}
                  onChange={(e) => updateValveSpec('actuatorType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="none">Manual (No Actuator)</option>
                  <option value="pneumatic">Pneumatic</option>
                  <option value="electric">Electric</option>
                  <option value="hydraulic">Hydraulic</option>
                </select>
              </div>
              {valveSpecs.actuatorType === 'electric' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actuator Power (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={valveSpecs.actuatorPowerKw || ''}
                    onChange={(e) => updateValveSpec('actuatorPowerKw', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cycles/Day</label>
                  <input
                    type="number"
                    value={valveSpecs.cyclesPerDay || ''}
                    onChange={(e) => updateValveSpec('cyclesPerDay', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hrs/Yr</label>
                  <input
                    type="number"
                    value={valveSpecs.operatingHoursPerYear || ''}
                    onChange={(e) => updateValveSpec('operatingHoursPerYear', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cost Inputs */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cost Inputs ({currencySymbol})
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost</label>
                  <input
                    type="number"
                    value={costInputs.purchaseCost}
                    onChange={(e) => updateCostInput('purchaseCost', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Installation Cost</label>
                  <input
                    type="number"
                    value={costInputs.installationCost}
                    onChange={(e) => updateCostInput('installationCost', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Electricity Cost ({currencySymbol}/kWh)</label>
                <input
                  type="number"
                  step="0.1"
                  value={costInputs.electricityCostPerKwh}
                  onChange={(e) => updateCostInput('electricityCostPerKwh', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Maintenance</label>
                  <input
                    type="number"
                    value={costInputs.annualMaintenanceCost}
                    onChange={(e) => updateCostInput('annualMaintenanceCost', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lifespan (Years)</label>
                  <input
                    type="number"
                    value={costInputs.lifespanYears}
                    onChange={(e) => updateCostInput('lifespanYears', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full text-left text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2"
              >
                <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </button>

              {showAdvanced && (
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Major Overhaul Cost</label>
                      <input
                        type="number"
                        value={costInputs.majorOverhaulCost}
                        onChange={(e) => updateCostInput('majorOverhaulCost', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Overhaul Interval (Yrs)</label>
                      <input
                        type="number"
                        value={costInputs.overhaulIntervalYears}
                        onChange={(e) => updateCostInput('overhaulIntervalYears', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Downtime Cost/Hour</label>
                      <input
                        type="number"
                        value={costInputs.downtimeCostPerHour}
                        onChange={(e) => updateCostInput('downtimeCostPerHour', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Downtime Hours/Year</label>
                      <input
                        type="number"
                        value={costInputs.expectedDowntimeHoursPerYear}
                        onChange={(e) => updateCostInput('expectedDowntimeHoursPerYear', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Inflation Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={costInputs.inflationRate}
                        onChange={(e) => updateCostInput('inflationRate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={costInputs.discountRate}
                        onChange={(e) => updateCostInput('discountRate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-indigo-700">{currencySymbol} {formatCurrency(results.totalCostOfOwnership)}</div>
              <div className="text-sm text-indigo-600">Total Cost of Ownership</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-700">{currencySymbol} {formatCurrency(results.netPresentValue)}</div>
              <div className="text-sm text-purple-600">Net Present Value</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">{currencySymbol} {formatCurrency(results.annualizedCost)}</div>
              <div className="text-sm text-green-600">Annualized Cost</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-amber-700">
                {results.costPerCycle ? `${currencySymbol} ${results.costPerCycle.toFixed(2)}` : 'N/A'}
              </div>
              <div className="text-sm text-amber-600">Cost per Cycle</div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Purchase Cost', value: results.purchaseCost, pct: costBreakdownPercentages.purchase, color: 'bg-indigo-500' },
                { label: 'Installation', value: results.installationCost, pct: costBreakdownPercentages.installation, color: 'bg-blue-500' },
                { label: 'Energy', value: results.totalEnergyCost, pct: costBreakdownPercentages.energy, color: 'bg-yellow-500' },
                { label: 'Maintenance', value: results.totalMaintenanceCost, pct: costBreakdownPercentages.maintenance, color: 'bg-green-500' },
                { label: 'Major Overhauls', value: results.totalOverhaulCost, pct: costBreakdownPercentages.overhaul, color: 'bg-orange-500' },
                { label: 'Downtime', value: results.totalDowntimeCost, pct: costBreakdownPercentages.downtime, color: 'bg-red-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{item.label}</span>
                    <span className="font-medium text-gray-900">
                      {currencySymbol} {formatCurrency(item.value)} ({item.pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full transition-all duration-300`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Yearly Breakdown Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Year-by-Year Breakdown</h3>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Year</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Energy</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Maintenance</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Overhaul</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Downtime</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Yearly Total</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">NPV</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Cumulative</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="bg-indigo-50">
                    <td className="py-2 px-3 font-medium">Year 0</td>
                    <td className="py-2 px-3 text-right">-</td>
                    <td className="py-2 px-3 text-right">-</td>
                    <td className="py-2 px-3 text-right">-</td>
                    <td className="py-2 px-3 text-right">-</td>
                    <td className="py-2 px-3 text-right font-medium">
                      {currencySymbol} {formatCurrency(results.purchaseCost + results.installationCost)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {currencySymbol} {formatCurrency(results.purchaseCost + results.installationCost)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {currencySymbol} {formatCurrency(results.purchaseCost + results.installationCost)}
                    </td>
                  </tr>
                  {results.breakdownByYear.map((year) => (
                    <tr key={year.year} className={year.overhaulCost > 0 ? 'bg-orange-50' : ''}>
                      <td className="py-2 px-3 font-medium">Year {year.year}</td>
                      <td className="py-2 px-3 text-right">{currencySymbol} {formatCurrency(year.energyCost)}</td>
                      <td className="py-2 px-3 text-right">{currencySymbol} {formatCurrency(year.maintenanceCost)}</td>
                      <td className="py-2 px-3 text-right">{year.overhaulCost > 0 ? `${currencySymbol} ${formatCurrency(year.overhaulCost)}` : '-'}</td>
                      <td className="py-2 px-3 text-right">{currencySymbol} {formatCurrency(year.downtimeCost)}</td>
                      <td className="py-2 px-3 text-right font-medium">{currencySymbol} {formatCurrency(year.totalCost)}</td>
                      <td className="py-2 px-3 text-right text-gray-600">{currencySymbol} {formatCurrency(year.presentValue)}</td>
                      <td className="py-2 px-3 text-right font-medium">{currencySymbol} {formatCurrency(year.cumulativeCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
