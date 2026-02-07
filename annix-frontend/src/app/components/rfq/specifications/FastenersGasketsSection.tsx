"use client";

export interface BoltRecommendation {
  grade: string;
  reason: string;
}

export interface GasketRecommendation {
  gasketCode: string;
  gasketName: string;
  reason: string;
}

export interface FastenersGasketsSectionProps {
  globalSpecs: {
    fastenersConfirmed?: boolean;
    boltGrade?: string;
    gasketType?: string;
    workingTemperatureC?: number;
  };
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
  boltRecommendation?: BoltRecommendation;
  gasketRecommendation?: GasketRecommendation;
  currentPressureClass?: { designation: string };
}

export function FastenersGasketsSection({
  globalSpecs,
  onUpdateGlobalSpecs,
  boltRecommendation,
  gasketRecommendation,
  currentPressureClass,
}: FastenersGasketsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
        <span className="text-2xl">&#9881;&#65039;</span>
        <h3 className="text-xl font-bold text-gray-900">Nuts, Bolts, Washers & Gaskets</h3>
      </div>

      {globalSpecs?.fastenersConfirmed && globalSpecs?.boltGrade && globalSpecs?.gasketType && (
        <div className="bg-green-100 border border-green-400 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-green-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Bolts:</span> {globalSpecs.boltGrade}{" "}
              <span className="mx-2">&bull;</span> <span className="font-medium">Gasket:</span>{" "}
              {globalSpecs.gasketType}
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  fastenersConfirmed: false,
                })
              }
              className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {!globalSpecs?.fastenersConfirmed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Bolt, Nut & Washer Grade
              </label>
              <select
                value={globalSpecs?.boltGrade || ""}
                onChange={(e) =>
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    boltGrade: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              >
                <option value="">Select bolt grade...</option>
                <optgroup label="Carbon Steel (Standard Temperature)">
                  <option value="B7/2H">ASTM A193 B7 / A194 2H (Standard, -40°C to 400°C)</option>
                  <option value="B7/2H-HDG">ASTM A193 B7 / A194 2H - Hot Dip Galvanized</option>
                  <option value="B16/4">ASTM A193 B16 / A194 4 (High Temperature, to 540°C)</option>
                </optgroup>
                <optgroup label="Low Temperature Service">
                  <option value="B7M/2HM">ASTM A320 B7M / A194 2HM (-100°C to 200°C)</option>
                  <option value="L7/7">ASTM A320 L7 / A194 7 (-100°C to 200°C)</option>
                  <option value="L7M/7M">ASTM A320 L7M / A194 7M (-100°C to 200°C)</option>
                  <option value="L43/7">ASTM A320 L43 / A194 7 (to -100°C)</option>
                </optgroup>
                <optgroup label="Stainless Steel">
                  <option value="B8/8">ASTM A193 B8 / A194 8 (304 SS)</option>
                  <option value="B8M/8M">ASTM A193 B8M / A194 8M (316 SS)</option>
                  <option value="B8C/8C">ASTM A193 B8C / A194 8C (347 SS)</option>
                  <option value="B8T/8T">ASTM A193 B8T / A194 8T (321 SS)</option>
                </optgroup>
                <optgroup label="High Alloy / Special">
                  <option value="B8S/8S">ASTM A193 B8S / A194 8S (Duplex 2205)</option>
                  <option value="Monel">Monel 400/K-500</option>
                  <option value="Inconel">Inconel 625/718</option>
                </optgroup>
              </select>
              {!globalSpecs?.boltGrade &&
                boltRecommendation &&
                globalSpecs?.workingTemperatureC !== undefined && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
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
                      <div className="flex-1">
                        <p className="text-blue-800">
                          <span className="font-medium">
                            Recommended: {boltRecommendation.grade}
                          </span>
                          <span className="text-blue-600 ml-1">- {boltRecommendation.reason}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              boltGrade: boltRecommendation.grade,
                            })
                          }
                          className="mt-1 px-2 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              {globalSpecs?.boltGrade &&
                boltRecommendation &&
                globalSpecs.boltGrade !== boltRecommendation.grade &&
                globalSpecs?.workingTemperatureC !== undefined && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-amber-800">
                          Selected grade differs from recommendation ({boltRecommendation.grade})
                          for {globalSpecs.workingTemperatureC}°C
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              <p className="mt-1 text-xs text-gray-500">
                Grade selection affects temperature range and corrosion resistance
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Gasket Type & Thickness
              </label>
              <select
                value={globalSpecs?.gasketType || ""}
                onChange={(e) =>
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    gasketType: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              >
                <option value="">Select gasket type...</option>
                <optgroup label="Spiral Wound (ASME B16.20)">
                  <option value="SW-CGI-316">Spiral Wound - CGI/316SS - 3.2mm (Standard)</option>
                  <option value="SW-CGI-316-IR">
                    Spiral Wound - CGI/316SS with Inner Ring - 3.2mm
                  </option>
                  <option value="SW-Graphite-316">
                    Spiral Wound - Graphite/316SS - 4.5mm (High Temp)
                  </option>
                  <option value="SW-PTFE-316">
                    Spiral Wound - PTFE/316SS - 3.2mm (Chemical Service)
                  </option>
                </optgroup>
                <optgroup label="Ring Joint (RTJ) - ASME B16.20">
                  <option value="RTJ-R-SS">RTJ Ring - Soft Iron/SS 304 (R-Series)</option>
                  <option value="RTJ-RX-SS">RTJ Ring - SS 316 (RX-Series, High Pressure)</option>
                  <option value="RTJ-BX-SS">RTJ Ring - SS 316 (BX-Series, API 6A)</option>
                  <option value="RTJ-R-Inconel">
                    RTJ Ring - Inconel 625 (High Temp/Corrosive)
                  </option>
                </optgroup>
                <optgroup label="Non-Metallic">
                  <option value="PTFE-1.5">PTFE Sheet - 1.5mm (Chemical Service)</option>
                  <option value="PTFE-3.0">PTFE Sheet - 3.0mm (Chemical Service)</option>
                  <option value="Graphite-1.5">
                    Flexible Graphite - 1.5mm (High Temp to 450°C)
                  </option>
                  <option value="Graphite-3.0">
                    Flexible Graphite - 3.0mm (High Temp to 450°C)
                  </option>
                  <option value="CAF-1.5">Compressed Asbestos Free (CAF) - 1.5mm</option>
                  <option value="CAF-3.0">Compressed Asbestos Free (CAF) - 3.0mm</option>
                </optgroup>
                <optgroup label="Rubber/Elastomer">
                  <option value="EPDM-3.0">EPDM Rubber - 3.0mm (Water/Steam)</option>
                  <option value="NBR-3.0">Nitrile (NBR) - 3.0mm (Oil/Fuel)</option>
                  <option value="Viton-3.0">Viton (FKM) - 3.0mm (Chemical/High Temp)</option>
                  <option value="Neoprene-3.0">Neoprene - 3.0mm (General Purpose)</option>
                </optgroup>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select based on pressure class, temperature, and media compatibility
              </p>

              {!globalSpecs?.gasketType &&
                gasketRecommendation &&
                globalSpecs?.workingTemperatureC !== undefined && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
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
                      <div className="flex-1">
                        <p className="text-blue-900">
                          <span className="font-medium">
                            Recommended: {gasketRecommendation.gasketName}
                          </span>
                        </p>
                        <p className="text-blue-700 mt-0.5">{gasketRecommendation.reason}</p>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              gasketType: gasketRecommendation.gasketCode,
                            })
                          }
                          className="mt-1.5 px-2 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {globalSpecs?.gasketType &&
                gasketRecommendation &&
                globalSpecs.gasketType !== gasketRecommendation.gasketCode &&
                globalSpecs?.workingTemperatureC !== undefined && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-amber-800">
                          Selected gasket differs from recommendation for{" "}
                          {globalSpecs.workingTemperatureC}°C / Class{" "}
                          {currentPressureClass?.designation || "N/A"}
                        </p>
                        <p className="text-amber-700 text-[10px] mt-0.5">
                          Recommended: {gasketRecommendation.gasketName}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
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
              <p className="text-amber-700 text-xs">
                Bolt quantities and dimensions will be automatically calculated based on your flange
                selections per ASME B16.5/B16.47 standards.
              </p>
            </div>
          </div>

          {globalSpecs?.boltGrade && globalSpecs?.gasketType && (
            <div className="flex justify-end" data-field="fastenersConfirmation">
              <button
                type="button"
                onClick={() =>
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    fastenersConfirmed: true,
                  })
                }
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                Confirm Fasteners & Gaskets
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
