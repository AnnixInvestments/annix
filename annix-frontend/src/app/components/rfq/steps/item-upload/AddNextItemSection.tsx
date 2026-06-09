import { memo } from "react";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";

interface AddNextItemSectionProps {
  canAddMoreItems: boolean;
  showRestrictionPopup: (
    type: "itemLimit" | "quantityLimit" | "drawings",
  ) => (e: React.MouseEvent) => void;
}

const AddNextItemSectionInner = (props: AddNextItemSectionProps) => {
  const canAddMoreItems = props.canAddMoreItems;
  const showRestrictionPopup = props.showRestrictionPopup;
  const rfqData = useRfqWizardStore((s) => s.rfqData) as any;
  const rawRequiredProducts = rfqData.requiredProducts;
  const requiredProducts = rawRequiredProducts || [];
  const onAddEntry = useRfqWizardStore((s) => s.addStraightPipeEntry);
  const onAddBendEntry = useRfqWizardStore((s) => s.addBendEntry);
  const onAddFittingEntry = useRfqWizardStore((s) => s.addFittingEntry);
  const onAddPipeSteelWorkEntry = useRfqWizardStore((s) => s.addPipeSteelWorkEntry);
  const onAddExpansionJointEntry = useRfqWizardStore((s) => s.addExpansionJointEntry);
  const onAddValveEntry = useRfqWizardStore((s) => s.addValveEntry);
  const onAddInstrumentEntry = useRfqWizardStore((s) => s.addInstrumentEntry);
  const onAddPumpEntry = useRfqWizardStore((s) => s.addPumpEntry);
  const onAddTankChuteEntry = useRfqWizardStore((s) => s.addTankChuteEntry);
  const onAddFastenerEntry = useRfqWizardStore((s) => s.addFastenerEntry);

  return (
    <div
      className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"
      data-nix-target="add-item-section"
    >
      <div className="flex flex-col items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Add another item to your quote:</span>
        <div className="flex flex-wrap gap-3 justify-center">
          {requiredProducts.includes("fabricated_steel") && (
            <>
              <button
                onClick={!canAddMoreItems ? showRestrictionPopup("itemLimit") : () => onAddEntry()}
                data-nix-target="add-pipe-button"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  !canAddMoreItems
                    ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                    : "bg-blue-50 hover:bg-blue-100 border-blue-400 hover:border-blue-500 hover:shadow-md"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${!canAddMoreItems ? "text-gray-400" : "text-blue-600"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span
                  className={`text-sm font-semibold ${!canAddMoreItems ? "text-gray-500" : "text-blue-700"}`}
                >
                  Pipe
                </span>
              </button>
              <button
                onClick={
                  !canAddMoreItems ? showRestrictionPopup("itemLimit") : () => onAddBendEntry()
                }
                data-nix-target="add-bend-button"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  !canAddMoreItems
                    ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                    : "bg-purple-50 hover:bg-purple-100 border-purple-400 hover:border-purple-500 hover:shadow-md"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${!canAddMoreItems ? "text-gray-400" : "text-purple-600"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span
                  className={`text-sm font-semibold ${!canAddMoreItems ? "text-gray-500" : "text-purple-700"}`}
                >
                  Bend
                </span>
              </button>
              <button
                onClick={
                  !canAddMoreItems ? showRestrictionPopup("itemLimit") : () => onAddFittingEntry()
                }
                data-nix-target="add-fitting-button"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  !canAddMoreItems
                    ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                    : "bg-green-50 hover:bg-green-100 border-green-400 hover:border-green-500 hover:shadow-md"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${!canAddMoreItems ? "text-gray-400" : "text-green-600"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span
                  className={`text-sm font-semibold ${!canAddMoreItems ? "text-gray-500" : "text-green-700"}`}
                >
                  Fitting
                </span>
              </button>
            </>
          )}
          {requiredProducts.includes("pipe_steel_work") && onAddPipeSteelWorkEntry && (
            <button
              onClick={() => onAddPipeSteelWorkEntry()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all bg-orange-50 hover:bg-orange-100 border-orange-400 hover:border-orange-500 hover:shadow-md"
            >
              <svg
                className="w-5 h-5 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-sm font-semibold text-orange-700">Steel Work</span>
            </button>
          )}
          {requiredProducts.includes("expansion_joint") && onAddExpansionJointEntry && (
            <button
              onClick={() => onAddExpansionJointEntry()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all bg-purple-50 hover:bg-purple-100 border-purple-400 hover:border-purple-500 hover:shadow-md"
            >
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-sm font-semibold text-purple-700">Expansion Joint</span>
            </button>
          )}
          {requiredProducts.includes("valves_meters_instruments") && onAddValveEntry && (
            <button
              onClick={
                !canAddMoreItems ? showRestrictionPopup("itemLimit") : () => onAddValveEntry()
              }
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                !canAddMoreItems
                  ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                  : "bg-teal-50 hover:bg-teal-100 border-teal-400 hover:border-teal-500 hover:shadow-md"
              }`}
            >
              <svg
                className={`w-5 h-5 ${!canAddMoreItems ? "text-gray-400" : "text-teal-600"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span
                className={`text-sm font-semibold ${!canAddMoreItems ? "text-gray-500" : "text-teal-700"}`}
              >
                Valve
              </span>
            </button>
          )}
          {requiredProducts.includes("valves_meters_instruments") && onAddInstrumentEntry && (
            <button
              onClick={
                !canAddMoreItems ? showRestrictionPopup("itemLimit") : () => onAddInstrumentEntry()
              }
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                !canAddMoreItems
                  ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                  : "bg-cyan-50 hover:bg-cyan-100 border-cyan-400 hover:border-cyan-500 hover:shadow-md"
              }`}
            >
              <svg
                className={`w-5 h-5 ${!canAddMoreItems ? "text-gray-400" : "text-cyan-600"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span
                className={`text-sm font-semibold ${!canAddMoreItems ? "text-gray-500" : "text-cyan-700"}`}
              >
                Instrument
              </span>
            </button>
          )}
          {requiredProducts.includes("pumps") && onAddPumpEntry && (
            <button
              onClick={
                !canAddMoreItems ? showRestrictionPopup("itemLimit") : () => onAddPumpEntry()
              }
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                !canAddMoreItems
                  ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                  : "bg-indigo-50 hover:bg-indigo-100 border-indigo-400 hover:border-indigo-500 hover:shadow-md"
              }`}
            >
              <svg
                className={`w-5 h-5 ${!canAddMoreItems ? "text-gray-400" : "text-indigo-600"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span
                className={`text-sm font-semibold ${!canAddMoreItems ? "text-gray-500" : "text-indigo-700"}`}
              >
                Pump
              </span>
            </button>
          )}
          {requiredProducts.includes("tanks_chutes") && onAddTankChuteEntry && (
            <button
              onClick={() => onAddTankChuteEntry()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all bg-amber-50 hover:bg-amber-100 border-amber-400 hover:border-amber-500 hover:shadow-md"
            >
              <svg
                className="w-5 h-5 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-sm font-semibold text-amber-700">Tank/Chute</span>
            </button>
          )}
          {requiredProducts.includes("fasteners_gaskets") && onAddFastenerEntry && (
            <button
              onClick={() => onAddFastenerEntry()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all bg-lime-50 hover:bg-lime-100 border-lime-400 hover:border-lime-500 hover:shadow-md"
            >
              <svg
                className="w-5 h-5 text-lime-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-sm font-semibold text-lime-700">Fastener</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const AddNextItemSection = memo(AddNextItemSectionInner);
