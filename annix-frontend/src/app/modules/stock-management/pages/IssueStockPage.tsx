"use client";

import { useEffect, useState } from "react";
import { IssueStockConfirmStep } from "../components/IssueStockConfirmStep";
import { type CartRow, IssueStockItemsStep } from "../components/IssueStockItemsStep";
import { IssueStockTargetStep } from "../components/IssueStockTargetStep";
import type { TargetSelection } from "../components/JobCardOrCpoPicker";
import { StaffPicker } from "../components/StaffPicker";
import { useCpoContext } from "../hooks/useCpoContext";
import { useCreateIssuanceSession } from "../hooks/useIssuanceQueries";
import {
  useStockManagementConfig,
  useStockManagementFeature,
} from "../provider/useStockManagementConfig";
import type { IssuanceRowInputDto, ItemCoatAllocationDto } from "../types/issuance";

type StepKey = "issuer" | "recipient" | "target" | "items" | "confirm";

const STEPS: ReadonlyArray<{ key: StepKey; label: string }> = [
  { key: "issuer", label: "Issuer" },
  { key: "recipient", label: "Recipient" },
  { key: "target", label: "Job Card or CPO" },
  { key: "items", label: "Items" },
  { key: "confirm", label: "Confirm" },
];

function buildCoatAllocations(
  coatType: ItemCoatAllocationDto["coatType"],
  selectedLineItemIds: number[],
  cpoChildJcs: Array<{ id: number; lineItems: Array<{ id: number; quantity: number | null }> }>,
  lineItemIssueQty: Record<number, number>,
): ItemCoatAllocationDto[] {
  const allocations: ItemCoatAllocationDto[] = [];
  for (const jc of cpoChildJcs) {
    for (const li of jc.lineItems) {
      if (!selectedLineItemIds.includes(li.id)) continue;
      const fullQty = li.quantity == null ? 1 : li.quantity;
      const rawIssueQty = lineItemIssueQty[li.id];
      const issueQty = rawIssueQty == null ? fullQty : rawIssueQty;
      if (issueQty <= 0) continue;
      allocations.push({
        lineItemId: li.id,
        jobCardId: jc.id,
        coatType,
        quantityIssued: issueQty,
      });
    }
  }
  return allocations;
}

export function IssueStockPage() {
  const config = useStockManagementConfig();
  const isBasicEnabled = useStockManagementFeature("BASIC_ISSUING");
  const loggedInStaffId = config.currentUser.staffId;
  const initialIssuerStaffId: number | "" = loggedInStaffId == null ? "" : loggedInStaffId;
  const [currentStep, setCurrentStep] = useState<StepKey>("issuer");
  const [issuerStaffId, setIssuerStaffId] = useState<number | "">(initialIssuerStaffId);
  const [recipientStaffId, setRecipientStaffId] = useState<number | "">("");
  const [target, setTarget] = useState<TargetSelection | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartRow[]>([]);
  const [pendingAllocQty, setPendingAllocQty] = useState<number | null>(null);
  const [pendingCoatType, setPendingCoatType] = useState<CartRow["coatType"]>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const targetKind = target == null ? null : target.kind;
  const targetId = target == null ? null : target.id;

  const cpoCtx = useCpoContext({ targetKind, targetId });

  const createMutation = useCreateIssuanceSession();

  useEffect(() => {
    if (currentStep !== "items" || cpoCtx.selectedProductSpec == null) return;
    if (cpoCtx.selectedProductSpec.kind === "paint") {
      const words = cpoCtx.selectedProductSpec.product.split(" ").slice(0, 3).join(" ");
      setSearch(words);
      const role = cpoCtx.selectedProductSpec.role;
      const ct: CartRow["coatType"] =
        role === "primer"
          ? "primer"
          : role === "intermediate"
            ? "intermediate"
            : role === "final"
              ? "final"
              : null;
      setPendingCoatType(ct);
    } else {
      setSearch("rubber");
    }
  }, [currentStep, cpoCtx.selectedProductSpec]);

  if (!isBasicEnabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">{config.label("issueStock.title")}</h1>
        <p className="text-sm text-gray-600">{config.label("feature.upgradePrompt.body")}</p>
      </div>
    );
  }

  const resetForm = () => {
    setCurrentStep("issuer");
    setRecipientStaffId("");
    setTarget(null);
    setSearch("");
    setCart([]);
    cpoCtx.setCpoChildJcs([]);
    cpoCtx.setSelectedCpoJcIds([]);
    cpoCtx.setSelectedLineItemIds([]);
    cpoCtx.setLineItemIssueQty({});
    cpoCtx.setExpandedJcIds([]);
    setPendingAllocQty(null);
    cpoCtx.setCpoIssuedTotals([]);
    cpoCtx.setCpoPerJcIssued({});
    cpoCtx.setCoatStatusMap({});
    cpoCtx.setCpoCoatingSpecs(null);
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    const rowJobCardId =
      target != null && target.kind === "job_card"
        ? target.id
        : cpoCtx.selectedCpoJcIds.length === 1
          ? cpoCtx.selectedCpoJcIds[0]
          : null;
    const rows: IssuanceRowInputDto[] = cart.map((row) => {
      if (row.product.productType === "paint") {
        const splits = row.paintSplits;
        const hasSplits = splits.length > 0;
        const proRataMap: Record<string, number> = {};
        if (hasSplits) {
          for (const split of splits) {
            proRataMap[String(split.jobCardId)] = split.litres;
          }
        }
        const paintCoatAllocs =
          row.coatType != null
            ? buildCoatAllocations(
                row.coatType,
                cpoCtx.selectedLineItemIds,
                cpoCtx.cpoChildJcs,
                cpoCtx.lineItemIssueQty,
              )
            : null;
        return {
          rowType: "paint",
          productId: row.product.id,
          jobCardId: rowJobCardId,
          litres: row.quantity,
          batchNumber: (() => {
            const rawBatchNumber = row.batchNumber;
            return rawBatchNumber || null;
          })(),
          cpoProRataSplit: hasSplits ? proRataMap : null,
          itemCoatAllocations: paintCoatAllocs,
        };
      }
      if (row.product.productType === "rubber_roll") {
        const details = row.rubberRollDetails;
        const weight = details.weightKgIssued > 0 ? details.weightKgIssued : row.quantity;
        const rubberCoatAllocs =
          row.coatType != null
            ? buildCoatAllocations(
                row.coatType,
                cpoCtx.selectedLineItemIds,
                cpoCtx.cpoChildJcs,
                cpoCtx.lineItemIssueQty,
              )
            : null;
        return {
          rowType: "rubber_roll",
          productId: row.product.id,
          jobCardId: rowJobCardId,
          weightKgIssued: weight,
          issuedWidthMm: details.issuedWidthMm,
          issuedLengthM: details.issuedLengthM,
          issuedThicknessMm: details.issuedThicknessMm,
          itemCoatAllocations: rubberCoatAllocs,
        };
      }
      if (row.product.productType === "solution") {
        return {
          rowType: "solution",
          productId: row.product.id,
          jobCardId: rowJobCardId,
          volumeL: row.quantity,
          batchNumber: (() => {
            const rawBatchNumber = row.batchNumber;
            return rawBatchNumber || null;
          })(),
        };
      }
      return {
        rowType: "consumable",
        productId: row.product.id,
        jobCardId: rowJobCardId,
        quantity: row.quantity,
        batchNumber: (() => {
          const rawBatchNumber = row.batchNumber;
          return rawBatchNumber || null;
        })(),
      };
    });
    const sessionCpoId = target != null && target.kind === "cpo" ? target.id : null;
    const sessionJobCardIds =
      target != null && target.kind === "job_card"
        ? [target.id]
        : cpoCtx.selectedCpoJcIds.length > 0
          ? cpoCtx.selectedCpoJcIds
          : null;
    try {
      await createMutation.createSession({
        issuerStaffId: issuerStaffId === "" ? null : Number(issuerStaffId),
        recipientStaffId: recipientStaffId === "" ? null : Number(recipientStaffId),
        cpoId: sessionCpoId,
        jobCardIds: sessionJobCardIds,
        rows,
      });
      setSubmitSuccess(true);
      setTimeout(resetForm, 3000);
    } catch (err) {
      console.error("Submit failed", err);
      const msg = err instanceof Error ? err.message : "Submit failed";
      setSubmitError(msg);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {config.label("issueStock.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{config.label("issueStock.subtitle")}</p>
      </header>

      <nav className="flex items-center gap-2 flex-wrap">
        {STEPS.map((step, index) => {
          const isActive = step.key === currentStep;
          const isComplete = index < stepIndex;
          const tone = isActive
            ? "bg-teal-600 text-white"
            : isComplete
              ? "bg-teal-100 text-teal-800"
              : "bg-gray-100 text-gray-500";
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setCurrentStep(step.key)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition ${tone}`}
            >
              {index + 1}. {config.label(`issueStock.step.${step.key}`, step.label)}
            </button>
          );
        })}
      </nav>

      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
        {currentStep === "issuer" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Issuer (storeman issuing the stock)</h2>
            <StaffPicker
              value={issuerStaffId}
              onChange={setIssuerStaffId}
              placeholder="Search staff issuing the stock"
            />
            <button
              type="button"
              onClick={() => setCurrentStep("recipient")}
              disabled={!issuerStaffId}
              className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}

        {currentStep === "recipient" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Recipient (staff receiving the stock)</h2>
            <StaffPicker
              value={recipientStaffId}
              onChange={setRecipientStaffId}
              placeholder="Search staff receiving the stock"
            />
            <button
              type="button"
              onClick={() => setCurrentStep("target")}
              disabled={!recipientStaffId}
              className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}

        {currentStep === "target" && (
          <IssueStockTargetStep
            target={target}
            setTarget={setTarget}
            onNext={() => setCurrentStep("items")}
            cpoChildJcs={cpoCtx.cpoChildJcs}
            selectedCpoJcIds={cpoCtx.selectedCpoJcIds}
            setSelectedCpoJcIds={cpoCtx.setSelectedCpoJcIds}
            selectedLineItemIds={cpoCtx.selectedLineItemIds}
            setSelectedLineItemIds={cpoCtx.setSelectedLineItemIds}
            lineItemIssueQty={cpoCtx.lineItemIssueQty}
            setLineItemIssueQty={cpoCtx.setLineItemIssueQty}
            expandedJcIds={cpoCtx.expandedJcIds}
            setExpandedJcIds={cpoCtx.setExpandedJcIds}
            cpoJcLoading={cpoCtx.cpoJcLoading}
            cpoIssuedTotals={cpoCtx.cpoIssuedTotals}
            cpoPerJcIssued={cpoCtx.cpoPerJcIssued}
            derivedCoatStatusMap={cpoCtx.derivedCoatStatusMap}
            selectedCoatsSummary={cpoCtx.selectedCoatsSummary}
            availableProductSpecs={cpoCtx.availableProductSpecs}
            selectedProductSpec={cpoCtx.selectedProductSpec}
            setSelectedProductSpec={cpoCtx.setSelectedProductSpec}
            cpoCoatingSpecs={cpoCtx.cpoCoatingSpecs}
            setCart={setCart as unknown as (cart: never[]) => void}
            setSearch={setSearch}
            setPendingAllocQty={setPendingAllocQty}
            setPendingCoatType={setPendingCoatType}
          />
        )}

        {currentStep === "items" && (
          <IssueStockItemsStep
            cart={cart}
            setCart={setCart}
            search={search}
            setSearch={setSearch}
            pendingAllocQty={pendingAllocQty}
            setPendingAllocQty={setPendingAllocQty}
            pendingCoatType={pendingCoatType}
            setPendingCoatType={setPendingCoatType}
            selectedProductSpec={cpoCtx.selectedProductSpec}
            targetKind={targetKind}
            cpoChildJcs={cpoCtx.cpoChildJcs}
            selectedCpoJcIds={cpoCtx.selectedCpoJcIds}
            selectedCoatsSummary={cpoCtx.selectedCoatsSummary}
            cpoIssuedTotals={cpoCtx.cpoIssuedTotals}
            cpoCoatingSpecs={cpoCtx.cpoCoatingSpecs}
            cpoJobCards={cpoCtx.cpoJobCards}
            showPaintProRata={cpoCtx.showPaintProRata}
            onNext={() => setCurrentStep("confirm")}
          />
        )}

        {currentStep === "confirm" && (
          <IssueStockConfirmStep
            issuerStaffId={issuerStaffId}
            recipientStaffId={recipientStaffId}
            target={target}
            cart={cart}
            cpoChildJcs={cpoCtx.cpoChildJcs}
            selectedCpoJcIds={cpoCtx.selectedCpoJcIds}
            submitSuccess={submitSuccess}
            submitError={submitError}
            setSubmitError={setSubmitError}
            isPending={createMutation.isPending}
            onBack={() => setCurrentStep("items")}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
