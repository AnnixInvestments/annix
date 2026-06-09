"use client";
import { GroupExportsButtons } from "./boq/components/GroupExportsButtons";
import { filterByMaterial, formatWeight } from "./boq/helpers";
import type { ExportableSubsection } from "./boq/types";

import { type BOQStepProps, useBOQLogic } from "./boq/useBOQLogic";

export default function BOQStep(props: BOQStepProps) {
  const { onPrevStep, onSubmit, onResubmit, onResendBoq, isEditing, clarificationsSkipped } = props;
  const {
    consolidatedBends,
    consolidatedBlankFlanges,
    consolidatedBnwSets,
    consolidatedFasteners,
    consolidatedFittings,
    consolidatedFlanges,
    consolidatedGaskets,
    consolidatedHdpeOther,
    consolidatedHdpeStubs,
    consolidatedPipes,
    consolidatedPvcOther,
    consolidatedPvcStubs,
    consolidatedSteelOther,
    consolidatedTanks,
    consolidatedUnidentified,
    consolidatedValves,
    entries,
    exportGroup,
    exportToExcel,
    globalSpecs,
    isUnregisteredCustomer,
    loading,
    masterData,
    maybeRenderTable,
    omittedEntries,
    rawCustomerName2,
    rawGasketType,
    rawProjectName3,
    renderConsolidatedTable,
    requiredProducts,
    restrictionPopup,
    setRestrictionPopup,
    showRestrictionPopup,
    totalWeight,
  } = useBOQLogic(props);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bill of Quantities (BOQ)</h2>
            <p className="text-gray-600">
              Consolidated Material Requirements - Similar items pooled together
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Project</p>
            <p className="text-xl font-bold text-blue-600">{rawProjectName3 || "Untitled"}</p>
          </div>
        </div>
      </div>
      {/* Project Info Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div>
            <p className="text-gray-500 font-medium">Customer</p>
            <p className="text-gray-900">{rawCustomerName2 || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Steel Spec</p>
            <p className="font-medium">
              {(() => {
                // Get effective steel spec for each item (item override or global fallback)
                const getEffectiveSteelSpecId = (entry: any) => {
                  const rawSteelSpecificationId2 = entry.specs?.steelSpecificationId;
                  const rawSteelSpecificationId3 = entry.specs?.steelSpecificationId;
                  return rawSteelSpecificationId3 || globalSpecs?.steelSpecificationId;
                };
                const effectiveSpecs = entries
                  .map((entry: any) => getEffectiveSteelSpecId(entry))
                  .filter(Boolean);

                // If no specs from entries, try global directly
                if (effectiveSpecs.length === 0) {
                  if (globalSpecs?.steelSpecificationId) {
                    const rawSteelSpecName2 = masterData?.steelSpecs?.find(
                      (s: any) => s.id === globalSpecs.steelSpecificationId,
                    )?.steelSpecName;

                    return rawSteelSpecName2 || "-";
                  }
                  return "-";
                }

                const firstSpec = effectiveSpecs[0];
                const allSame = effectiveSpecs.every((id: number) => id === firstSpec);
                if (allSame) {
                  const rawSteelSpecName3 = masterData?.steelSpecs?.find(
                    (s: any) => s.id === firstSpec,
                  )?.steelSpecName;
                  return rawSteelSpecName3 || "-";
                }
                return "SEE IN ITEM";
              })()}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Flange Standard</p>
            <p className="text-gray-900">
              {(() => {
                // Get effective flange standard for each item
                const getEffectiveFlangeStdId = (entry: any) => {
                  const rawFlangeStandardId5 = entry.specs?.flangeStandardId;
                  const rawFlangeStandardId6 = entry.specs?.flangeStandardId;
                  return rawFlangeStandardId6 || globalSpecs?.flangeStandardId;
                };
                const getEffectivePressureClassId = (entry: any) => {
                  const rawFlangePressureClassId2 = entry.specs?.flangePressureClassId;
                  const rawFlangePressureClassId3 = entry.specs?.flangePressureClassId;
                  return rawFlangePressureClassId3 || globalSpecs?.flangePressureClassId;
                };
                const effectiveFlanges = entries
                  .map((entry: any) => ({
                    stdId: getEffectiveFlangeStdId(entry),
                    pcId: getEffectivePressureClassId(entry),
                  }))
                  .filter((f: any) => f.stdId);

                // If no specs from entries, try global directly
                if (effectiveFlanges.length === 0) {
                  if (globalSpecs?.flangeStandardId) {
                    const rawCode = masterData?.flangeStandards?.find(
                      (s: any) => s.id === globalSpecs.flangeStandardId,
                    )?.code;

                    const flangeCode = rawCode || "";

                    const rawDesignation = masterData?.pressureClasses?.find(
                      (p: any) => p.id === globalSpecs.flangePressureClassId,
                    )?.designation;

                    const pressureClass = globalSpecs?.flangePressureClassId
                      ? rawDesignation || ""
                      : "";
                    return (flangeCode + (pressureClass ? ` ${pressureClass}` : "")).trim() || "-";
                  }
                  return "-";
                }

                const firstFlange = effectiveFlanges[0];
                const allSame = effectiveFlanges.every(
                  (f: any) => f.stdId === firstFlange.stdId && f.pcId === firstFlange.pcId,
                );
                if (allSame) {
                  const rawCode2 = masterData?.flangeStandards?.find(
                    (s: any) => s.id === firstFlange.stdId,
                  )?.code;

                  const flangeCode = rawCode2 || "";

                  const rawDesignation2 = masterData?.pressureClasses?.find(
                    (p: any) => p.id === firstFlange.pcId,
                  )?.designation;

                  const pressureClass = rawDesignation2 || "";
                  return (flangeCode + (pressureClass ? ` ${pressureClass}` : "")).trim() || "-";
                }
                return "SEE IN ITEM";
              })()}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Bolts & Nuts</p>
            <p className="text-gray-900">ISO 4014/4032 Gr 8.8 HDG</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Gasket Type</p>
            <p className="text-gray-900">{rawGasketType || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Total Items</p>
            <p className="text-gray-900">{entries.length} line items</p>
          </div>
        </div>
      </div>
      {/* Consolidated BOQ Tables */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
          Consolidated Bill of Quantities
        </h3>

        {/* Items omitted — pending drawings. Surfaced at the top of
            the BOQ so the customer can see what's been skipped before
            scrolling through the supplier sections. The
            PreQuoteClarificationsStep upstream is what populated
            omittedItemIds; the warning banner shows when the
            customer chose Skip on that step rather than supplying
            the drawings. */}
        {omittedEntries.length > 0 && (
          <details
            className={`mb-6 border rounded-lg overflow-hidden group ${
              clarificationsSkipped
                ? "bg-amber-50 border-amber-300 dark:bg-amber-900/10 dark:border-amber-800"
                : "bg-gray-50 border-gray-300 dark:bg-gray-900/10 dark:border-gray-700"
            }`}
          >
            <summary className="flex items-start gap-2 p-4 cursor-pointer list-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <svg
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${clarificationsSkipped ? "text-amber-600 dark:text-amber-400" : "text-gray-600 dark:text-gray-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {omittedEntries.length} item{omittedEntries.length === 1 ? "" : "s"} omitted —
                  drawings not provided
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {clarificationsSkipped
                    ? "You skipped the clarification step. Pricing for these items will resume once the drawings arrive."
                    : "Pricing for these items will resume once the drawings arrive."}
                </p>
              </div>
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-500 dark:text-gray-400 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <ul className="px-4 pb-4 space-y-1 text-xs text-gray-700 dark:text-gray-300">
              {omittedEntries.map((entry) => {
                const rawClient = entry.clientItemNumber;
                const numberLabel = rawClient || entry.id;
                const rawDescription = entry.description;
                const descriptionText = rawDescription || "(no description)";
                return (
                  <li key={entry.id} className="flex gap-2 min-w-0">
                    <span className="font-medium font-mono text-gray-500 dark:text-gray-400 flex-shrink-0 w-16">
                      {numberLabel}
                    </span>
                    <span className="flex-1 min-w-0 truncate" title={descriptionText}>
                      {descriptionText}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        )}

        {/* HDPE group — pipes / bends / fittings / other tagged hdpe.
            Backing flanges + their bolts/gaskets stay in the Steel
            section for v1.1.35; v1.1.36 will introduce proper stub +
            backing-flange line items here. */}
        {(() => {
          const pipes = filterByMaterial(consolidatedPipes, "hdpe");
          const bends = filterByMaterial(consolidatedBends, "hdpe");
          const fittings = filterByMaterial(consolidatedFittings, "hdpe");
          const hasContent =
            pipes.size > 0 ||
            bends.size > 0 ||
            fittings.size > 0 ||
            consolidatedHdpeOther.size > 0 ||
            consolidatedHdpeStubs.size > 0;
          if (!hasContent) return null;
          // HDPE pipes/bends/fittings are bare polymer — never coated
          // or lined — so the Int/Ext m² columns are not relevant and
          // are suppressed. The HDPE-liner-inside-steel case is a
          // steel-section item (the steel may be coated) and is
          // handled by the Steel grouping.
          const subsections: ExportableSubsection[] = [
            { title: "HDPE Pipes", items: pipes, showWeldColumns: true, showAreaColumns: false },
            { title: "HDPE Bends", items: bends, showWeldColumns: true, showAreaColumns: false },
            {
              title: "HDPE Fittings (Tees, Laterals, Reducers)",
              items: fittings,
              showWeldColumns: true,
              showAreaColumns: false,
            },
            {
              title: "HDPE Stub Ends",
              items: consolidatedHdpeStubs,
              showWeldColumns: false,
              showAreaColumns: false,
            },
            {
              title: "HDPE Other",
              items: consolidatedHdpeOther,
              showWeldColumns: false,
              showAreaColumns: false,
            },
          ];
          return (
            <section className="mb-8 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="mb-3 pb-2 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-bold text-blue-900 dark:text-blue-200">
                  HDPE — supplier section
                </h3>
                <GroupExportsButtons
                  groupName="HDPE"
                  subsections={subsections}
                  onExport={exportGroup}
                />
              </div>
              {maybeRenderTable("HDPE Pipes", pipes, "bg-blue-50", "text-blue-700", true, false)}
              {maybeRenderTable("HDPE Bends", bends, "bg-blue-50", "text-blue-700", true, false)}
              {maybeRenderTable(
                "HDPE Fittings (Tees, Laterals, Reducers)",
                fittings,
                "bg-blue-50",
                "text-blue-700",
                true,
                false,
              )}
              {maybeRenderTable(
                "HDPE Stub Ends",
                consolidatedHdpeStubs,
                "bg-blue-50",
                "text-blue-700",
              )}
              {maybeRenderTable(
                "HDPE Other (End Caps, Puddle Pipes, Boots)",
                consolidatedHdpeOther,
                "bg-blue-50",
                "text-blue-700",
              )}
              <p className="mt-3 text-xs text-blue-900/80 dark:text-blue-200/80 italic leading-snug">
                <strong>HDPE assumptions:</strong> dimensions (OD, wall, weld length, surface area)
                derived from PE100 pipe spec for the line's PN rating, per SANS ISO 4427
                manufacturer data (Flo-Tek / Marley / Sinvac equivalent). Where end config is
                flanged, a stub end + SANS 1123 Type 1 (full-face) backing flange is assumed unless
                the tender document specifies an alternative. Final HDPE OD / wall thickness to be
                rationalised by the supplier at quote against the project pressure class. Values
                marked with <strong>*</strong> were not given by the source BOQ — laterals
                interpolated/extrapolated between catalogued anchor points (DN 200, 250, 315 from
                Strongbridge); reducer branch NBs inferred from the catalogue when the source only
                gave the main end. Supplier to confirm at quote.
              </p>
            </section>
          );
        })()}

        {/* Steel group — pipes / bends / fittings / flanges /
            blank-flanges / BNW / gaskets / other tagged steel. The
            flange-related sub-sections are not partitioned by
            material in v1.1.35 because they're physically steel
            components; HDPE backing-flange entries land here too. */}
        {(() => {
          const pipes = filterByMaterial(consolidatedPipes, "steel");
          const bends = filterByMaterial(consolidatedBends, "steel");
          const fittings = filterByMaterial(consolidatedFittings, "steel");
          const showFlangeAccessories =
            requiredProducts.includes("fasteners_gaskets") ||
            consolidatedFlanges.size > 0 ||
            consolidatedBlankFlanges.size > 0;
          const hasContent =
            pipes.size > 0 ||
            bends.size > 0 ||
            fittings.size > 0 ||
            consolidatedFlanges.size > 0 ||
            consolidatedBlankFlanges.size > 0 ||
            (showFlangeAccessories &&
              (consolidatedBnwSets.size > 0 || consolidatedGaskets.size > 0)) ||
            consolidatedSteelOther.size > 0;
          if (!hasContent) return null;
          const subsections: ExportableSubsection[] = [
            { title: "Steel Pipes", items: pipes, showWeldColumns: true, showAreaColumns: true },
            { title: "Steel Bends", items: bends, showWeldColumns: true, showAreaColumns: true },
            {
              title: "Steel Fittings (Tees, Laterals, Reducers)",
              items: fittings,
              showWeldColumns: true,
              showAreaColumns: true,
            },
            {
              title: "Flanges",
              items: consolidatedFlanges,
              showWeldColumns: false,
              showAreaColumns: false,
            },
            {
              title: "Blank Flanges",
              items: consolidatedBlankFlanges,
              showWeldColumns: false,
              showAreaColumns: true,
            },
            ...(showFlangeAccessories
              ? [
                  {
                    title: "Bolt, Nut & Washer Sets",
                    items: consolidatedBnwSets,
                    showWeldColumns: false,
                    showAreaColumns: false,
                  },
                  {
                    title: "Gaskets",
                    items: consolidatedGaskets,
                    showWeldColumns: false,
                    showAreaColumns: false,
                  },
                ]
              : []),
            {
              title: "Steel Other",
              items: consolidatedSteelOther,
              showWeldColumns: false,
              showAreaColumns: false,
            },
          ];
          return (
            <section className="mb-8 bg-slate-50/30 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="mb-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-200">
                  Steel — supplier section
                </h3>
                <GroupExportsButtons
                  groupName="Steel"
                  subsections={subsections}
                  onExport={exportGroup}
                />
              </div>
              {maybeRenderTable("Steel Pipes", pipes, "bg-slate-50", "text-slate-700", true, true)}
              {maybeRenderTable("Steel Bends", bends, "bg-slate-50", "text-slate-700", true, true)}
              {maybeRenderTable(
                "Steel Fittings (Tees, Laterals, Reducers)",
                fittings,
                "bg-slate-50",
                "text-slate-700",
                true,
                true,
              )}
              {maybeRenderTable("Flanges", consolidatedFlanges, "bg-cyan-50", "text-cyan-700")}
              {maybeRenderTable(
                "Blank Flanges",
                consolidatedBlankFlanges,
                "bg-gray-50",
                "text-gray-700",
                false,
                true,
              )}
              {showFlangeAccessories &&
                maybeRenderTable(
                  "Bolt, Nut & Washer Sets",
                  consolidatedBnwSets,
                  "bg-orange-50",
                  "text-orange-700",
                )}
              {showFlangeAccessories &&
                maybeRenderTable("Gaskets", consolidatedGaskets, "bg-teal-50", "text-teal-700")}
              {maybeRenderTable(
                "Steel Other",
                consolidatedSteelOther,
                "bg-slate-50",
                "text-slate-700",
              )}
            </section>
          );
        })()}

        {/* PVC / uPVC group — pipes / bends / fittings / stubs /
            couplings / other tagged pvc. Bare PVC is not coated or
            lined, so Int/Ext m² columns are suppressed (matches the
            HDPE convention v1.5.34). uPVC items land here too for
            now; a later version will split uPVC out as its own
            top-level group once the form supports a uPVC material
            type. */}
        {(() => {
          const pipes = filterByMaterial(consolidatedPipes, "pvc");
          const bends = filterByMaterial(consolidatedBends, "pvc");
          const fittings = filterByMaterial(consolidatedFittings, "pvc");
          const hasContent =
            pipes.size > 0 ||
            bends.size > 0 ||
            fittings.size > 0 ||
            consolidatedPvcOther.size > 0 ||
            consolidatedPvcStubs.size > 0;
          if (!hasContent) return null;
          const subsections: ExportableSubsection[] = [
            { title: "PVC Pipes", items: pipes, showWeldColumns: true, showAreaColumns: false },
            { title: "PVC Bends", items: bends, showWeldColumns: true, showAreaColumns: false },
            {
              title: "PVC Fittings",
              items: fittings,
              showWeldColumns: true,
              showAreaColumns: false,
            },
            {
              title: "PVC Stub-flange Adapters",
              items: consolidatedPvcStubs,
              showWeldColumns: false,
              showAreaColumns: false,
            },
            {
              title: "PVC Other",
              items: consolidatedPvcOther,
              showWeldColumns: false,
              showAreaColumns: false,
            },
          ];
          return (
            <section className="mb-8 bg-purple-50/30 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="mb-3 pb-2 border-b border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-bold text-purple-900 dark:text-purple-200">
                  PVC / uPVC — supplier section
                </h3>
                <GroupExportsButtons
                  groupName="PVC"
                  subsections={subsections}
                  onExport={exportGroup}
                />
              </div>
              {maybeRenderTable("PVC Pipes", pipes, "bg-purple-50", "text-purple-700", true, false)}
              {maybeRenderTable("PVC Bends", bends, "bg-purple-50", "text-purple-700", true, false)}
              {maybeRenderTable(
                "PVC Fittings",
                fittings,
                "bg-purple-50",
                "text-purple-700",
                true,
                false,
              )}
              {maybeRenderTable(
                "PVC Stub-flange Adapters",
                consolidatedPvcStubs,
                "bg-purple-50",
                "text-purple-700",
              )}
              {maybeRenderTable(
                "PVC Other",
                consolidatedPvcOther,
                "bg-purple-50",
                "text-purple-700",
              )}
            </section>
          );
        })()}

        {/* Cross-material groups — valves get their own table since
            a steel-bodied gate valve and an HDPE-flanged pinch valve
            ship from the same valve supplier category. Same for
            fasteners (bolts/nuts/gaskets that aren't tied to a
            specific pipeline material). Unidentified is the last
            stop for items where Nix could not infer a productType. */}
        {consolidatedTanks.size > 0 && (
          <section className="mb-8 bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
            <div className="mb-3 pb-2 border-b border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-bold text-indigo-900 dark:text-indigo-200">
                Tanks, Chutes &amp; Vessels — supplier section
              </h3>
              <GroupExportsButtons
                groupName="Tanks, Chutes and Vessels"
                subsections={[
                  {
                    title: "Tanks, Chutes & Vessels",
                    items: consolidatedTanks,
                    showWeldColumns: false,
                    showAreaColumns: true,
                  },
                ]}
                onExport={exportGroup}
              />
            </div>
            {renderConsolidatedTable(
              "Tanks, Chutes & Vessels",
              consolidatedTanks,
              "bg-indigo-50",
              "text-indigo-700",
              false,
              true,
            )}
          </section>
        )}

        {consolidatedValves.size > 0 && (
          <section className="mb-8 bg-rose-50/30 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
            <div className="mb-3 pb-2 border-b border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                Valves — supplier section
              </h3>
              <GroupExportsButtons
                groupName="Valves"
                subsections={[
                  {
                    title: "Valves",
                    items: consolidatedValves,
                    showWeldColumns: false,
                    showAreaColumns: false,
                  },
                ]}
                onExport={exportGroup}
              />
            </div>
            {renderConsolidatedTable("Valves", consolidatedValves, "bg-rose-50", "text-rose-700")}
          </section>
        )}

        {consolidatedFasteners.size > 0 && (
          <section className="mb-8 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="mb-3 pb-2 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                Bolts, Nuts &amp; Gaskets — supplier section
              </h3>
              <GroupExportsButtons
                groupName="Bolts, Nuts and Gaskets"
                subsections={[
                  {
                    title: "Fasteners (Bolts, Nuts, Gaskets)",
                    items: consolidatedFasteners,
                    showWeldColumns: false,
                    showAreaColumns: false,
                  },
                ]}
                onExport={exportGroup}
              />
            </div>
            {renderConsolidatedTable(
              "Fasteners (Bolts, Nuts, Gaskets)",
              consolidatedFasteners,
              "bg-amber-50",
              "text-amber-700",
            )}
          </section>
        )}

        {consolidatedUnidentified.size > 0 && (
          <section className="mb-8 bg-gray-50/30 dark:bg-gray-900/10 border border-gray-300 dark:border-gray-700 rounded-lg p-4">
            <div className="mb-3 pb-2 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-200">
                Unidentified — system could not classify these items
              </h3>
              <GroupExportsButtons
                groupName="Unidentified Items"
                subsections={[
                  {
                    title: "Unidentified Items",
                    items: consolidatedUnidentified,
                    showWeldColumns: false,
                    showAreaColumns: false,
                  },
                ]}
                onExport={exportGroup}
              />
            </div>
            {renderConsolidatedTable(
              "Unidentified Items",
              consolidatedUnidentified,
              "bg-gray-50",
              "text-gray-700",
            )}
          </section>
        )}

        {/* Total Weight Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-lg">
            <span className="font-semibold text-gray-700">Total Estimated Weight:</span>
            <span className="font-bold text-green-600">{formatWeight(totalWeight)}</span>
          </div>
        </div>
      </div>
      {/* Notes */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <p>
          <strong className="text-gray-700">Note:</strong> This BOQ consolidates similar items
          across all line items. The "From Items" column shows which original line items contribute
          to each consolidated entry. Weights are estimates based on standard dimensions.
        </p>
      </div>
      {/* Navigation & Actions */}
      <div className="flex justify-between items-center gap-4 pt-4 border-t border-gray-200">
        <div className="flex gap-4">
          {onPrevStep && (
            <button
              onClick={onPrevStep}
              disabled={loading}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors font-semibold disabled:opacity-50"
            >
              ← Back to Review
            </button>
          )}
        </div>
        <div className="flex gap-4">
          <button
            onClick={isUnregisteredCustomer ? showRestrictionPopup("export") : exportToExcel}
            className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              isUnregisteredCustomer
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export Excel
            {isUnregisteredCustomer && (
              <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <button
            onClick={isUnregisteredCustomer ? showRestrictionPopup("export") : () => window.print()}
            className={`px-6 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
              isUnregisteredCustomer
                ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print BOQ
            {isUnregisteredCustomer && (
              <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          {isEditing && onResubmit ? (
            <button
              onClick={onResubmit}
              disabled={loading}
              className="px-8 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Re-Submitting...
                </>
              ) : (
                <>
                  Re-Submit RFQ
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </>
              )}
            </button>
          ) : (
            onSubmit && (
              <button
                onClick={onSubmit}
                disabled={loading}
                className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit RFQ for Quotation
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </>
                )}
              </button>
            )
          )}
          {onResendBoq && (
            <button
              type="button"
              onClick={onResendBoq}
              disabled={loading}
              title="This draft is already an RFQ — re-send its BOQ to suppliers without creating a new RFQ."
              className="px-8 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Re-sending BOQ...
                </>
              ) : (
                <>
                  Re-send BOQ to Suppliers
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      {/* Restriction Popup for unregistered customers */}
      {restrictionPopup && (
        <div className="fixed inset-0 z-50" onClick={() => setRestrictionPopup(null)}>
          <div
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-xs"
            style={{
              left: Math.min(restrictionPopup.x, window.innerWidth - 320),
              top: Math.min(restrictionPopup.y, window.innerHeight - 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Export Feature Locked</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Export to Excel and Print BOQ are available for registered customers only.
                </p>
                <a
                  href="/customer/register"
                  className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Register for free →
                </a>
              </div>
            </div>
            <button
              onClick={() => setRestrictionPopup(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
