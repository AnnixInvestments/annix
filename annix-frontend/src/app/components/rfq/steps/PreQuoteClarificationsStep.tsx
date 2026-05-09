"use client";

import { isString } from "es-toolkit/compat";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { rfqApi } from "@/app/lib/api/client";
import { log } from "@/app/lib/logger";
import {
  buildClarificationEmailDraft,
  type ClarificationRequirements,
  detectClarificationRequirements,
  hasNoClarifications,
  MINING_VALVE_DATASHEET_FIELDS,
  type ValveSpecGap,
} from "@/app/lib/rfq/preQuoteRequirements";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";

interface PreQuoteClarificationsStepProps {
  onPrevStep: () => void;
  onProceed: (omittedItemIds: Set<string>, skipped: boolean) => void;
}

// One-tap default-skip: if the wizard mounts this step and detection
// finds nothing missing, fire onProceed immediately so the customer
// never sees an empty page. The orchestrator hides the wizard
// footer's Next button on this step so the only paths forward are
// the in-step buttons or this auto-skip.
export default function PreQuoteClarificationsStep(props: PreQuoteClarificationsStepProps) {
  const { onPrevStep, onProceed } = props;
  const { showToast } = useToast();
  const rfqData = useRfqWizardStore((s) => s.rfqData);
  const pendingDocuments = useRfqWizardStore((s) => s.pendingDocuments);
  const pendingTenderDocuments = useRfqWizardStore((s) => s.pendingTenderDocuments);

  // The orchestrator surfaces the draft number on its own state so
  // we read that directly. customerRfqReference is loosely-typed in
  // RfqFormData (used via onUpdate but not declared) so reading it
  // through a tolerant cast is the cleanest way to avoid widening
  // the public type just for this label.
  const draftNumber = useRfqWizardStore((s) => s.draftNumber);
  const currentDraftId = useRfqWizardStore((s) => s.currentDraftId);
  const rfqReference = useMemo(() => {
    const rawData = rfqData as unknown as Record<string, unknown>;
    const customerRef = rawData.customerRfqReference;
    if (isString(customerRef) && customerRef.trim().length > 0) return customerRef;
    return draftNumber || null;
  }, [rfqData, draftNumber]);

  const requirements: ClarificationRequirements = useMemo(() => {
    const rawItems = rfqData.items;
    const items = rawItems || [];
    const pendingDocsArray = pendingDocuments || [];
    const pendingTenderArray = pendingTenderDocuments || [];
    const filenames = [...pendingDocsArray, ...pendingTenderArray].map((d) => d.file.name);
    return detectClarificationRequirements(items, filenames, rfqData.globalSpecs);
  }, [rfqData.items, rfqData.globalSpecs, pendingDocuments, pendingTenderDocuments]);

  const noClarifications = hasNoClarifications(requirements);

  // Auto-advance when the customer reaches this step and there's
  // nothing to clarify. Wrapped in useEffect so the navigation
  // happens after render (React state updates and onProceed callbacks
  // can't run during render itself).
  useEffect(() => {
    if (noClarifications) {
      onProceed(new Set(), false);
    }
  }, [noClarifications, onProceed]);

  // Initial draft body is computed once from the requirements +
  // identity fields. The customer can edit and we send their final
  // text as the customNote on the backend payload.
  const rawCustomerName = rfqData.customerName;
  const rawProjectName = rfqData.projectName;
  const draft = useMemo(() => {
    return buildClarificationEmailDraft({
      customerName: rawCustomerName || null,
      projectName: rawProjectName || null,
      rfqReference,
      missingDrawings: requirements.missingDrawings,
      valveSpecGaps: requirements.valveSpecGaps,
    });
  }, [
    rawCustomerName,
    rawProjectName,
    rfqReference,
    requirements.missingDrawings,
    requirements.valveSpecGaps,
  ]);

  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [sending, setSending] = useState(false);

  // Reset editable fields when requirements change (e.g. customer
  // hits Previous, fills in some valve fields, comes back).
  useEffect(() => {
    setSubject(draft.subject);
    setBody(draft.body);
  }, [draft.subject, draft.body]);

  const ccString = useMemo(() => {
    const rawAdditional = rfqData.additionalContacts;
    return rawAdditional || "";
  }, [rfqData.additionalContacts]);

  // Hoisted reads — keeps the SWC-LHS rule happy in JSX where the
  // customer email is read inline next to its missing-field
  // fallback. The same read appears in sendEmail() as well.
  const rawCustomerEmailForDisplay = rfqData.customerEmail;

  const sendEmail = async () => {
    if (!rfqData.customerEmail) {
      showToast(
        "Customer email is missing — please go back to Project Details and add it.",
        "error",
      );
      return;
    }
    setSending(true);
    try {
      const result = await rfqApi.sendClarificationEmail({
        to: rfqData.customerEmail,
        cc: ccString || undefined,
        subject,
        customerName: rawCustomerName || undefined,
        projectName: rawProjectName || undefined,
        rfqReference: rfqReference || undefined,
        customNote: body,
        rfqDraftId: currentDraftId || undefined,
        missingDrawings: requirements.missingDrawings,
        valveSpecGaps: requirements.valveSpecGaps.map((gap) => ({
          itemNumber: gap.itemNumber,
          description: gap.description,
          missingFields: gap.missingFields,
        })),
      });
      if (!result.success) {
        const rawResultError = result.error;
        showToast(`Email failed: ${rawResultError || "unknown error"}`, "error");
        setSending(false);
        return;
      }
      showToast(
        `Clarification email sent to ${rfqData.customerEmail}. Items pending drawings will remain omitted from the BOQ until the drawings arrive.`,
        "success",
      );
      onProceed(requirements.flaggedItemIds, false);
    } catch (err) {
      log.error("[PreQuoteClarifications] Send failed", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      showToast(`Email failed: ${errorMsg}`, "error");
      setSending(false);
    }
  };

  const skip = () => {
    onProceed(requirements.flaggedItemIds, true);
  };

  // While the auto-advance effect is firing for the empty case,
  // render nothing rather than flashing the empty state.
  if (noClarifications) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <p className="text-sm text-gray-600">Nothing to clarify — proceeding to the BOQ…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Pre-Quote Clarifications</h3>
        <p className="text-sm text-gray-600">
          Before we can quote we've spotted{" "}
          {requirements.missingDrawings.length > 0 ? (
            <>
              <strong>{requirements.missingDrawings.length}</strong>
              {" missing drawing reference"}
              {requirements.missingDrawings.length === 1 ? "" : "s"}
            </>
          ) : null}
          {requirements.missingDrawings.length > 0 && requirements.valveSpecGaps.length > 0
            ? " and "
            : null}
          {requirements.valveSpecGaps.length > 0 ? (
            <>
              <strong>{requirements.valveSpecGaps.length}</strong>
              {" valve item"}
              {requirements.valveSpecGaps.length === 1 ? "" : "s"} with incomplete mining
              specifications
            </>
          ) : null}
          . Send the auto-drafted email below to request these from your project engineer, or skip
          and proceed (the affected items will be omitted from the supplier-bound BOQ).
        </p>
      </div>

      {/* Missing drawings panel */}
      {requirements.missingDrawings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Drawings required</h4>
          <p className="text-xs text-gray-500 mb-3">
            These drawing references appear in the BOQ but no matching file has been uploaded yet.
            Items referencing them will be omitted until the drawings are received.
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-semibold text-xs text-gray-700 dark:text-gray-300">
                  Drawing reference
                </th>
                <th className="text-left py-2 px-3 font-semibold text-xs text-gray-700 dark:text-gray-300">
                  Items affected
                </th>
              </tr>
            </thead>
            <tbody>
              {requirements.missingDrawings.map((row) => (
                <tr
                  key={row.ref}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                >
                  <td className="py-2 px-3 font-mono text-xs text-gray-900 dark:text-gray-100">
                    {row.ref}
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-700 dark:text-gray-300">
                    {row.itemNumbers.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Valve specs panel */}
      {requirements.valveSpecGaps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Valve specifications required
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            For mining-grade valve duties (slurry, tailings, lime, acid leach, cyclone feed) we
            cannot price on a "size + PN" alone. These valves need the following datasheet fields
            completed.
          </p>
          <ValveSpecGapTable gaps={requirements.valveSpecGaps} />
        </div>
      )}

      {/* Email draft preview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Email draft</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-semibold text-gray-700">To:</span>{" "}
            <span className="text-gray-900">
              {rawCustomerEmailForDisplay ? (
                rawCustomerEmailForDisplay
              ) : (
                <span className="text-red-600">— missing — go back to Project Details</span>
              )}
            </span>
          </div>
          {ccString && (
            <div>
              <span className="font-semibold text-gray-700">CC:</span>{" "}
              <span className="text-gray-900">{ccString}</span>
            </div>
          )}
          <div>
            <span className="font-semibold text-gray-700">BCC:</span>{" "}
            <span className="text-gray-900">info@annix.co.za</span>
            <span className="text-xs text-gray-500 ml-2">(always copied)</span>
          </div>
          <div className="mt-3">
            <label
              className="block text-xs font-semibold text-gray-700 mb-1"
              htmlFor="clar-subject"
            >
              Subject
            </label>
            <input
              id="clar-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mt-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="clar-body">
              Message body (edit before sending)
            </label>
            <textarea
              id="clar-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            The backend wraps this body in our branded email template. Tables for missing drawings
            and valve specs are auto-rendered separately — your text appears as the personal note
            above the closing.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevStep}
          className="px-4 py-2 rounded-lg font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={skip}
            className="px-4 py-2 rounded-lg font-medium text-sm border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
          >
            Skip and proceed (items will be omitted)
          </button>
          <button
            type="button"
            onClick={sendEmail}
            disabled={sending || !rfqData.customerEmail}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending…" : "Send email and proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Renders the per-valve gap table grouped by section. Each row shows
// the valve description + the missing labels in compact text. Future
// versions (v1.2.1+) will expand this into an inline form so the
// customer can fill in the data without bouncing back to the project
// engineer over email.
function ValveSpecGapTable(props: { gaps: ValveSpecGap[] }) {
  const { gaps } = props;
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <th className="text-left py-2 px-3 font-semibold text-xs text-gray-700 dark:text-gray-300 w-20">
            Item #
          </th>
          <th className="text-left py-2 px-3 font-semibold text-xs text-gray-700 dark:text-gray-300">
            Description
          </th>
          <th className="text-left py-2 px-3 font-semibold text-xs text-gray-700 dark:text-gray-300">
            Missing fields
          </th>
        </tr>
      </thead>
      <tbody>
        {gaps.map((gap) => (
          <tr
            key={gap.itemId}
            className="border-b border-gray-100 dark:border-gray-800 align-top hover:bg-gray-50 dark:hover:bg-gray-800/30"
          >
            <td className="py-2 px-3 text-xs text-gray-900 dark:text-gray-100 font-mono">
              {gap.itemNumber}
            </td>
            <td className="py-2 px-3 text-xs text-gray-700 dark:text-gray-300">
              {gap.description}
            </td>
            <td className="py-2 px-3 text-xs text-gray-700 dark:text-gray-300">
              <ul className="list-disc list-inside space-y-0.5">
                {gap.missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Re-export so other files can introspect the field list (e.g. an
// admin "what does Annix need to quote a mining valve" reference
// page in v1.2.1+).
export { MINING_VALVE_DATASHEET_FIELDS };
