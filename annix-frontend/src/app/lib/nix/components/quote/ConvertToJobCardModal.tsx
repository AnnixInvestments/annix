"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DateInput } from "@/app/components/ui/DateInput";
import { useCoreAwareHref } from "@/app/core/portal/lib/coreAwareHref";
import {
  type ConvertToJobCardResultDto,
  type QuotePdfSnapshotDto,
  useConvertQuoteToJobCard,
} from "@/app/lib/query/hooks";

/**
 * Confirmation modal for the "Convert to Job Card" action on the quote
 * preview page. Pre-fills job number / job name / contact info from the
 * session's customer snapshot and quote ref so the quoter usually just
 * has to set a due date and click Confirm.
 *
 * On successful conversion the backend stamps `session.jobCardId` (which
 * locks the convert button afterwards) and the modal redirects to the
 * new JC. Failure leaves the modal open with the error inline.
 *
 * Body-portal'd + brand-styled per project directive (no toasts, branded
 * popups instead).
 */
export function ConvertToJobCardModal(props: {
  sessionId: number;
  snapshot: QuotePdfSnapshotDto;
  defaults: {
    jobNumber: string;
    jobName: string;
    siteLocation: string;
    contactPerson: string;
  };
  onClose: () => void;
}) {
  const { sessionId, snapshot, defaults, onClose } = props;
  const router = useRouter();
  const coreHref = useCoreAwareHref();
  const convert = useConvertQuoteToJobCard();

  const [jobNumber, setJobNumber] = useState(defaults.jobNumber);
  const [jobName, setJobName] = useState(defaults.jobName);
  const [dueDate, setDueDate] = useState("");
  const [siteLocation, setSiteLocation] = useState(defaults.siteLocation);
  const [contactPerson, setContactPerson] = useState(defaults.contactPerson);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lineCount = snapshot.pools.reduce((sum, pool) => sum + pool.items.length, 0);
  const totalValue = snapshot.totalIncl;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !convert.isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, convert.isPending]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!jobNumber.trim() || !jobName.trim()) {
      setErrorMessage("Job number and job name are both required.");
      return;
    }
    convert.mutate(
      {
        sessionId,
        snapshot,
        jobNumber: jobNumber.trim(),
        jobName: jobName.trim(),
        dueDate: dueDate.trim() || undefined,
        siteLocation: siteLocation.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
      },
      {
        onSuccess: (result: ConvertToJobCardResultDto) => {
          router.push(coreHref(`/stock-control/portal/job-cards/${result.jobCardId}`));
        },
        onError: (err: unknown) => {
          const raw = err instanceof Error ? err.message : "Conversion failed";
          // Strip the "Failed to convert quote to Job Card: <status> — " wrapper if present.
          const tail = raw.split(" — ");
          setErrorMessage(tail.length > 1 ? tail.slice(1).join(" — ").trim() : raw);
        },
      },
    );
  };

  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(document) would throw
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden">
        <header className="px-5 py-4 bg-[#323288] text-white flex items-center justify-between">
          <h2 className="text-base font-semibold">Convert to Job Card</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={convert.isPending}
            className="text-white/80 hover:text-white text-lg leading-none px-2 disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-gray-600">
            Creating a Job Card from this quote will copy{" "}
            <strong>
              {lineCount} line {lineCount === 1 ? "item" : "items"}
            </strong>{" "}
            at a total of{" "}
            <strong>R {totalValue.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</strong>{" "}
            (incl. VAT) into a new JC. Once created, this quote can&apos;t be converted again — open
            the JC directly to make changes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Job number</span>
              <input
                type="text"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
                disabled={convert.isPending}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Job name</span>
              <input
                type="text"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
                disabled={convert.isPending}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Due date</span>
              <DateInput
                value={dueDate}
                onChange={(value) => setDueDate(value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
                disabled={convert.isPending}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Site location</span>
              <input
                type="text"
                value={siteLocation}
                onChange={(e) => setSiteLocation(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
                disabled={convert.isPending}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-gray-700">Contact person</span>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
                disabled={convert.isPending}
              />
            </label>
          </div>

          {errorMessage && (
            <div className="px-3 py-2 text-xs text-red-800 bg-red-50 border border-red-200 rounded">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={convert.isPending}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={convert.isPending}
              className="px-4 py-1.5 text-sm font-semibold bg-[#323288] text-white rounded hover:bg-[#2a2a73] disabled:opacity-50"
            >
              {convert.isPending ? "Creating Job Card…" : "Create Job Card"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
