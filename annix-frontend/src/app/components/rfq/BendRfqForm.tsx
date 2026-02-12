'use client';

import React, { useState, useEffect } from 'react';
import { 
  generateClientItemNumber, 
  getWallThicknessForSchedule,
  getPipeEndConfigurationDetails 
} from '@/app/lib/utils/systemUtils';

// Types
interface BendEntry {
  id: string;
  description?: string;
  clientItemNumber?: string;
  specs: {
    nominalBoreMm?: number;
    scheduleNumber?: string;
    wallThicknessMm?: number;
    bendType?: string; // '1.5D', '2D', '3D', '5D'
    bendDegrees?: number; // 45, 90, etc.
    numberOfTangents?: number;
    tangentLengths?: number[]; // Array for multiple tangents
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
    quantityValue: number;
    quantityType: 'number_of_items';
    workingPressureBar?: number;
    workingTemperatureC?: number;
    useGlobalFlangeSpecs?: boolean;
  };
  calculation?: {
    centerToFaceDimension?: number;
    totalBendWeight?: number;
    totalTangentWeight?: number;
    totalSystemWeight?: number;
    numberOfFlanges?: number;
    numberOfFlangeWelds?: number;
    numberOfButtWelds?: number;
    totalFlangeWeldLength?: number;
    totalButtWeldLength?: number;
    bendRadius?: number;
  };
  minimumSchedule?: string;
  minimumWallThickness?: number;
  isScheduleOverridden?: boolean;
}

interface BendItemsStepProps {
  entries: BendEntry[];
  globalSpecs: any;
  masterData: any;
  onAddEntry: () => void;
  onUpdateEntry: (id: string, updates: Partial<BendEntry>) => void;
  onRemoveEntry: (id: string) => void;
  onCalculate: (entryId: string) => void;
  errors: any;
  loading: boolean;
}

const nominalBores = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600];
const bendTypes = ['1.5D', '2D', '3D', '5D'];
const standardAngles = [15, 22.5, 30, 45, 60, 90];

export default function BendItemsStep({
  entries,
  globalSpecs,
  masterData,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onCalculate,
  errors,
  loading
}: BendItemsStepProps) {
  const [isCalculating, setIsCalculating] = useState(false);

  // Generate item description based on specifications
  const generateItemDescription = (entry: BendEntry) => {
    const specs = entry.specs;
    const schedule = specs.scheduleNumber || 'TBD';
    const nb = specs.nominalBoreMm || 'TBD';
    const bendType = specs.bendType || 'TBD';
    const degrees = specs.bendDegrees || 'TBD';
    
    let description = `${nb}mm NB ${schedule} ${bendType} ${degrees}° Pulled Bend`;
    
    if (specs.numberOfTangents && specs.numberOfTangents > 0) {
      const tangentLengths = specs.tangentLengths || [];
      if (specs.numberOfTangents === 1) {
        description += ` with ${specs.numberOfTangents} tangent`;
        if (tangentLengths[0]) {
          description += ` of ${tangentLengths[0]}mm`;
        }
      } else {
        description += ` with ${specs.numberOfTangents} tangents`;
        if (tangentLengths.length > 0) {
          description += ` (${tangentLengths.join('mm, ')}mm)`;
        }
      }
    }
    
    return description;
  };

  // Auto-calculate specs when pressure and nominal bore are available
  const autoCalculateSpecs = async (entry: any) => {
    const pressure = globalSpecs?.workingPressureBar || entry.specs.workingPressureBar;
    const nominalBore = entry.specs.nominalBoreMm;
    const steelSpecId = globalSpecs?.steelSpecificationId;
    
    console.log('🔍 Auto-calculating bend specs:', { pressure, nominalBore, steelSpecId });
    
    if (pressure && nominalBore) {
      try {
        const { masterDataApi } = await import('@/app/lib/api/client');
        
        // Convert pressure from bar to MPa for API
        const pressureMpa = pressure * 0.1;
        
        console.log('📡 Calling bend API with:', { nominalBore, pressureMpa });
        
        const recommended = await masterDataApi.getRecommendedSpecs(
          nominalBore,
          pressureMpa,
          entry.specs.workingTemperatureC || globalSpecs?.workingTemperatureC || 20,
          steelSpecId
        );
        
        console.log('✅ Bend API returned:', recommended);
        
        return {
          scheduleNumber: recommended.schedule,
          wallThicknessMm: recommended.wallThickness,
          workingPressureBar: pressure,
          minimumSchedule: recommended.schedule,
          minimumWallThickness: recommended.wallThickness,
          isScheduleOverridden: false
        };
      } catch (error) {
        console.error('❌ Error auto-calculating bend specs:', error);
        
        // Fallback calculation
        let fallbackSchedule = 'Sch40';
        let fallbackWallThickness = 3.6;
        
        if (pressure <= 10) {
          fallbackSchedule = 'Sch10';
          fallbackWallThickness = Math.max(2.0, nominalBore * 0.03);
        } else if (pressure <= 25) {
          fallbackSchedule = 'Sch20';
          fallbackWallThickness = Math.max(3.0, nominalBore * 0.04);
        } else if (pressure <= 40) {
          fallbackSchedule = 'Sch40';
          fallbackWallThickness = Math.max(3.6, nominalBore * 0.05);
        } else if (pressure <= 80) {
          fallbackSchedule = 'Sch80';
          fallbackWallThickness = Math.max(5.5, nominalBore * 0.07);
        } else {
          fallbackSchedule = 'Sch160';
          fallbackWallThickness = Math.max(8.0, nominalBore * 0.10);
        }
        
        console.log(`🔧 Using fallback for bend: ${fallbackSchedule} (${fallbackWallThickness}mm) for ${nominalBore}mm NB at ${pressure} bar`);
        
        return {
          scheduleNumber: fallbackSchedule,
          wallThicknessMm: fallbackWallThickness,
          workingPressureBar: pressure,
          minimumSchedule: fallbackSchedule,
          minimumWallThickness: fallbackWallThickness,
          isScheduleOverridden: false
        };
      }
    } else {
      console.log('⚠️ Skipping bend auto-calculation - missing pressure or nominal bore:', { pressure, nominalBore });
    }
    return {};
  };

  const handleCalculateAll = async () => {
    setIsCalculating(true);
    for (const entry of entries) {
      try {
        await calculateBendEntry(entry);
      } catch (error) {
        console.error(`Error calculating bend entry ${entry.id}:`, error);
      }
    }
    setIsCalculating(false);
  };

  const calculateBendEntry = async (entry: BendEntry) => {
    if (!entry.specs.nominalBoreMm || !entry.specs.wallThicknessMm || 
        !entry.specs.bendType || !entry.specs.bendDegrees) {
      console.warn('Missing required specifications for bend calculation');
      return;
    }

    try {
      const { masterDataApi } = await import('@/app/lib/api/client');
      
      const calculationParams = {
        nominalBoreMm: entry.specs.nominalBoreMm,
        wallThicknessMm: entry.specs.wallThicknessMm,
        scheduleNumber: entry.specs.scheduleNumber,
        bendType: entry.specs.bendType,
        bendDegrees: entry.specs.bendDegrees,
        numberOfTangents: entry.specs.numberOfTangents || 0,
        tangentLengths: entry.specs.tangentLengths || [],
        quantity: entry.specs.quantityValue || 1,
        steelSpecificationId: entry.specs.steelSpecificationId || globalSpecs?.steelSpecificationId,
        flangeStandardId: entry.specs.useGlobalFlangeSpecs !== false 
          ? globalSpecs?.flangeStandardId 
          : entry.specs.flangeStandardId,
        flangePressureClassId: entry.specs.useGlobalFlangeSpecs !== false 
          ? globalSpecs?.flangePressureClassId 
          : entry.specs.flangePressureClassId
      };

      console.log('🔧 Calculating bend with params:', calculationParams);

      const calculation = await masterDataApi.calculateBendSpecifications(calculationParams);
      
      console.log('✅ Bend calculation result:', calculation);

      onUpdateEntry(entry.id, {
        calculation: calculation
      });

    } catch (error) {
      console.error('❌ Error calculating bend specifications:', error);
      
      // Provide fallback calculation if API fails
      const fallbackCalculation = {
        centerToFaceDimension: entry.specs.nominalBoreMm ? entry.specs.nominalBoreMm * 1.5 : 150,
        bendRadius: entry.specs.nominalBoreMm ? entry.specs.nominalBoreMm * 1.5 : 150,
        totalBendWeight: 10, // Fallback weight
        totalTangentWeight: (entry.specs.tangentLengths || []).reduce((sum, length) => sum + (length * 0.01), 0),
        totalSystemWeight: 15,
        numberOfFlanges: entry.specs.numberOfTangents && entry.specs.numberOfTangents > 0 ? 2 : 0,
        numberOfFlangeWelds: entry.specs.numberOfTangents && entry.specs.numberOfTangents > 0 ? 2 : 0,
        numberOfButtWelds: entry.specs.numberOfTangents || 0,
        totalFlangeWeldLength: 0.5,
        totalButtWeldLength: 0.3
      };

      onUpdateEntry(entry.id, {
        calculation: fallbackCalculation
      });
    }
  };

  const formatWeight = (weight: number) => {
    if (weight < 1000) return `${weight.toFixed(1)} kg`;
    return `${(weight / 1000).toFixed(2)} tonnes`;
  };

  const getTotalWeight = () => {
    return entries.reduce((total: number, entry: BendEntry) => {
      return total + (entry.calculation?.totalSystemWeight || 0);
    }, 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Bend Items</h2>
        <div className="flex gap-3">
          <button
            onClick={onAddEntry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            + Add Bend Item
          </button>
          <button
            onClick={handleCalculateAll}
            disabled={isCalculating || loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating || loading ? 'Calculating...' : '🔄 Calculate All'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {entries.map((entry: BendEntry, index: number) => (
          <div key={entry.id} className="border border-gray-200 rounded-md p-4 bg-white">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-gray-800">Bend Item #{index + 1}</h3>
              {entries.length > 1 && (
                <button
                  onClick={() => onRemoveEntry(entry.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove Item
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Item Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Item Description *
                </label>
                <textarea
                  value={entry.description || generateItemDescription(entry)}
                  onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  rows={2}
                  placeholder="Enter bend description..."
                  required
                />
              </div>

              {/* Client Item Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Client Item Number
                </label>
                <input
                  type="text"
                  value={entry.clientItemNumber || ''}
                  onChange={(e) => onUpdateEntry(entry.id, { clientItemNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Auto-generated from customer name (e.g., PLS-0001)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column - Bend Specifications */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1">
                    Bend Specifications
                  </h4>

                  {/* Nominal Bore */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Nominal Bore (mm) *
                    </label>
                    <select
                      value={entry.specs.nominalBoreMm}
                      onChange={async (e) => {
                        const nominalBore = Number(e.target.value);
                        
                        onUpdateEntry(entry.id, {
                          specs: { 
                            ...entry.specs, 
                            nominalBoreMm: nominalBore
                          }
                        });
                        
                        // Auto-calculate specs
                        try {
                          const autoSpecs = await autoCalculateSpecs({ 
                            specs: { ...entry.specs, nominalBoreMm: nominalBore } 
                          });
                          
                          const updatedEntry = {
                            ...entry,
                            specs: { 
                              ...entry.specs, 
                              nominalBoreMm: nominalBore,
                              ...autoSpecs
                            }
                          };
                          
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                        } catch (error) {
                          console.error('Error auto-calculating bend specs:', error);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                    >
                      <option value="">Select nominal bore...</option>
                      {nominalBores.map((nb: number) => (
                        <option key={nb} value={nb}>
                          {nb}mm NB
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Schedule/Wall Thickness */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Schedule/Wall Thickness
                      {globalSpecs?.workingPressureBar ? (
                        <span className="text-green-600 text-xs ml-2">(Automated)</span>
                      ) : (
                        <span className="text-orange-600 text-xs ml-2">(Manual Selection Required)</span>
                      )}
                    </label>
                    
                    <div className="space-y-2">
                      <select
                        value={entry.specs.scheduleNumber || ''}
                        onChange={async (e) => {
                          const newSchedule = e.target.value;
                          
                          let autoWallThickness = null;
                          if (newSchedule && entry.specs.nominalBoreMm) {
                            try {
                              autoWallThickness = await getWallThicknessForSchedule(
                                entry.specs.nominalBoreMm, 
                                newSchedule
                              );
                            } catch (error) {
                              console.warn('Could not auto-populate wall thickness:', error);
                            }
                          }
                          
                          onUpdateEntry(entry.id, {
                            specs: { 
                              ...entry.specs, 
                              scheduleNumber: newSchedule,
                              wallThicknessMm: autoWallThickness || entry.specs.wallThicknessMm
                            },
                            isScheduleOverridden: newSchedule !== entry.minimumSchedule
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                      >
                        <option value="">Select schedule...</option>
                        <option value="10">Schedule 10</option>
                        <option value="20">Schedule 20</option>
                        <option value="30">Schedule 30</option>
                        <option value="40">Schedule 40</option>
                        <option value="60">Schedule 60</option>
                        <option value="80">Schedule 80</option>
                        <option value="100">Schedule 100</option>
                        <option value="120">Schedule 120</option>
                        <option value="140">Schedule 140</option>
                        <option value="160">Schedule 160</option>
                        <option value="STD">STD (Standard)</option>
                        <option value="XS">XS (Extra Strong)</option>
                        <option value="XXS">XXS (Double Extra Strong)</option>
                      </select>

                      <input
                        type="number"
                        step="0.001"
                        value={entry.specs.wallThicknessMm || ''}
                        onChange={(e) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, wallThicknessMm: Number(e.target.value) }
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="Wall thickness (mm)"
                        required
                      />
                    </div>
                  </div>

                  {/* Bend Type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Bend Type *
                    </label>
                    <select
                      value={entry.specs.bendType || ''}
                      onChange={(e) => onUpdateEntry(entry.id, {
                        specs: { ...entry.specs, bendType: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                    >
                      <option value="">Select bend type...</option>
                      {bendTypes.map((type: string) => (
                        <option key={type} value={type}>
                          {type} Bend
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bend Degrees */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Bend Angle (degrees) *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={entry.specs.bendDegrees || ''}
                        onChange={(e) => onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, bendDegrees: Number(e.target.value) }
                        })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                      >
                        <option value="">Select angle...</option>
                        {standardAngles.map((angle: number) => (
                          <option key={angle} value={angle}>
                            {angle}°
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="180"
                        value={entry.specs.bendDegrees || ''}
                        onChange={(e) => onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, bendDegrees: Number(e.target.value) }
                        })}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="Custom"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Tangents & Flanges */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1">
                    Tangents & Flanges
                  </h4>

                  {/* Number of Tangents */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Number of Tangents
                    </label>
                    <select
                      value={entry.specs.numberOfTangents || 0}
                      onChange={(e) => {
                        const count = Number(e.target.value);
                        const currentLengths = entry.specs.tangentLengths || [];
                        const newLengths = Array(count).fill(0).map((_, i) => currentLengths[i] || 400);
                        
                        onUpdateEntry(entry.id, {
                          specs: { 
                            ...entry.specs, 
                            numberOfTangents: count,
                            tangentLengths: count > 0 ? newLengths : []
                          }
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    >
                      <option value={0}>0 (Bend only)</option>
                      <option value={1}>1 Tangent</option>
                      <option value={2}>2 Tangents</option>
                      <option value={3}>3 Tangents</option>
                      <option value={4}>4 Tangents</option>
                    </select>
                  </div>

                  {/* Tangent Lengths */}
                  {entry.specs.numberOfTangents && entry.specs.numberOfTangents > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Tangent Lengths (mm)
                      </label>
                      <div className="space-y-2">
                        {Array(entry.specs.numberOfTangents).fill(0).map((_, index) => (
                          <input
                            key={index}
                            type="number"
                            step="1"
                            min="0"
                            value={(entry.specs.tangentLengths || [])[index] || ''}
                            onChange={(e) => {
                              const newLengths = [...(entry.specs.tangentLengths || [])];
                              newLengths[index] = Number(e.target.value);
                              
                              onUpdateEntry(entry.id, {
                                specs: { 
                                  ...entry.specs, 
                                  tangentLengths: newLengths
                                }
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            placeholder={`Tangent ${index + 1} length (mm)`}
                            required
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={entry.specs.quantityValue || ''}
                      onChange={(e) => onUpdateEntry(entry.id, {
                        specs: { 
                          ...entry.specs, 
                          quantityValue: Number(e.target.value),
                          quantityType: 'number_of_items'
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Number of bend items"
                      required
                    />
                  </div>

                  {/* Flange Information */}
                  <div className="border-t border-gray-200 pt-3">
                    <h5 className="text-xs font-semibold text-gray-800 mb-2">Flange Information</h5>
                    
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`useGlobal_${entry.id}`}
                          checked={entry.specs.useGlobalFlangeSpecs !== false}
                          onChange={(e) => onUpdateEntry(entry.id, {
                            specs: { 
                              ...entry.specs, 
                              useGlobalFlangeSpecs: e.target.checked,
                              flangeStandardId: e.target.checked ? undefined : entry.specs.flangeStandardId,
                              flangePressureClassId: e.target.checked ? undefined : entry.specs.flangePressureClassId
                            }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`useGlobal_${entry.id}`} className="ml-2 text-xs text-gray-700">
                          Use global flange specifications
                        </label>
                      </div>

                      {entry.specs.useGlobalFlangeSpecs === false && (
                        <div className="space-y-2">
                          <select
                            value={entry.specs.flangeStandardId || ''}
                            onChange={(e) => onUpdateEntry(entry.id, { 
                              specs: { ...entry.specs, flangeStandardId: e.target.value ? Number(e.target.value) : undefined }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          >
                            <option value="">Select flange standard...</option>
                            {masterData.flangeStandards.map((standard: any) => (
                              <option key={standard.id} value={standard.id}>
                                {standard.code}
                              </option>
                            ))}
                          </select>
                          
                          <select
                            value={entry.specs.flangePressureClassId || ''}
                            onChange={(e) => onUpdateEntry(entry.id, { 
                              specs: { ...entry.specs, flangePressureClassId: e.target.value ? Number(e.target.value) : undefined }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          >
                            <option value="">Select pressure class...</option>
                            {masterData.pressureClasses.map((pc: any) => (
                              <option key={pc.id} value={pc.id}>
                                {pc.designation}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => calculateBendEntry(entry)}
                  disabled={!entry.specs.nominalBoreMm || !entry.specs.wallThicknessMm || 
                           !entry.specs.bendType || !entry.specs.bendDegrees}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  🔄 Calculate Bend
                </button>
                
                {entry.calculation && (
                  <span className="text-sm text-green-600 font-medium">
                    ✅ Calculated
                  </span>
                )}
              </div>

              {/* Calculation Results */}
              {entry.calculation && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-md space-y-2">
                  <h5 className="text-sm font-semibold text-blue-900 mb-2 border-b border-blue-200 pb-1">
                    📊 Calculated Results
                  </h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Bend Dimensions */}
                    <div className="bg-white p-2 rounded">
                      <p className="text-xs text-gray-700 font-medium">Center to Face</p>
                      <p className="text-lg font-bold text-blue-900">{entry.calculation.centerToFaceDimension?.toFixed(2)}mm</p>
                      {entry.calculation.bendRadius && (
                        <p className="text-xs text-gray-600">Radius: {entry.calculation.bendRadius?.toFixed(1)}mm</p>
                      )}
                    </div>

                    {/* Weight */}
                    <div className="bg-white p-2 rounded">
                      <p className="text-xs text-gray-700 font-medium">Total Weight</p>
                      <p className="text-lg font-bold text-blue-900">{formatWeight(entry.calculation.totalSystemWeight || 0)}</p>
                      <div className="text-xs text-gray-600">
                        <div>Bend: {formatWeight(entry.calculation.totalBendWeight || 0)}</div>
                        {entry.calculation.totalTangentWeight && entry.calculation.totalTangentWeight > 0 && (
                          <div>Tangents: {formatWeight(entry.calculation.totalTangentWeight)}</div>
                        )}
                      </div>
                    </div>

                    {/* Welds */}
                    <div className="bg-white p-2 rounded">
                      <p className="text-xs text-gray-700 font-medium">Welds Required</p>
                      <div className="text-sm">
                        {entry.calculation.numberOfFlangeWelds && entry.calculation.numberOfFlangeWelds > 0 && (
                          <div>Flange: {entry.calculation.numberOfFlangeWelds} ({entry.calculation.totalFlangeWeldLength?.toFixed(1)}m)</div>
                        )}
                        {entry.calculation.numberOfButtWelds && entry.calculation.numberOfButtWelds > 0 && (
                          <div>Butt: {entry.calculation.numberOfButtWelds} ({entry.calculation.totalButtWeldLength?.toFixed(1)}m)</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Summary */}
        <div className="border-2 border-blue-200 rounded-md p-3 bg-blue-50">
          <h3 className="text-base font-bold text-blue-900 mb-2">Bend Items Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs font-medium text-blue-700">Total Bend Items</p>
              <p className="text-lg font-bold text-blue-900">{entries.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-blue-700">Total Quantity</p>
              <p className="text-lg font-bold text-blue-900">
                {entries.reduce((total: number, entry: BendEntry) => total + entry.specs.quantityValue, 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-blue-700">Total Weight</p>
              <p className="text-lg font-bold text-blue-900">
                {formatWeight(getTotalWeight())}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}