"use client";

import { memo } from "react";
import { Select } from "@/app/components/ui/Select";
import { flangeTypesForStandardCode } from "@/app/lib/query/hooks";
import { type FlangeStandardItem, type PressureClassItem } from "../shared";
import type { FittingFormLogic } from "./useFittingFormLogic";

const FittingStubsConfigSectionInner = (props: { logic: FittingFormLogic }) => {
  const {
    allFlangeTypes,
    entry,
    getFilteredPressureClasses,
    groupedSteelOptions,
    isLateral,
    masterData,
    onUpdateEntry,
    pressureClassesByStandard,
    rawNumberOfStubs,
    rawStubs2,
    specs,
  } = props.logic;
  if (!(isLateral && specs.hasStubs)) {
    return null;
  }
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
      <h4 className="text-sm font-bold text-orange-900 border-b border-orange-400 pb-1.5 mb-3">
        Stub Configuration
      </h4>
      <div className="space-y-4">
        {/* Number of Stubs */}
        <div className="flex items-start gap-4">
          <div className="w-32">
            <label className="block text-xs font-semibold text-orange-900 mb-1">No. of Stubs</label>
            <select
              value={rawNumberOfStubs || 1}
              onChange={(e) => {
                const count = Number(e.target.value) as 1 | 2 | 3;
                const rawStubs = specs.stubs;
                const currentStubs = rawStubs || [];
                const defaultStub = {
                  steelSpecId: specs.steelSpecificationId,
                  nominalBoreMm: 50,
                  distanceFromOutletMm: 100,
                  stubLengthMm: 150,
                  outletLocation: "branch" as const,
                  positionDegrees: 0,
                };

                let newStubs;
                if (count === 1) {
                  const rawItem0 = currentStubs[0];
                  newStubs = [rawItem0 || defaultStub];
                } else if (count === 2) {
                  const rawItem02 = currentStubs[0];
                  const rawItem1 = currentStubs[1];
                  newStubs = [
                    rawItem02 || defaultStub,
                    rawItem1 || {
                      ...defaultStub,
                      outletLocation: "inlet" as const,
                    },
                  ];
                } else {
                  const rawItem03 = currentStubs[0];
                  const rawItem12 = currentStubs[1];
                  const rawItem2 = currentStubs[2];
                  newStubs = [
                    {
                      ...(rawItem03 || defaultStub),
                      outletLocation: "inlet" as const,
                    },
                    {
                      ...(rawItem12 || defaultStub),
                      outletLocation: "outlet" as const,
                    },
                    {
                      ...(rawItem2 || defaultStub),
                      outletLocation: "branch" as const,
                    },
                  ];
                }

                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    numberOfStubs: count,
                    stubs: newStubs,
                  },
                });
              }}
              className="w-full px-2 py-1.5 border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
            >
              <option value={1}>1 Stub</option>
              <option value={2}>2 Stubs</option>
              <option value={3}>3 Stubs</option>
            </select>
          </div>
        </div>

        {/* Stub Details */}
        <div className="space-y-3">
          {(rawStubs2 || []).map((stub: any, stubIndex: number) => {
            const rawHasBlankFlange = stub.hasBlankFlange;
            const rawOutletLocation = stub.outletLocation;
            const rawSteelSpecId = stub.steelSpecId;
            const rawNominalBoreMm = stub.nominalBoreMm;
            const rawDistanceFromOutletMm = stub.distanceFromOutletMm;
            const rawStubLengthMm = stub.stubLengthMm;
            const rawPositionDegrees = stub.positionDegrees;
            const rawEndConfiguration = stub.endConfiguration;
            const rawFlangeStandardId7 = stub.flangeStandardId;
            const rawFlangePressureClassId6 = stub.flangePressureClassId;

            return (
              <div key={stubIndex} className="bg-white border border-orange-200 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-orange-800">Stub {stubIndex + 1}</p>
                  {stub.endConfiguration === "flanged" && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rawHasBlankFlange || false}
                        onChange={(e) => {
                          const rawStubs3 = specs.stubs;
                          const newStubs = [...(rawStubs3 || [])];
                          newStubs[stubIndex] = {
                            ...newStubs[stubIndex],
                            hasBlankFlange: e.target.checked,
                          };
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, stubs: newStubs },
                          });
                        }}
                        className="w-3.5 h-3.5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-xs font-medium text-gray-700">
                        Include Blank Flange
                      </span>
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {/* Outlet Location */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Outlet Location
                    </label>
                    <select
                      value={rawOutletLocation || "branch"}
                      onChange={(e) => {
                        const rawStubs4 = specs.stubs;
                        const newStubs = [...(rawStubs4 || [])];
                        newStubs[stubIndex] = {
                          ...newStubs[stubIndex],
                          outletLocation: e.target.value,
                        };
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, stubs: newStubs },
                        });
                      }}
                      disabled={specs.numberOfStubs === 3}
                      className={`w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 ${
                        specs.numberOfStubs === 3 ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                      }`}
                    >
                      <option value="inlet">Inlet (A)</option>
                      <option value="outlet">Outlet (B)</option>
                      <option value="branch">Branch</option>
                    </select>
                  </div>

                  {/* Steel Spec */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Steel Spec
                    </label>
                    <Select
                      value={String(rawSteelSpecId || "")}
                      onChange={(value) => {
                        const rawStubs5 = specs.stubs;
                        const newStubs = [...(rawStubs5 || [])];
                        newStubs[stubIndex] = {
                          ...newStubs[stubIndex],
                          steelSpecId: value ? parseInt(value, 10) : undefined,
                        };
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, stubs: newStubs },
                        });
                      }}
                      options={[]}
                      groupedOptions={groupedSteelOptions}
                      placeholder="Select..."
                    />
                  </div>

                  {/* Nominal Bore */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      NB (mm)
                    </label>
                    <select
                      value={rawNominalBoreMm || ""}
                      onChange={(e) => {
                        const rawStubs6 = specs.stubs;
                        const newStubs = [...(rawStubs6 || [])];
                        newStubs[stubIndex] = {
                          ...newStubs[stubIndex],
                          nominalBoreMm: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        };
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, stubs: newStubs },
                        });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                    >
                      <option value="">Select...</option>
                      {[15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300].map((nb) => (
                        <option key={nb} value={nb}>
                          {nb}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Distance from Outlet */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Distance from Flange Face (mm)
                    </label>
                    <input
                      type="number"
                      value={rawDistanceFromOutletMm || ""}
                      onChange={(e) => {
                        const rawStubs7 = specs.stubs;
                        const newStubs = [...(rawStubs7 || [])];
                        newStubs[stubIndex] = {
                          ...newStubs[stubIndex],
                          distanceFromOutletMm: e.target.value ? Number(e.target.value) : undefined,
                        };
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, stubs: newStubs },
                        });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                      placeholder="e.g., 100"
                      min="0"
                    />
                  </div>

                  {/* Stub Length */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Stub Length (mm)
                    </label>
                    <input
                      type="number"
                      value={rawStubLengthMm || ""}
                      onChange={(e) => {
                        const rawStubs8 = specs.stubs;
                        const newStubs = [...(rawStubs8 || [])];
                        newStubs[stubIndex] = {
                          ...newStubs[stubIndex],
                          stubLengthMm: e.target.value ? Number(e.target.value) : undefined,
                        };
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, stubs: newStubs },
                        });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                      placeholder="e.g., 150"
                      min="0"
                    />
                  </div>

                  {/* Position (Degrees) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Position (°)
                    </label>
                    <select
                      value={rawPositionDegrees || 0}
                      onChange={(e) => {
                        const rawStubs9 = specs.stubs;
                        const newStubs = [...(rawStubs9 || [])];
                        newStubs[stubIndex] = {
                          ...newStubs[stubIndex],
                          positionDegrees: Number(e.target.value),
                        };
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, stubs: newStubs },
                        });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                    >
                      <option value={0}>0° (Top)</option>
                      <option value={45}>45°</option>
                      <option value={90}>90° (Right)</option>
                      <option value={135}>135°</option>
                      <option value={180}>180° (Bottom)</option>
                      <option value={225}>225°</option>
                      <option value={270}>270° (Left)</option>
                      <option value={315}>315°</option>
                    </select>
                  </div>
                </div>
                {/* Flange Specifications Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-orange-200">
                  {/* End Configuration */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      End Configuration
                    </label>
                    <select
                      value={rawEndConfiguration || "plain"}
                      onChange={(e) => {
                        const rawStubs10 = specs.stubs;
                        const newStubs = [...(rawStubs10 || [])];
                        newStubs[stubIndex] = {
                          ...newStubs[stubIndex],
                          endConfiguration: e.target.value,
                          hasBlankFlange: e.target.value === "plain" ? false : stub.hasBlankFlange,
                        };
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, stubs: newStubs },
                        });
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                    >
                      <option value="plain">Plain (No Flange)</option>
                      <option value="flanged">Flanged</option>
                      <option value="rf">R/F (Rotating Flange)</option>
                    </select>
                  </div>

                  {/* Flange Standard - Only show if flanged or rf */}
                  {(stub.endConfiguration === "flanged" || stub.endConfiguration === "rf") && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Flange Standard
                      </label>
                      <select
                        value={rawFlangeStandardId7 || ""}
                        onChange={(e) => {
                          const standardId = parseInt(e.target.value, 10) || undefined;
                          const rawStubs11 = specs.stubs;
                          const newStubs = [...(rawStubs11 || [])];
                          newStubs[stubIndex] = {
                            ...newStubs[stubIndex],
                            flangeStandardId: standardId,
                            flangePressureClassId: undefined,
                          };
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, stubs: newStubs },
                          });
                          if (standardId) {
                            getFilteredPressureClasses(standardId);
                          }
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                      >
                        <option value="">Select...</option>
                        {masterData.flangeStandards?.map((standard: FlangeStandardItem) => (
                          <option key={standard.id} value={standard.id}>
                            {standard.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Pressure Class - Only show if flanged or rf */}
                  {(stub.endConfiguration === "flanged" || stub.endConfiguration === "rf") && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Pressure Class
                      </label>
                      <select
                        value={rawFlangePressureClassId6 || ""}
                        onChange={(e) => {
                          const rawStubs12 = specs.stubs;
                          const newStubs = [...(rawStubs12 || [])];
                          newStubs[stubIndex] = {
                            ...newStubs[stubIndex],
                            flangePressureClassId: parseInt(e.target.value, 10) || undefined,
                          };
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, stubs: newStubs },
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                      >
                        <option value="">Select...</option>
                        {(() => {
                          const stdId = stub.flangeStandardId;
                          const rawStdId2 = pressureClassesByStandard[stdId];
                          const rawPressureClasses2 = masterData.pressureClasses;
                          const filtered = stdId ? rawStdId2 || [] : rawPressureClasses2 || [];
                          const seen = new Set<string>();
                          return filtered
                            .filter((pc: PressureClassItem) => {
                              const label = pc.designation?.replace(/\/\d+$/, "") || pc.designation;
                              if (seen.has(label)) return false;
                              seen.add(label);
                              return true;
                            })
                            .map((pressureClass: PressureClassItem) => (
                              <option key={pressureClass.id} value={pressureClass.id}>
                                {pressureClass.designation?.replace(/\/\d+$/, "") ||
                                  pressureClass.designation}
                              </option>
                            ));
                        })()}
                      </select>
                    </div>
                  )}

                  {/* Flange Type - Only show if flanged or rf */}
                  {(stub.endConfiguration === "flanged" || stub.endConfiguration === "rf") &&
                    (() => {
                      const stubStandard = masterData.flangeStandards?.find(
                        (fs: FlangeStandardItem) => fs.id === stub.flangeStandardId,
                      );
                      const stubIsSabs1123 =
                        stubStandard?.code?.toUpperCase().includes("SABS") &&
                        stubStandard?.code?.includes("1123");
                      const stubIsBs4504 =
                        stubStandard?.code?.toUpperCase().includes("BS") &&
                        stubStandard?.code?.includes("4504");
                      const stubHasFlangeTypes = stubIsSabs1123 || stubIsBs4504;
                      const stubFlangeTypes = stubIsSabs1123
                        ? flangeTypesForStandardCode(allFlangeTypes, "SABS 1123") || []
                        : flangeTypesForStandardCode(allFlangeTypes, "BS 4504") || [];

                      const rawFlangeTypeCode5 = stub.flangeTypeCode;

                      return stubHasFlangeTypes ? (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Flange Type
                          </label>
                          <select
                            value={rawFlangeTypeCode5 || ""}
                            onChange={(e) => {
                              const rawStubs13 = specs.stubs;
                              const newStubs = [...(rawStubs13 || [])];
                              const rawValue6 = e.target.value;
                              newStubs[stubIndex] = {
                                ...newStubs[stubIndex],
                                flangeTypeCode: rawValue6 || undefined,
                              };
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, stubs: newStubs },
                              });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                          >
                            <option value="">Select...</option>
                            {stubFlangeTypes.map((ft) => (
                              <option key={ft.code} value={ft.code} title={ft.description}>
                                {ft.name} ({ft.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null;
                    })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const FittingStubsConfigSection = memo(FittingStubsConfigSectionInner);
