'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Select } from '@/app/components/ui/Select';
import SplitPaneLayout from '@/app/components/rfq/SplitPaneLayout';
import { SmartNotesDropdown, formatNotesForDisplay } from '@/app/components/rfq/SmartNotesDropdown';
import {
  PUMPS_MODULE,
  getPumpsByCategory,
  PumpCategory,
  FLUID_SPECS,
  MATERIAL_OPTIONS,
  MOTOR_SPECS,
  CONSTRUCTION_SPECS,
  CONNECTION_OPTIONS,
  PUMP_SIZE_OPTIONS,
  CERTIFICATION_OPTIONS,
  PUMP_SPARE_PARTS,
  SPARE_PARTS_KITS,
  calculatePumpEstimate,
  calculateRentalCost,
  estimatePumpRequirements,
  IEC_FRAME_SIZES,
  NEMA_FRAME_SIZES,
  COUPLING_OPTIONS,
  BASEPLATE_OPTIONS,
  INSTRUMENTATION_OPTIONS,
} from '@/app/lib/config/pumps';

export interface PumpFormProps {
  entry: any;
  index: number;
  entriesCount: number;
  globalSpecs: any;
  masterData: any;
  onUpdateEntry: (id: string, updates: any) => void;
  onRemoveEntry: (id: string) => void;
  generateItemDescription: (entry: any) => string;
  requiredProducts?: string[];
}

const SERVICE_TYPE_OPTIONS = PUMPS_MODULE.categories.map(c => ({
  value: c.value,
  label: c.label,
}));

const PUMP_CATEGORY_OPTIONS = [
  { value: 'centrifugal', label: 'Centrifugal Pumps' },
  { value: 'positive_displacement', label: 'Positive Displacement' },
  { value: 'specialty', label: 'Specialty Pumps' },
];

export default function PumpForm({
  entry,
  index: _index,
  entriesCount: _entriesCount,
  globalSpecs: _globalSpecs,
  masterData: _masterData,
  onUpdateEntry,
  onRemoveEntry,
  generateItemDescription,
  requiredProducts: _requiredProducts = [],
}: PumpFormProps) {
  const [calculationResults, setCalculationResults] = useState<any>(null);
  const [selectedSparePartCategory, setSelectedSparePartCategory] = useState<string | null>(null);

  const serviceType = entry.specs?.serviceType || 'new_pump';
  const pumpCategory = entry.specs?.pumpCategory || 'centrifugal';
  const pumpType = entry.specs?.pumpType || '';
  const quantity = entry.specs?.quantityValue || 1;

  const flowRate = entry.specs?.flowRate;
  const totalHead = entry.specs?.totalHead;
  const suctionHead = entry.specs?.suctionHead;
  const npshAvailable = entry.specs?.npshAvailable;
  const dischargePressure = entry.specs?.dischargePressure;
  const operatingTemp = entry.specs?.operatingTemp;

  const fluidType = entry.specs?.fluidType || 'water';
  const specificGravity = entry.specs?.specificGravity || 1.0;
  const viscosity = entry.specs?.viscosity;
  const solidsContent = entry.specs?.solidsContent;
  const solidsSize = entry.specs?.solidsSize;
  const ph = entry.specs?.ph;
  const isAbrasive = entry.specs?.isAbrasive || false;
  const isCorrosive = entry.specs?.isCorrosive || false;

  const casingMaterial = entry.specs?.casingMaterial || 'cast_iron';
  const impellerMaterial = entry.specs?.impellerMaterial || 'cast_iron';
  const shaftMaterial = entry.specs?.shaftMaterial || 'ss_410';
  const sealType = entry.specs?.sealType || 'mechanical_single';
  const sealPlan = entry.specs?.sealPlan;

  const suctionSize = entry.specs?.suctionSize;
  const dischargeSize = entry.specs?.dischargeSize;
  const connectionType = entry.specs?.connectionType || 'flanged_pn16';

  const motorType = entry.specs?.motorType || 'electric_ac';
  const motorPower = entry.specs?.motorPower;
  const voltage = entry.specs?.voltage || '380_3ph';
  const frequency = entry.specs?.frequency || '50';
  const motorEfficiency = entry.specs?.motorEfficiency || 'ie3';
  const enclosure = entry.specs?.enclosure || 'tefc';
  const hazardousArea = entry.specs?.hazardousArea || 'none';
  const frameStandard = entry.specs?.frameStandard || 'iec';
  const frameSize = entry.specs?.frameSize || '';

  const couplingType = entry.specs?.couplingType || 'flexible_jaw';
  const couplingGuard = entry.specs?.couplingGuard || 'standard';

  const baseplateType = entry.specs?.baseplateType || 'fabricated_steel';
  const drainConnection = entry.specs?.drainConnection || 'plugged_drain';
  const groutType = entry.specs?.groutType || 'none';

  const pressureInstruments = entry.specs?.pressureInstruments || [];
  const flowInstruments = entry.specs?.flowInstruments || [];
  const temperatureInstruments = entry.specs?.temperatureInstruments || [];
  const vibrationInstruments = entry.specs?.vibrationInstruments || [];

  const certifications = entry.specs?.certifications || [];
  const spareParts = entry.specs?.spareParts || [];
  const existingPumpModel = entry.specs?.existingPumpModel || '';
  const existingPumpSerial = entry.specs?.existingPumpSerial || '';
  const rentalDurationDays = entry.specs?.rentalDurationDays || 7;

  const supplierReference = entry.specs?.supplierReference || '';
  const unitCostFromSupplier = entry.specs?.unitCostFromSupplier;
  const markupPercentage = entry.specs?.markupPercentage || 15;

  const filteredPumpTypes = useMemo(() => {
    return getPumpsByCategory(pumpCategory as PumpCategory);
  }, [pumpCategory]);

  const filteredFrameSizes = useMemo(() => {
    if (frameStandard === 'iec') {
      return IEC_FRAME_SIZES;
    } else if (frameStandard === 'nema') {
      return NEMA_FRAME_SIZES;
    }
    return [...IEC_FRAME_SIZES, ...NEMA_FRAME_SIZES];
  }, [frameStandard]);

  useEffect(() => {
    if (serviceType === 'new_pump' && flowRate && totalHead) {
      const estimate = estimatePumpRequirements(
        flowRate,
        totalHead,
        specificGravity,
        70,
        3
      );

      let results: any = {
        ...estimate,
        serviceType: 'new_pump',
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

    if (serviceType === 'rental' && unitCostFromSupplier) {
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

    if ((serviceType === 'spare_parts' || serviceType === 'repair_service') && unitCostFromSupplier) {
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
    updateSpec('certifications', newCerts);
  };

  const addSparePart = (partValue: string, partLabel: string) => {
    const newParts = [...spareParts, { value: partValue, label: partLabel, quantity: 1 }];
    updateSpec('spareParts', newParts);
  };

  const removeSparePart = (index: number) => {
    const newParts = spareParts.filter((_: any, i: number) => i !== index);
    updateSpec('spareParts', newParts);
  };

  const updateSparePartQuantity = (index: number, qty: number) => {
    const newParts = spareParts.map((p: any, i: number) =>
      i === index ? { ...p, quantity: qty } : p
    );
    updateSpec('spareParts', newParts);
  };

  const addSparePartsKit = (kitValue: string) => {
    const kit = SPARE_PARTS_KITS.find(k => k.value === kitValue);
    if (kit) {
      const newParts = kit.typicalParts.map(partValue => {
        const allParts = PUMP_SPARE_PARTS.flatMap(cat => cat.parts);
        const part = allParts.find(p => p.value === partValue);
        return { value: partValue, label: part?.label || partValue, quantity: 1 };
      });
      updateSpec('spareParts', [...spareParts, ...newParts]);
    }
  };

  const renderServiceTypeFields = () => {
    if (serviceType === 'new_pump') {
      return (
        <>
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Pump Selection</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pump Category</label>
                <Select
                  value={pumpCategory}
                  onChange={(value) => {
                    updateSpec('pumpCategory', value);
                    updateSpec('pumpType', '');
                  }}
                  options={PUMP_CATEGORY_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pump Type</label>
                <Select
                  value={pumpType}
                  onChange={(value) => updateSpec('pumpType', value)}
                  options={[
                    { value: '', label: 'Select pump type...' },
                    ...filteredPumpTypes.map(p => ({ value: p.value, label: p.label })),
                  ]}
                />
              </div>
            </div>
            {pumpType && (
              <p className="text-sm text-gray-500 mt-2">
                {filteredPumpTypes.find(p => p.value === pumpType)?.description}
              </p>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Performance Requirements</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flow Rate (m³/h) *
                </label>
                <input
                  type="number"
                  value={flowRate || ''}
                  onChange={(e) => updateSpec('flowRate', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Head (m) *
                </label>
                <input
                  type="number"
                  value={totalHead || ''}
                  onChange={(e) => updateSpec('totalHead', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NPSHa (m)
                </label>
                <input
                  type="number"
                  value={npshAvailable || ''}
                  onChange={(e) => updateSpec('npshAvailable', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operating Temp (°C)
                </label>
                <input
                  type="number"
                  value={operatingTemp || ''}
                  onChange={(e) => updateSpec('operatingTemp', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suction Head (m)
                </label>
                <input
                  type="number"
                  value={suctionHead || ''}
                  onChange={(e) => updateSpec('suctionHead', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+ve flooded, -ve lift"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discharge Pressure (bar)
                </label>
                <input
                  type="number"
                  value={dischargePressure || ''}
                  onChange={(e) => updateSpec('dischargePressure', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Fluid Properties</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fluid Type *</label>
                <Select
                  value={fluidType}
                  onChange={(value) => updateSpec('fluidType', value)}
                  options={FLUID_SPECS.find(f => f.name === 'fluidType')?.options || []}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specific Gravity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={specificGravity}
                  onChange={(e) => updateSpec('specificGravity', parseFloat(e.target.value) || 1.0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Viscosity (cP)
                </label>
                <input
                  type="number"
                  value={viscosity || ''}
                  onChange={(e) => updateSpec('viscosity', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solids Content (%)
                </label>
                <input
                  type="number"
                  value={solidsContent || ''}
                  onChange={(e) => updateSpec('solidsContent', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Solids Size (mm)
                </label>
                <input
                  type="number"
                  value={solidsSize || ''}
                  onChange={(e) => updateSpec('solidsSize', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  pH Level
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  value={ph || ''}
                  onChange={(e) => updateSpec('ph', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-6 mt-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isAbrasive}
                  onChange={(e) => updateSpec('isAbrasive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Abrasive</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isCorrosive}
                  onChange={(e) => updateSpec('isCorrosive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Corrosive</span>
              </label>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Construction Materials</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Casing Material *</label>
                <Select
                  value={casingMaterial}
                  onChange={(value) => updateSpec('casingMaterial', value)}
                  options={MATERIAL_OPTIONS.casing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impeller Material *</label>
                <Select
                  value={impellerMaterial}
                  onChange={(value) => updateSpec('impellerMaterial', value)}
                  options={MATERIAL_OPTIONS.impeller}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shaft Material</label>
                <Select
                  value={shaftMaterial}
                  onChange={(value) => updateSpec('shaftMaterial', value)}
                  options={MATERIAL_OPTIONS.shaft}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seal Type</label>
                <Select
                  value={sealType}
                  onChange={(value) => updateSpec('sealType', value)}
                  options={MATERIAL_OPTIONS.seal}
                />
              </div>
            </div>
            {(sealType === 'mechanical_single' || sealType === 'mechanical_double' || sealType === 'cartridge') && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Seal Flush Plan</label>
                <Select
                  value={sealPlan || ''}
                  onChange={(value) => updateSpec('sealPlan', value)}
                  options={[
                    { value: '', label: 'Select plan...' },
                    ...CONSTRUCTION_SPECS.find(s => s.name === 'sealPlan')?.options || [],
                  ]}
                />
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Connections</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suction Size</label>
                <Select
                  value={suctionSize || ''}
                  onChange={(value) => updateSpec('suctionSize', value)}
                  options={[{ value: '', label: 'Select...' }, ...PUMP_SIZE_OPTIONS]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discharge Size</label>
                <Select
                  value={dischargeSize || ''}
                  onChange={(value) => updateSpec('dischargeSize', value)}
                  options={[{ value: '', label: 'Select...' }, ...PUMP_SIZE_OPTIONS]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Connection Type</label>
                <Select
                  value={connectionType}
                  onChange={(value) => updateSpec('connectionType', value)}
                  options={CONNECTION_OPTIONS}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Motor Specifications</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motor Type</label>
                <Select
                  value={motorType}
                  onChange={(value) => updateSpec('motorType', value)}
                  options={MOTOR_SPECS.find(s => s.name === 'motorType')?.options || []}
                />
              </div>
              {motorType !== 'none' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motor Power (kW)
                    </label>
                    <input
                      type="number"
                      value={motorPower || ''}
                      onChange={(e) => updateSpec('motorPower', parseFloat(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder={calculationResults?.recommendedMotorKw ? `Recommended: ${calculationResults.recommendedMotorKw}` : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Voltage</label>
                    <Select
                      value={voltage}
                      onChange={(value) => updateSpec('voltage', value)}
                      options={MOTOR_SPECS.find(s => s.name === 'voltage')?.options || []}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <Select
                      value={frequency}
                      onChange={(value) => updateSpec('frequency', value)}
                      options={MOTOR_SPECS.find(s => s.name === 'frequency')?.options || []}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Efficiency Class</label>
                    <Select
                      value={motorEfficiency}
                      onChange={(value) => updateSpec('motorEfficiency', value)}
                      options={MOTOR_SPECS.find(s => s.name === 'motorEfficiency')?.options || []}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enclosure</label>
                    <Select
                      value={enclosure}
                      onChange={(value) => updateSpec('enclosure', value)}
                      options={MOTOR_SPECS.find(s => s.name === 'enclosure')?.options || []}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hazardous Area</label>
                    <Select
                      value={hazardousArea}
                      onChange={(value) => updateSpec('hazardousArea', value)}
                      options={MOTOR_SPECS.find(s => s.name === 'hazardousArea')?.options || []}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frame Standard</label>
                    <Select
                      value={frameStandard}
                      onChange={(value) => {
                        updateSpec('frameStandard', value);
                        updateSpec('frameSize', '');
                      }}
                      options={[
                        { value: 'iec', label: 'IEC (International)' },
                        { value: 'nema', label: 'NEMA (North America)' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frame Size</label>
                    <Select
                      value={frameSize}
                      onChange={(value) => updateSpec('frameSize', value)}
                      options={[
                        { value: '', label: 'Select frame size...' },
                        ...filteredFrameSizes,
                      ]}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Coupling & Drive</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupling Type</label>
                <Select
                  value={couplingType}
                  onChange={(value) => updateSpec('couplingType', value)}
                  options={COUPLING_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupling Guard</label>
                <Select
                  value={couplingGuard}
                  onChange={(value) => updateSpec('couplingGuard', value)}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'standard', label: 'Standard Guard' },
                    { value: 'full_enclosure', label: 'Full Enclosure' },
                    { value: 'mesh', label: 'Mesh Guard' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Baseplate & Mounting</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Baseplate Type</label>
                <Select
                  value={baseplateType}
                  onChange={(value) => updateSpec('baseplateType', value)}
                  options={BASEPLATE_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Drain Connection</label>
                <Select
                  value={drainConnection}
                  onChange={(value) => updateSpec('drainConnection', value)}
                  options={[
                    { value: 'none', label: 'No Drain' },
                    { value: 'open_drain', label: 'Open Drain' },
                    { value: 'plugged_drain', label: 'Plugged Drain Connection' },
                    { value: 'piped_drain', label: 'Piped to Collection' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grouting</label>
                <Select
                  value={groutType}
                  onChange={(value) => updateSpec('groutType', value)}
                  options={[
                    { value: 'none', label: 'No Grout' },
                    { value: 'cement', label: 'Cement Grout' },
                    { value: 'epoxy', label: 'Epoxy Grout' },
                    { value: 'non_shrink', label: 'Non-Shrink Grout' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Instrumentation</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pressure Instruments</label>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENTATION_OPTIONS.pressure.map(inst => (
                    <button
                      key={inst.value}
                      type="button"
                      onClick={() => {
                        const newInsts = pressureInstruments.includes(inst.value)
                          ? pressureInstruments.filter((i: string) => i !== inst.value)
                          : [...pressureInstruments, inst.value];
                        updateSpec('pressureInstruments', newInsts);
                      }}
                      className={`px-2 py-1 rounded text-xs ${
                        pressureInstruments.includes(inst.value)
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : 'bg-gray-100 text-gray-600 border-gray-300'
                      } border`}
                    >
                      {inst.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Flow Instruments</label>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENTATION_OPTIONS.flow.map(inst => (
                    <button
                      key={inst.value}
                      type="button"
                      onClick={() => {
                        const newInsts = flowInstruments.includes(inst.value)
                          ? flowInstruments.filter((i: string) => i !== inst.value)
                          : [...flowInstruments, inst.value];
                        updateSpec('flowInstruments', newInsts);
                      }}
                      className={`px-2 py-1 rounded text-xs ${
                        flowInstruments.includes(inst.value)
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : 'bg-gray-100 text-gray-600 border-gray-300'
                      } border`}
                    >
                      {inst.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Temperature Instruments</label>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENTATION_OPTIONS.temperature.map(inst => (
                    <button
                      key={inst.value}
                      type="button"
                      onClick={() => {
                        const newInsts = temperatureInstruments.includes(inst.value)
                          ? temperatureInstruments.filter((i: string) => i !== inst.value)
                          : [...temperatureInstruments, inst.value];
                        updateSpec('temperatureInstruments', newInsts);
                      }}
                      className={`px-2 py-1 rounded text-xs ${
                        temperatureInstruments.includes(inst.value)
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : 'bg-gray-100 text-gray-600 border-gray-300'
                      } border`}
                    >
                      {inst.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vibration Monitoring</label>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENTATION_OPTIONS.vibration.map(inst => (
                    <button
                      key={inst.value}
                      type="button"
                      onClick={() => {
                        const newInsts = vibrationInstruments.includes(inst.value)
                          ? vibrationInstruments.filter((i: string) => i !== inst.value)
                          : [...vibrationInstruments, inst.value];
                        updateSpec('vibrationInstruments', newInsts);
                      }}
                      className={`px-2 py-1 rounded text-xs ${
                        vibrationInstruments.includes(inst.value)
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : 'bg-gray-100 text-gray-600 border-gray-300'
                      } border`}
                    >
                      {inst.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Certifications</h4>
            <div className="flex flex-wrap gap-2">
              {CERTIFICATION_OPTIONS.map(cert => (
                <button
                  key={cert.value}
                  type="button"
                  onClick={() => toggleCertification(cert.value)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    certifications.includes(cert.value)
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  } border`}
                >
                  {cert.label}
                </button>
              ))}
            </div>
          </div>
        </>
      );
    }

    if (serviceType === 'spare_parts') {
      return (
        <>
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Existing Pump Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pump Make/Model
                </label>
                <input
                  type="text"
                  value={existingPumpModel}
                  onChange={(e) => updateSpec('existingPumpModel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. KSB Etanorm 100-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={existingPumpSerial}
                  onChange={(e) => updateSpec('existingPumpSerial', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Spare Parts Selection</h4>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quick Add: Spare Parts Kit
              </label>
              <div className="flex gap-2">
                {SPARE_PARTS_KITS.map(kit => (
                  <button
                    key={kit.value}
                    type="button"
                    onClick={() => addSparePartsKit(kit.value)}
                    className="px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100"
                  >
                    + {kit.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Part Category</label>
                <Select
                  value={selectedSparePartCategory || ''}
                  onChange={(value) => setSelectedSparePartCategory(value || null)}
                  options={[
                    { value: '', label: 'Select category...' },
                    ...PUMP_SPARE_PARTS.map(cat => ({ value: cat.value, label: cat.label })),
                  ]}
                />
              </div>
              {selectedSparePartCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Part</label>
                  <Select
                    value=""
                    onChange={(value) => {
                      const category = PUMP_SPARE_PARTS.find(c => c.value === selectedSparePartCategory);
                      const part = category?.parts.find(p => p.value === value);
                      if (part) {
                        addSparePart(part.value, part.label);
                      }
                    }}
                    options={[
                      { value: '', label: 'Select part to add...' },
                      ...(PUMP_SPARE_PARTS.find(c => c.value === selectedSparePartCategory)?.parts.map(p => ({
                        value: p.value,
                        label: p.label,
                      })) || []),
                    ]}
                  />
                </div>
              )}
            </div>

            {spareParts.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Part</th>
                      <th className="px-3 py-2 text-center w-24">Qty</th>
                      <th className="px-3 py-2 text-center w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {spareParts.map((part: any, index: number) => (
                      <tr key={index}>
                        <td className="px-3 py-2">{part.label}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            value={part.quantity}
                            onChange={(e) => updateSparePartQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 border rounded text-center"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeSparePart(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      );
    }

    if (serviceType === 'repair_service') {
      return (
        <>
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Pump Details for Repair</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pump Make/Model *
                </label>
                <input
                  type="text"
                  value={existingPumpModel}
                  onChange={(e) => updateSpec('existingPumpModel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. KSB Etanorm 100-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={existingPumpSerial}
                  onChange={(e) => updateSpec('existingPumpSerial', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Repair Scope</h4>
            <p className="text-sm text-gray-500 mb-3">
              Describe the issues or required repairs in the notes section below.
              Attach photos or inspection reports using the datasheet upload.
            </p>
          </div>
        </>
      );
    }

    if (serviceType === 'rental') {
      return (
        <>
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Rental Requirements</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pump Category</label>
                <Select
                  value={pumpCategory}
                  onChange={(value) => updateSpec('pumpCategory', value)}
                  options={PUMP_CATEGORY_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pump Type</label>
                <Select
                  value={pumpType}
                  onChange={(value) => updateSpec('pumpType', value)}
                  options={[
                    { value: '', label: 'Select pump type...' },
                    ...filteredPumpTypes.map(p => ({ value: p.value, label: p.label })),
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rental Duration (days) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={rentalDurationDays}
                  onChange={(e) => updateSpec('rentalDurationDays', parseInt(e.target.value) || 7)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Flow Rate (m³/h)
                </label>
                <input
                  type="number"
                  value={flowRate || ''}
                  onChange={(e) => updateSpec('flowRate', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Head (m)
                </label>
                <input
                  type="number"
                  value={totalHead || ''}
                  onChange={(e) => updateSpec('totalHead', parseFloat(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  const renderCalculationResults = () => {
    if (!calculationResults) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Calculation Results</h4>
        {serviceType === 'new_pump' && (
          <div className="space-y-2 text-sm">
            {calculationResults.hydraulicPowerKw && (
              <div className="flex justify-between">
                <span className="text-gray-600">Hydraulic Power:</span>
                <span className="font-medium">{calculationResults.hydraulicPowerKw} kW</span>
              </div>
            )}
            {calculationResults.estimatedShaftPowerKw && (
              <div className="flex justify-between">
                <span className="text-gray-600">Est. Shaft Power:</span>
                <span className="font-medium">{calculationResults.estimatedShaftPowerKw} kW</span>
              </div>
            )}
            {calculationResults.recommendedMotorKw && (
              <div className="flex justify-between">
                <span className="text-gray-600">Recommended Motor:</span>
                <span className="font-medium text-blue-700">{calculationResults.recommendedMotorKw} kW</span>
              </div>
            )}
            {calculationResults.flowRangeRecommendation && (
              <p className="text-xs text-gray-500 mt-2">{calculationResults.flowRangeRecommendation}</p>
            )}
            {calculationResults.totalPrice && (
              <>
                <hr className="my-2 border-blue-200" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit Price:</span>
                  <span className="font-medium">R {calculationResults.unitPrice?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount ({calculationResults.discountPercent}%):</span>
                  <span className="font-medium text-green-600">- R {calculationResults.discountAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Total:</span>
                  <span className="text-blue-700">R {calculationResults.totalPrice?.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        )}
        {serviceType === 'rental' && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Rental ({rentalDurationDays} days):</span>
              <span className="font-medium">R {calculationResults.rentalCost?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery (est.):</span>
              <span className="font-medium">R {calculationResults.deliveryCost?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total:</span>
              <span className="text-blue-700">R {calculationResults.totalCost?.toLocaleString()}</span>
            </div>
          </div>
        )}
        {(serviceType === 'spare_parts' || serviceType === 'repair_service') && calculationResults.totalCost && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Unit Cost:</span>
              <span className="font-medium">R {calculationResults.unitCost?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Markup:</span>
              <span className="font-medium">R {calculationResults.markupAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total:</span>
              <span className="text-blue-700">R {calculationResults.totalCost?.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <SplitPaneLayout
      entryId={entry.id}
      itemType="pump"
      showSplitToggle={true}
      formContent={
        <>
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-gray-900">
                Pump / Pump Parts Request
              </h3>
              <button
                type="button"
                onClick={() => onRemoveEntry(entry.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
                <Select
                  value={serviceType}
                  onChange={(value) => updateSpec('serviceType', value)}
                  options={SERVICE_TYPE_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => updateSpec('quantityValue', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {renderServiceTypeFields()}

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-3">Pricing</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Reference
                  </label>
                  <input
                    type="text"
                    value={supplierReference}
                    onChange={(e) => updateSpec('supplierReference', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {serviceType === 'rental' ? 'Daily Rate (R)' : 'Cost from Supplier (R)'}
                  </label>
                  <input
                    type="number"
                    value={unitCostFromSupplier || ''}
                    onChange={(e) => updateSpec('unitCostFromSupplier', parseFloat(e.target.value) || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Markup (%)
                  </label>
                  <input
                    type="number"
                    value={markupPercentage}
                    onChange={(e) => updateSpec('markupPercentage', parseFloat(e.target.value) || 15)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <SmartNotesDropdown
                selectedNotes={entry.selectedNotes || []}
                onNotesChange={(notes: string[]) => onUpdateEntry(entry.id, {
                  selectedNotes: notes,
                  notes: formatNotesForDisplay(notes)
                })}
                placeholder="Select quality/inspection requirements..."
              />
            </div>
          </div>
        </>
      }
      previewContent={
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Item Preview</h4>
          <p className="text-sm text-gray-700">{generateItemDescription(entry)}</p>
        </div>
      }
      calcResultsContent={renderCalculationResults()}
    />
  );
}
