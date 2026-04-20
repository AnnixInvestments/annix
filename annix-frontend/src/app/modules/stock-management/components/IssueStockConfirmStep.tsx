"use client";

import type { TargetSelection } from "../components/JobCardOrCpoPicker";
import type { CpoChildJc } from "../hooks/useCpoContext";
import type { CartRow } from "./IssueStockItemsStep";

export interface IssueStockConfirmStepProps {
  issuerStaffId: number | "";
  recipientStaffId: number | "";
  target: TargetSelection | null;
  cart: CartRow[];
  cpoChildJcs: CpoChildJc[];
  selectedCpoJcIds: number[];
  submitSuccess: boolean;
  submitError: string | null;
  setSubmitError: (err: string | null) => void;
  isPending: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export function IssueStockConfirmStep(props: IssueStockConfirmStepProps) {
  const {
    issuerStaffId,
    recipientStaffId,
    target,
    cart,
    cpoChildJcs,
    selectedCpoJcIds,
    submitSuccess,
    submitError,
    setSubmitError,
    isPending,
    onBack,
    onSubmit,
  } = props;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Confirm Issuance</h2>
      <div className="text-sm space-y-1">
        <div>Issuer: Staff #{issuerStaffId}</div>
        <div>Recipient: Staff #{recipientStaffId}</div>
        {target != null ? (
          <div>
            {target.kind === "cpo" ? "CPO" : "Job Card"}: {target.label}
            {target.kind === "cpo" && selectedCpoJcIds.length > 0 ? (
              <div className="text-xs text-gray-500 mt-1">
                Job Cards:{" "}
                {cpoChildJcs
                  .filter((jc) => selectedCpoJcIds.includes(jc.id))
                  .map((jc) => (jc.jcNumber == null ? jc.jobNumber : jc.jcNumber))
                  .join(", ")}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="rounded-lg border border-gray-200 divide-y">
        {cart.map((row) => {
          const uom = row.product.unitOfMeasure;
          return (
            <div key={row.product.id} className="p-3 text-sm flex justify-between">
              <span>{row.product.name}</span>
              <span className="font-mono">
                {Math.round(row.quantity * 100) / 100} {uom}
              </span>
            </div>
          );
        })}
      </div>
      {submitSuccess ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Issuance created successfully. Returning to start...
        </div>
      ) : null}
      {submitError != null ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Error: {submitError}
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="ml-2 text-red-600 hover:underline font-medium"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {!submitSuccess ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 rounded text-sm"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create Issuance"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
