'use client';

import React, { useState, useMemo } from 'react';

interface MaterialCompatibilityCheckerProps {
  onCompatibilityResult?: (result: CompatibilityResult) => void;
}

interface FluidCharacteristics {
  fluidName: string;
  temperatureC: number;
  concentration?: number;
  ph?: number;
  hasChlorides?: boolean;
  hasH2S?: boolean;
  hasCO2?: boolean;
}

interface MaterialRating {
  material: string;
  rating: 'excellent' | 'good' | 'fair' | 'poor' | 'not-recommended';
  notes: string[];
  maxTemperatureC?: number;
}

interface CompatibilityResult {
  fluid: FluidCharacteristics;
  ratings: MaterialRating[];
  recommendedMaterial: string;
  warnings: string[];
}

type FluidCategory = 'water' | 'hydrocarbon' | 'acid' | 'caustic' | 'solvent' | 'other';

interface FluidPreset {
  name: string;
  category: FluidCategory;
  defaultTemp: number;
  defaultConcentration?: number;
}

const FLUID_PRESETS: FluidPreset[] = [
  { name: 'Seawater', category: 'water', defaultTemp: 25 },
  { name: 'Freshwater', category: 'water', defaultTemp: 25 },
  { name: 'Boiler Feedwater', category: 'water', defaultTemp: 150 },
  { name: 'Cooling Tower Water', category: 'water', defaultTemp: 35 },
  { name: 'Crude Oil', category: 'hydrocarbon', defaultTemp: 40 },
  { name: 'Diesel', category: 'hydrocarbon', defaultTemp: 25 },
  { name: 'Gasoline', category: 'hydrocarbon', defaultTemp: 25 },
  { name: 'LPG', category: 'hydrocarbon', defaultTemp: -40 },
  { name: 'Sulfuric Acid', category: 'acid', defaultTemp: 25, defaultConcentration: 98 },
  { name: 'Hydrochloric Acid', category: 'acid', defaultTemp: 25, defaultConcentration: 35 },
  { name: 'Nitric Acid', category: 'acid', defaultTemp: 25, defaultConcentration: 65 },
  { name: 'Phosphoric Acid', category: 'acid', defaultTemp: 25, defaultConcentration: 85 },
  { name: 'Sodium Hydroxide', category: 'caustic', defaultTemp: 25, defaultConcentration: 50 },
  { name: 'Potassium Hydroxide', category: 'caustic', defaultTemp: 25, defaultConcentration: 45 },
  { name: 'Ammonia', category: 'other', defaultTemp: 25 },
  { name: 'Methanol', category: 'solvent', defaultTemp: 25 },
  { name: 'Ethylene Glycol', category: 'solvent', defaultTemp: 25 },
];

interface MaterialData {
  name: string;
  code: string;
  category: 'carbon-steel' | 'stainless' | 'duplex' | 'nickel-alloy' | 'special';
  costFactor: number;
}

const MATERIALS: MaterialData[] = [
  { name: 'Carbon Steel', code: 'CS', category: 'carbon-steel', costFactor: 1.0 },
  { name: '304 Stainless Steel', code: '304SS', category: 'stainless', costFactor: 2.5 },
  { name: '316 Stainless Steel', code: '316SS', category: 'stainless', costFactor: 3.0 },
  { name: '316L Stainless Steel', code: '316LSS', category: 'stainless', costFactor: 3.2 },
  { name: 'Duplex 2205', code: 'DPX', category: 'duplex', costFactor: 4.5 },
  { name: 'Super Duplex 2507', code: 'SDPX', category: 'duplex', costFactor: 6.0 },
  { name: 'Alloy 20', code: 'A20', category: 'nickel-alloy', costFactor: 8.0 },
  { name: 'Hastelloy C-276', code: 'HC276', category: 'nickel-alloy', costFactor: 12.0 },
  { name: 'Monel 400', code: 'M400', category: 'nickel-alloy', costFactor: 7.0 },
  { name: 'Titanium', code: 'Ti', category: 'special', costFactor: 15.0 },
];

const evaluateMaterialCompatibility = (
  fluid: FluidCharacteristics,
  material: MaterialData
): MaterialRating => {
  const notes: string[] = [];
  let rating: MaterialRating['rating'] = 'excellent';
  let maxTemperatureC: number | undefined;

  const fluidLower = fluid.fluidName.toLowerCase();
  const isSeawater = fluidLower.includes('seawater');
  const isCrudeOil = fluidLower.includes('crude');
  const isSulfuricAcid = fluidLower.includes('sulfuric');
  const isHydrochloricAcid = fluidLower.includes('hydrochloric');
  const isNitricAcid = fluidLower.includes('nitric');
  const isCaustic = fluidLower.includes('hydroxide') || fluidLower.includes('caustic');
  const isAmmonia = fluidLower.includes('ammonia');

  if (material.category === 'carbon-steel') {
    if (isSeawater) {
      rating = 'poor';
      notes.push('Carbon steel corrodes rapidly in seawater');
    } else if (isSulfuricAcid) {
      if ((fluid.concentration ?? 0) > 80 && fluid.temperatureC < 40) {
        rating = 'fair';
        notes.push('Acceptable for concentrated sulfuric acid at low temperatures');
        maxTemperatureC = 40;
      } else {
        rating = 'not-recommended';
        notes.push('Not suitable for dilute or hot sulfuric acid');
      }
    } else if (isHydrochloricAcid) {
      rating = 'not-recommended';
      notes.push('HCl causes rapid attack on carbon steel');
    } else if (isCaustic && (fluid.concentration ?? 0) < 50) {
      rating = 'good';
      notes.push('Suitable for moderate caustic concentrations');
      maxTemperatureC = 80;
    } else if (fluid.temperatureC > 200) {
      rating = 'fair';
      notes.push('Consider high-temperature creep effects above 200°C');
    }
  }

  if (material.code === '304SS') {
    if (isSeawater || fluid.hasChlorides) {
      rating = 'poor';
      notes.push('304SS is susceptible to chloride stress corrosion cracking');
    } else if (isSulfuricAcid) {
      rating = 'not-recommended';
      notes.push('304SS has poor resistance to sulfuric acid');
    } else if (isHydrochloricAcid) {
      rating = 'not-recommended';
      notes.push('304SS rapidly attacked by HCl');
    } else if (isNitricAcid && (fluid.concentration ?? 0) < 65) {
      rating = 'excellent';
      notes.push('Excellent for dilute nitric acid');
    }
  }

  if (material.code === '316SS' || material.code === '316LSS') {
    if (isSeawater && fluid.temperatureC < 30) {
      rating = 'fair';
      notes.push('316SS provides moderate seawater resistance at low temperatures');
      maxTemperatureC = 30;
    } else if (isSeawater) {
      rating = 'poor';
      notes.push('Crevice corrosion risk in warm seawater');
    } else if (isSulfuricAcid) {
      rating = 'poor';
      notes.push('316SS has limited sulfuric acid resistance');
    } else if (isHydrochloricAcid) {
      rating = 'not-recommended';
      notes.push('316SS attacked by HCl at all concentrations');
    } else if (fluid.hasChlorides && fluid.temperatureC > 60) {
      rating = 'fair';
      notes.push('Chloride SCC risk above 60°C');
      maxTemperatureC = 60;
    }
  }

  if (material.category === 'duplex') {
    if (isSeawater) {
      rating = 'excellent';
      notes.push('Duplex provides excellent seawater resistance');
      if (material.code === 'DPX') {
        maxTemperatureC = 80;
      } else {
        maxTemperatureC = 110;
      }
    } else if (fluid.hasChlorides) {
      rating = 'good';
      notes.push('Good chloride resistance but verify temperature limits');
    } else if (isSulfuricAcid) {
      rating = 'fair';
      notes.push('Limited sulfuric acid resistance');
    } else if (isHydrochloricAcid) {
      rating = 'poor';
      notes.push('Not recommended for HCl service');
    } else if (isCaustic) {
      rating = 'good';
      notes.push('Suitable for caustic service within temperature limits');
      maxTemperatureC = 100;
    }
  }

  if (material.code === 'A20') {
    if (isSulfuricAcid) {
      rating = 'excellent';
      notes.push('Alloy 20 is the standard choice for sulfuric acid');
    } else if (isHydrochloricAcid) {
      rating = 'fair';
      notes.push('Limited HCl resistance at low concentrations only');
    } else if (fluid.hasChlorides) {
      rating = 'excellent';
      notes.push('Excellent chloride resistance');
    }
  }

  if (material.code === 'HC276') {
    if (isHydrochloricAcid) {
      rating = 'excellent';
      notes.push('Hastelloy C-276 is the premier HCl-resistant alloy');
    } else if (isSulfuricAcid) {
      rating = 'excellent';
      notes.push('Excellent sulfuric acid resistance across concentrations');
    } else if (fluid.hasChlorides) {
      rating = 'excellent';
      notes.push('Outstanding chloride resistance');
    } else if (fluid.hasH2S) {
      rating = 'excellent';
      notes.push('Excellent sour service performance');
    }
  }

  if (material.code === 'M400') {
    if (isSeawater) {
      rating = 'excellent';
      notes.push('Monel has exceptional seawater resistance');
    } else if (isHydrochloricAcid && (fluid.concentration ?? 0) < 15) {
      rating = 'good';
      notes.push('Good for dilute HCl applications');
    } else if (isSulfuricAcid) {
      rating = 'fair';
      notes.push('Limited sulfuric acid resistance');
    } else if (isAmmonia) {
      rating = 'not-recommended';
      notes.push('Monel is susceptible to ammonia stress corrosion');
    }
  }

  if (material.code === 'Ti') {
    if (isSeawater) {
      rating = 'excellent';
      notes.push('Titanium provides the best seawater resistance');
    } else if (isHydrochloricAcid) {
      rating = 'good';
      notes.push('Good HCl resistance at moderate concentrations');
    } else if (isNitricAcid) {
      rating = 'excellent';
      notes.push('Excellent nitric acid resistance');
    } else if (isSulfuricAcid && (fluid.concentration ?? 0) > 80) {
      rating = 'poor';
      notes.push('Concentrated sulfuric acid attacks titanium');
    } else if (isCaustic) {
      rating = 'poor';
      notes.push('Titanium has limited caustic resistance');
    }
  }

  if (fluid.hasH2S && material.category === 'carbon-steel') {
    rating = 'poor';
    notes.push('H2S causes sulfide stress cracking - use NACE MR0175 compliant materials');
  }

  if (isCrudeOil) {
    if (material.category === 'carbon-steel') {
      if (fluid.temperatureC < 200 && !fluid.hasH2S) {
        rating = 'good';
        notes.push('Suitable for sweet crude service');
      } else if (fluid.hasH2S) {
        rating = 'fair';
        notes.push('Require NACE-compliant grades for sour crude');
      }
    } else if (material.category === 'stainless' || material.category === 'duplex') {
      rating = 'excellent';
      notes.push('Excellent corrosion resistance in crude oil service');
    }
  }

  if (notes.length === 0) {
    notes.push('General compatibility - verify for specific application');
  }

  return {
    material: material.name,
    rating,
    notes,
    maxTemperatureC,
  };
};

export function MaterialCompatibilityChecker({
  onCompatibilityResult,
}: MaterialCompatibilityCheckerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [fluid, setFluid] = useState<FluidCharacteristics>({
    fluidName: '',
    temperatureC: 25,
    concentration: undefined,
    ph: undefined,
    hasChlorides: false,
    hasH2S: false,
    hasCO2: false,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = FLUID_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setFluid((prev) => ({
        ...prev,
        fluidName: preset.name,
        temperatureC: preset.defaultTemp,
        concentration: preset.defaultConcentration,
        hasChlorides: preset.name === 'Seawater',
      }));
    }
  };

  const result = useMemo((): CompatibilityResult | null => {
    if (!fluid.fluidName) return null;

    const ratings = MATERIALS.map((mat) => evaluateMaterialCompatibility(fluid, mat))
      .sort((a, b) => {
        const order = { 'excellent': 0, 'good': 1, 'fair': 2, 'poor': 3, 'not-recommended': 4 };
        return order[a.rating] - order[b.rating];
      });

    const warnings: string[] = [];
    if (fluid.temperatureC > 200) {
      warnings.push('High temperature service - verify material creep and strength properties');
    }
    if (fluid.temperatureC < 0) {
      warnings.push('Low temperature service - verify material impact toughness');
    }
    if (fluid.hasH2S) {
      warnings.push('Sour service - materials must comply with NACE MR0175/ISO 15156');
    }

    const recommendedMaterial = ratings.find(r => r.rating === 'excellent')?.material
      ?? ratings.find(r => r.rating === 'good')?.material
      ?? ratings[0].material;

    const compatResult: CompatibilityResult = {
      fluid,
      ratings,
      recommendedMaterial,
      warnings,
    };

    if (onCompatibilityResult) {
      onCompatibilityResult(compatResult);
    }

    return compatResult;
  }, [fluid, onCompatibilityResult]);

  const ratingConfig = {
    'excellent': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', label: 'Excellent' },
    'good': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', label: 'Good' },
    'fair': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', label: 'Fair' },
    'poor': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', label: 'Poor' },
    'not-recommended': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', label: 'Not Recommended' },
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Material Compatibility Checker</h3>
        <p className="text-sm text-gray-600 mt-1">
          Evaluate pump material suitability for your application
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fluid Preset
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a fluid...</option>
              <optgroup label="Water">
                {FLUID_PRESETS.filter((p) => p.category === 'water').map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </optgroup>
              <optgroup label="Hydrocarbons">
                {FLUID_PRESETS.filter((p) => p.category === 'hydrocarbon').map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </optgroup>
              <optgroup label="Acids">
                {FLUID_PRESETS.filter((p) => p.category === 'acid').map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </optgroup>
              <optgroup label="Caustics">
                {FLUID_PRESETS.filter((p) => p.category === 'caustic').map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </optgroup>
              <optgroup label="Other">
                {FLUID_PRESETS.filter((p) => p.category === 'solvent' || p.category === 'other').map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or Enter Fluid Name
            </label>
            <input
              type="text"
              value={fluid.fluidName}
              onChange={(e) => setFluid((prev) => ({ ...prev, fluidName: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 20% Sulfuric Acid"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature (°C)
            </label>
            <input
              type="number"
              value={fluid.temperatureC}
              onChange={(e) => setFluid((prev) => ({ ...prev, temperatureC: parseFloat(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concentration (%)
            </label>
            <input
              type="number"
              value={fluid.concentration ?? ''}
              onChange={(e) => setFluid((prev) => ({ ...prev, concentration: e.target.value ? parseFloat(e.target.value) : undefined }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="If applicable"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              pH
            </label>
            <input
              type="number"
              value={fluid.ph ?? ''}
              onChange={(e) => setFluid((prev) => ({ ...prev, ph: e.target.value ? parseFloat(e.target.value) : undefined }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
              max={14}
              step={0.1}
              placeholder="0-14"
            />
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {showAdvanced ? 'Hide' : 'Show'} Contaminants
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Contaminants Present</h4>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fluid.hasChlorides ?? false}
                  onChange={(e) => setFluid((prev) => ({ ...prev, hasChlorides: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Chlorides (Cl⁻)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fluid.hasH2S ?? false}
                  onChange={(e) => setFluid((prev) => ({ ...prev, hasH2S: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Hydrogen Sulfide (H₂S)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fluid.hasCO2 ?? false}
                  onChange={(e) => setFluid((prev) => ({ ...prev, hasCO2: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Carbon Dioxide (CO₂)</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {result.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">Warnings</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {result.warnings.map((warning, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800">Recommended Material</h4>
            <p className="text-lg font-bold text-blue-900 mt-1">{result.recommendedMaterial}</p>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-3">Material Compatibility Ratings</h4>
            <div className="space-y-2">
              {result.ratings.map((rating) => {
                const config = ratingConfig[rating.rating];
                return (
                  <div
                    key={rating.material}
                    className={`${config.bg} ${config.border} border rounded-lg p-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">{rating.material}</div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    </div>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      {rating.notes.map((note, idx) => (
                        <li key={idx}>• {note}</li>
                      ))}
                      {rating.maxTemperatureC !== undefined && (
                        <li className="text-gray-500">Max recommended temp: {rating.maxTemperatureC}°C</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Disclaimer</h4>
            <p className="text-xs text-gray-500">
              This tool provides general guidance only. Actual material selection should be verified
              through detailed corrosion analysis, laboratory testing, and consultation with
              metallurgical experts. Field conditions may vary significantly from general guidelines.
              Always consult material suppliers and relevant standards (NACE, ASTM, API) for final selection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialCompatibilityChecker;
