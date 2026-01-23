'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useGasketMaterials } from '@/app/lib/hooks/useGasketMaterials';
import type { GasketMaterial, GasketCompatibilityResponse } from '@/app/lib/pipe-steel-work/types';

interface GasketMaterialSelectorProps {
  value: string | null;
  onChange: (gasketCode: string | null) => void;
  flangeFace?: string;
  designTempC?: number;
  designPressureBar?: number;
  serviceFluid?: string;
  flangeMaterial?: string;
  disabled?: boolean;
  showCompatibilityCheck?: boolean;
  className?: string;
}

const GASKET_TYPE_LABELS: Record<string, string> = {
  spiral_wound: 'Spiral Wound',
  ring_joint: 'Ring Type Joint (RTJ)',
  soft_cut: 'Soft Cut Sheet',
  ptfe: 'PTFE',
  graphite: 'Graphite',
  rubber: 'Rubber',
  compressed_asbestos_free: 'Compressed AF',
};

const SERVICE_FLUID_OPTIONS = [
  { value: 'water', label: 'Water' },
  { value: 'steam', label: 'Steam' },
  { value: 'air', label: 'Air / Gas' },
  { value: 'hydrocarbons', label: 'Hydrocarbons (Oil/Gas)' },
  { value: 'chemicals', label: 'Chemicals (General)' },
  { value: 'corrosive', label: 'Corrosive Chemicals' },
  { value: 'food_grade', label: 'Food Grade' },
  { value: 'high_pressure', label: 'High Pressure Service' },
  { value: 'high_temp', label: 'High Temperature Service' },
];

export default function GasketMaterialSelector({
  value,
  onChange,
  flangeFace,
  designTempC,
  designPressureBar,
  serviceFluid,
  flangeMaterial,
  disabled = false,
  showCompatibilityCheck = true,
  className = '',
}: GasketMaterialSelectorProps) {
  const { materials, isLoading, materialByCode, checkCompatibility, isCheckingCompatibility } = useGasketMaterials();
  const [compatibility, setCompatibility] = useState<GasketCompatibilityResponse | null>(null);
  const [localServiceFluid, setLocalServiceFluid] = useState(serviceFluid || '');

  const selectedMaterial = useMemo(() => (value ? materialByCode(value) : null), [value, materialByCode]);

  const materialsByType = useMemo(() => {
    const grouped: Record<string, GasketMaterial[]> = {};
    materials.forEach((m) => {
      const type = m.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(m);
    });
    return grouped;
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    if (!flangeFace) return materials;
    return materials.filter((m) => m.compatibleFlanges.includes(flangeFace));
  }, [materials, flangeFace]);

  useEffect(() => {
    if (!showCompatibilityCheck || !value || !flangeMaterial) {
      setCompatibility(null);
      return;
    }

    const fluid = serviceFluid || localServiceFluid;
    if (!fluid) {
      setCompatibility(null);
      return;
    }

    const abortController = new AbortController();

    const runCheck = async () => {
      const result = await checkCompatibility({
        gasketCode: value,
        flangeMaterial: flangeMaterial,
        serviceFluid: fluid,
        designTempC: designTempC || 20,
        designPressureBar: designPressureBar || 10,
        flangeFace: flangeFace,
      });
      if (!abortController.signal.aborted) {
        setCompatibility(result);
      }
    };

    const timeoutId = setTimeout(runCheck, 300);
    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [
    value,
    flangeFace,
    designTempC,
    designPressureBar,
    serviceFluid,
    localServiceFluid,
    flangeMaterial,
    showCompatibilityCheck,
    checkCompatibility,
  ]);

  const hasWarnings = compatibility && !compatibility.isCompatible;
  const hasRecommendations = compatibility && compatibility.recommendations.length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gasket Material
            {isLoading && <span className="ml-2 text-xs text-gray-400">(loading...)</span>}
          </label>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled || isLoading}
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              hasWarnings ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          >
            <option value="">Select gasket material...</option>
            {Object.entries(materialsByType).map(([type, mats]) => {
              const filteredMats = mats.filter((m) => !flangeFace || m.compatibleFlanges.includes(flangeFace));
              if (filteredMats.length === 0) return null;
              return (
                <optgroup key={type} label={GASKET_TYPE_LABELS[type] || type}>
                  {filteredMats.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      </div>

      {selectedMaterial && (
        <div className="bg-gray-50 rounded-md p-3 text-sm">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Temp Range:</span>
              <p className="font-medium text-gray-700">
                {selectedMaterial.minTempC}°C to {selectedMaterial.maxTempC}°C
              </p>
            </div>
            <div>
              <span className="text-gray-500">Max Pressure:</span>
              <p className="font-medium text-gray-700">{selectedMaterial.maxPressureBar} bar</p>
            </div>
            <div>
              <span className="text-gray-500">Flange Faces:</span>
              <p className="font-medium text-gray-700">{selectedMaterial.compatibleFlanges.join(', ')}</p>
            </div>
          </div>
          {selectedMaterial.notes && <p className="mt-2 text-xs text-gray-500 italic">{selectedMaterial.notes}</p>}
        </div>
      )}

      {showCompatibilityCheck && selectedMaterial && (
        <div>
          {!serviceFluid && (
            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Service Fluid (for compatibility check)</label>
              <select
                value={localServiceFluid}
                onChange={(e) => setLocalServiceFluid(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select service fluid...</option>
                {SERVICE_FLUID_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isCheckingCompatibility && (
            <p className="text-xs text-gray-500 animate-pulse">Checking compatibility...</p>
          )}

          {compatibility && (
            <div
              className={`rounded-md p-3 ${
                compatibility.isCompatible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {compatibility.isCompatible ? (
                  <>
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-green-700">Compatible (Score: {compatibility.score}/100)</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm font-medium text-red-700">Compatibility Issues (Score: {compatibility.score}/100)</span>
                  </>
                )}
              </div>

              {compatibility.warnings.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-red-700 mb-1">Warnings:</p>
                  <ul className="text-xs text-red-600 space-y-0.5">
                    {compatibility.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-red-400 mt-0.5">•</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasRecommendations && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Recommendations:</p>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    {compatibility.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-gray-400 mt-0.5">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {compatibility.alternatives && compatibility.alternatives.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-1">Alternative gaskets:</p>
                  <div className="flex flex-wrap gap-1">
                    {compatibility.alternatives.map((alt) => {
                      const altMaterial = materialByCode(alt);
                      return (
                        <button
                          key={alt}
                          type="button"
                          onClick={() => onChange(alt)}
                          className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 transition-colors"
                        >
                          {altMaterial?.name || alt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
