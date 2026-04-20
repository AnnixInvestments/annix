"use client";

import React from "react";
import { MaterialTypeSelector } from "@/app/components/rfq/selectors/MaterialTypeSelector";
import type { PipeMaterialType } from "@/app/lib/hooks/useRfqForm";

interface AddItemButtonsBarProps {
  insertAtStart?: boolean;
  hasPipeMaterials: boolean;
  requiredProducts: string[];
  canAddMoreItems: boolean;
  showRestrictionPopup: (
    type: "itemLimit" | "quantityLimit" | "drawings",
  ) => (e: React.MouseEvent) => void;
  onAddPipe: (material: PipeMaterialType, insertAtStart?: boolean) => void;
  onAddBendEntry: (id: undefined, insertAtStart?: boolean, material?: PipeMaterialType) => void;
  onAddFittingEntry: (id: undefined, insertAtStart?: boolean, material?: PipeMaterialType) => void;
  onAddPipeSteelWorkEntry?: (id: undefined, insertAtStart?: boolean) => void;
  onAddExpansionJointEntry?: (id: undefined, insertAtStart?: boolean) => void;
  onAddValveEntry?: (id: undefined, insertAtStart?: boolean) => void;
  onAddInstrumentEntry?: (id: undefined, insertAtStart?: boolean) => void;
  onAddPumpEntry?: (id: undefined, insertAtStart?: boolean) => void;
  onAddFastenerEntry?: (id: undefined, insertAtStart?: boolean) => void;
  onAddTankChuteEntry?: (id: undefined, insertAtStart?: boolean) => void;
}

const PlusIcon = React.memo(function PlusIcon(props: { className: string }) {
  return (
    <svg className={props.className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
});

const LockIcon = React.memo(function LockIcon() {
  return (
    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );
});

function RestrictedButton(props: {
  label: string;
  canAdd: boolean;
  showRestrictionPopup: (type: "itemLimit") => (e: React.MouseEvent) => void;
  onClick: () => void;
  enabledBg: string;
  enabledBorder: string;
  enabledTextColor: string;
  enabledIconColor: string;
}) {
  const isDisabled = !props.canAdd;
  return (
    <button
      onClick={isDisabled ? props.showRestrictionPopup("itemLimit") : props.onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-md border transition-colors ${
        isDisabled
          ? "bg-gray-100 border-gray-300 cursor-not-allowed"
          : `${props.enabledBg} ${props.enabledBorder}`
      }`}
    >
      {isDisabled && <LockIcon />}
      <PlusIcon className={`w-4 h-4 ${isDisabled ? "text-gray-400" : props.enabledIconColor}`} />
      <span
        className={`text-xs font-semibold ${isDisabled ? "text-gray-500" : props.enabledTextColor}`}
      >
        {props.label}
      </span>
    </button>
  );
}

export const AddItemButtonsBar = React.memo(function AddItemButtonsBar(
  props: AddItemButtonsBarProps,
) {
  const insertAtStart = props.insertAtStart;

  return (
    <div
      className="flex gap-2 items-center flex-wrap"
      data-nix-target={insertAtStart ? "add-item-section-top" : undefined}
    >
      {props.hasPipeMaterials && (
        <MaterialTypeSelector
          selectedMaterials={props.requiredProducts}
          onSelectMaterial={() => {}}
          onAddItem={(material, itemType) => {
            if (!props.canAddMoreItems) {
              props.showRestrictionPopup("itemLimit")({} as React.MouseEvent);
              return;
            }
            if (itemType === "pipe") {
              props.onAddPipe(material, insertAtStart);
            } else if (itemType === "bend") {
              props.onAddBendEntry(undefined, insertAtStart, material);
            } else if (itemType === "fitting") {
              props.onAddFittingEntry(undefined, insertAtStart, material);
            }
          }}
          disabled={!props.canAddMoreItems}
        />
      )}
      {props.requiredProducts.includes("pipe_steel_work") && props.onAddPipeSteelWorkEntry && (
        <button
          onClick={() => {
            const handler = props.onAddPipeSteelWorkEntry;
            if (handler) handler(undefined, insertAtStart);
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 rounded-md border border-orange-300 transition-colors"
        >
          <PlusIcon className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-semibold text-orange-700">Steel Work</span>
        </button>
      )}
      {props.requiredProducts.includes("expansion_joint") && props.onAddExpansionJointEntry && (
        <button
          onClick={() => {
            const handler = props.onAddExpansionJointEntry;
            if (handler) handler(undefined, insertAtStart);
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 rounded-md border border-purple-300 transition-colors"
        >
          <PlusIcon className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-purple-700">Expansion Joint</span>
        </button>
      )}
      {props.requiredProducts.includes("valves_meters_instruments") && props.onAddValveEntry && (
        <RestrictedButton
          label="Valve"
          canAdd={props.canAddMoreItems}
          showRestrictionPopup={props.showRestrictionPopup}
          onClick={() => {
            const handler = props.onAddValveEntry;
            if (handler) handler(undefined, insertAtStart);
          }}
          enabledBg="bg-teal-100 hover:bg-teal-200"
          enabledBorder="border-teal-300"
          enabledTextColor="text-teal-700"
          enabledIconColor="text-teal-600"
        />
      )}
      {props.requiredProducts.includes("valves_meters_instruments") &&
        props.onAddInstrumentEntry && (
          <RestrictedButton
            label="Instrument"
            canAdd={props.canAddMoreItems}
            showRestrictionPopup={props.showRestrictionPopup}
            onClick={() => {
              const handler = props.onAddInstrumentEntry;
              if (handler) handler(undefined, insertAtStart);
            }}
            enabledBg="bg-cyan-100 hover:bg-cyan-200"
            enabledBorder="border-cyan-300"
            enabledTextColor="text-cyan-700"
            enabledIconColor="text-cyan-600"
          />
        )}
      {props.requiredProducts.includes("pumps") && props.onAddPumpEntry && (
        <RestrictedButton
          label="Pump"
          canAdd={props.canAddMoreItems}
          showRestrictionPopup={props.showRestrictionPopup}
          onClick={() => {
            const handler = props.onAddPumpEntry;
            if (handler) handler(undefined, insertAtStart);
          }}
          enabledBg="bg-indigo-100 hover:bg-indigo-200"
          enabledBorder="border-indigo-300"
          enabledTextColor="text-indigo-700"
          enabledIconColor="text-indigo-600"
        />
      )}
      {props.requiredProducts.includes("fasteners_gaskets") && props.onAddFastenerEntry && (
        <button
          onClick={() => {
            const handler = props.onAddFastenerEntry;
            if (handler) handler(undefined, insertAtStart);
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-lime-100 hover:bg-lime-200 rounded-md border border-lime-300 transition-colors"
        >
          <svg
            className="w-4 h-4 text-lime-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085"
            />
          </svg>
          <span className="text-xs font-medium text-lime-800">Fastener</span>
        </button>
      )}
      {props.requiredProducts.includes("tanks_chutes") && props.onAddTankChuteEntry && (
        <button
          onClick={() => {
            const handler = props.onAddTankChuteEntry;
            if (handler) handler(undefined, insertAtStart);
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-md border border-amber-300 transition-colors"
        >
          <PlusIcon className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">Tank/Chute</span>
        </button>
      )}
    </div>
  );
});
