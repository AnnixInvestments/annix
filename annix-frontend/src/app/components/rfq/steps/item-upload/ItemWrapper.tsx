"use client";

import { memo, useCallback } from "react";
import {
  BendForm,
  ExpansionJointForm,
  FastenerItemForm,
  FittingForm,
  InstrumentForm,
  PipeSteelWorkForm,
  PumpForm,
  StraightPipeForm,
  TankChuteForm,
  ValveForm,
} from "@/app/components/rfq/forms";

export interface ItemWrapperProps {
  entry: any;
  index: number;
  entriesCount: number;
  globalSpecs: any;
  masterData: any;
  onUpdateEntry: (id: string, updates: any) => void;
  onRemoveEntry: (id: string) => void;
  onDuplicateEntry: (entry: any, index: number) => void;
  onCopyEntry: (entry: any) => void;
  copiedItemId: string | null;
  onCalculate?: () => void;
  onCalculateBend?: (id: string) => void;
  onCalculateFitting?: (id: string) => void;
  generateItemDescription: (entry: any) => string;
  Pipe3DPreview: React.ComponentType<any> | null;
  Bend3DPreview: React.ComponentType<any> | null;
  Tee3DPreview: React.ComponentType<any> | null;
  Lateral3DPreview: React.ComponentType<any> | null;
  Reducer3DPreview: React.ComponentType<any> | null;
  OffsetBend3DPreview: React.ComponentType<any> | null;
  availableNominalBores: number[];
  availableSchedulesMap: Record<string, any[]>;
  setAvailableSchedulesMap: (
    map: Record<string, any[]> | ((prev: Record<string, any[]>) => Record<string, any[]>),
  ) => void;
  fetchAvailableSchedules: (
    entryId: string,
    steelSpecId: number,
    nominalBoreMm: number,
  ) => Promise<any[]>;
  pressureClassesByStandard: Record<number, any[]>;
  getFilteredPressureClasses: (standardId: number) => Promise<any[]>;
  requiredProducts: string[];
  isUnregisteredCustomer: boolean;
  onShowRestrictionPopup: (
    type: "itemLimit" | "quantityLimit" | "drawings",
  ) => (e: React.MouseEvent) => void;
}

export const ItemWrapper = memo(function ItemWrapper({
  entry,
  index,
  entriesCount,
  globalSpecs,
  masterData,
  onUpdateEntry,
  onRemoveEntry,
  onDuplicateEntry,
  onCopyEntry,
  copiedItemId,
  onCalculate,
  onCalculateBend,
  onCalculateFitting,
  generateItemDescription,
  Pipe3DPreview,
  Bend3DPreview,
  Tee3DPreview,
  Lateral3DPreview,
  Reducer3DPreview,
  OffsetBend3DPreview,
  availableNominalBores,
  availableSchedulesMap,
  setAvailableSchedulesMap,
  fetchAvailableSchedules,
  pressureClassesByStandard,
  getFilteredPressureClasses,
  requiredProducts,
  isUnregisteredCustomer,
  onShowRestrictionPopup,
}: ItemWrapperProps) {
  const handleClientItemNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateEntry(entry.id, { clientItemNumber: e.target.value });
    },
    [entry.id, onUpdateEntry],
  );

  const handleSequentialNumberingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateEntry(entry.id, { useSequentialNumbering: e.target.checked });
    },
    [entry.id, onUpdateEntry],
  );

  const handleDuplicate = useCallback(() => {
    onDuplicateEntry(entry, index);
  }, [entry, index, onDuplicateEntry]);

  const handleCopy = useCallback(() => {
    onCopyEntry(entry);
  }, [entry, onCopyEntry]);

  const rawClientItemNumber = entry.clientItemNumber;
  const rawClientItemNumber2 = entry.clientItemNumber;
  const rawUseSequentialNumbering = entry.useSequentialNumbering;
  const rawClientItemNumber3 = entry.clientItemNumber;

  return (
    <div className="border-2 border-gray-200 rounded-lg p-5 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-base font-semibold text-gray-800">Item</span>
            <input
              type="text"
              value={rawClientItemNumber || `#${index + 1}`}
              onChange={handleClientItemNumberChange}
              className="min-w-32 px-2 py-0.5 text-base font-semibold text-gray-800 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              style={{
                width: `${Math.max(10, (rawClientItemNumber2 || `#${index + 1}`).length + 2)}ch`,
              }}
              placeholder={`#${index + 1}`}
            />
          </div>
          <span
            className={`px-3 py-1 ${
              entry.itemType === "bend"
                ? "bg-purple-100 text-purple-800"
                : entry.itemType === "fitting"
                  ? "bg-green-100 text-green-800"
                  : entry.itemType === "valve"
                    ? "bg-teal-100 text-teal-800"
                    : entry.itemType === "instrument"
                      ? "bg-cyan-100 text-cyan-800"
                      : entry.itemType === "pump"
                        ? "bg-indigo-100 text-indigo-800"
                        : entry.itemType === "tank_chute"
                          ? "bg-amber-100 text-amber-800"
                          : entry.itemType === "fastener"
                            ? "bg-lime-100 text-lime-800"
                            : "bg-blue-100 text-blue-800"
            } text-xs font-semibold rounded-full`}
          >
            {entry.itemType === "bend"
              ? "Bend Section"
              : entry.itemType === "fitting"
                ? "Fittings"
                : entry.itemType === "valve"
                  ? "Valve"
                  : entry.itemType === "instrument"
                    ? "Instrument"
                    : entry.itemType === "pump"
                      ? "Pump"
                      : entry.itemType === "tank_chute"
                        ? "Tank/Chute"
                        : entry.itemType === "fastener"
                          ? "Fastener"
                          : "Straight Pipe"}
          </span>
          {entry.specs?.quantityValue > 1 && (
            <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer ml-2">
              <input
                type="checkbox"
                checked={rawUseSequentialNumbering || false}
                onChange={handleSequentialNumberingChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Sequential (e.g., {rawClientItemNumber3 || `#${index + 1}`}-01, -02)</span>
            </label>
          )}
        </div>
      </div>
      {entry.itemType === "bend" ? (
        <BendForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          onDuplicateEntry={handleDuplicate}
          onCopyEntry={handleCopy}
          copiedItemId={copiedItemId}
          onCalculateBend={onCalculateBend}
          generateItemDescription={generateItemDescription}
          Bend3DPreview={Bend3DPreview}
          pressureClassesByStandard={pressureClassesByStandard}
          getFilteredPressureClasses={getFilteredPressureClasses}
          requiredProducts={requiredProducts}
          isUnregisteredCustomer={isUnregisteredCustomer}
          onShowRestrictionPopup={onShowRestrictionPopup}
        />
      ) : entry.itemType === "fitting" ? (
        <FittingForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          onDuplicateEntry={handleDuplicate}
          onCopyEntry={handleCopy}
          copiedItemId={copiedItemId}
          onCalculateFitting={onCalculateFitting}
          generateItemDescription={generateItemDescription}
          Tee3DPreview={Tee3DPreview}
          Lateral3DPreview={Lateral3DPreview}
          Reducer3DPreview={Reducer3DPreview}
          OffsetBend3DPreview={OffsetBend3DPreview}
          pressureClassesByStandard={pressureClassesByStandard}
          getFilteredPressureClasses={getFilteredPressureClasses}
          requiredProducts={requiredProducts}
          isUnregisteredCustomer={isUnregisteredCustomer}
          onShowRestrictionPopup={onShowRestrictionPopup}
        />
      ) : entry.itemType === "pipe_steel_work" ? (
        <PipeSteelWorkForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          generateItemDescription={generateItemDescription}
          requiredProducts={requiredProducts}
        />
      ) : entry.itemType === "expansion_joint" ? (
        <ExpansionJointForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          generateItemDescription={generateItemDescription}
          requiredProducts={requiredProducts}
        />
      ) : entry.itemType === "valve" ? (
        <ValveForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          generateItemDescription={generateItemDescription}
        />
      ) : entry.itemType === "instrument" ? (
        <InstrumentForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          generateItemDescription={generateItemDescription}
        />
      ) : entry.itemType === "pump" ? (
        <PumpForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          generateItemDescription={generateItemDescription}
        />
      ) : entry.itemType === "tank_chute" ? (
        <TankChuteForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          generateItemDescription={generateItemDescription}
          requiredProducts={requiredProducts}
        />
      ) : entry.itemType === "fastener" ? (
        <FastenerItemForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
        />
      ) : (
        <StraightPipeForm
          entry={entry}
          index={index}
          entriesCount={entriesCount}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          onRemoveEntry={onRemoveEntry}
          onDuplicateEntry={handleDuplicate}
          onCopyEntry={handleCopy}
          copiedItemId={copiedItemId}
          onCalculate={onCalculate}
          generateItemDescription={generateItemDescription}
          Pipe3DPreview={Pipe3DPreview}
          nominalBores={availableNominalBores}
          availableSchedulesMap={availableSchedulesMap}
          setAvailableSchedulesMap={setAvailableSchedulesMap}
          fetchAvailableSchedules={fetchAvailableSchedules}
          pressureClassesByStandard={pressureClassesByStandard}
          getFilteredPressureClasses={getFilteredPressureClasses}
          isUnregisteredCustomer={isUnregisteredCustomer}
          onShowRestrictionPopup={onShowRestrictionPopup}
        />
      )}
    </div>
  );
});
