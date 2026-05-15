"use client";

import { isArray, isString } from "es-toolkit/compat";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DateTime } from "@/app/lib/datetime";
import { QuoteCustomerView } from "@/app/lib/nix/components/quote";
import { ConvertToJobCardModal } from "@/app/lib/nix/components/quote/ConvertToJobCardModal";
import {
  type QuotePdfSnapshotDto,
  useDownloadQuotePdf,
  useEmailQuoteToCustomer,
  useNixExtractionSession,
} from "@/app/lib/query/hooks";
import { useStockControlCustomer } from "@/app/lib/query/hooks/stock-control";

/**
 * Customer-facing render of a promoted quote — same data as the editing
 * view, laid out in the supplier's letterhead style for printing /
 * sending to the customer. Reached from the working quote page's
 * "Preview customer quote" button.
 */
export default function CustomerQuotePreviewPage() {
  const params = useParams();
  const rawParam = params?.id;
  let parsedSessionId: number = Number.NaN;
  if (isString(rawParam)) {
    parsedSessionId = Number.parseInt(rawParam, 10);
  } else if (isArray(rawParam)) {
    const first = rawParam[0];
    parsedSessionId = first ? Number.parseInt(first, 10) : Number.NaN;
  }
  const validSessionId = Number.isFinite(parsedSessionId) ? parsedSessionId : null;

  const sessionQuery = useNixExtractionSession(validSessionId);
  const session = sessionQuery.data;

  if (!validSessionId) return <div className="p-6 text-red-600">Invalid quote id.</div>;
  if (sessionQuery.isLoading)
    return <div className="p-6 text-sm text-gray-500">Loading quote…</div>;
  const queryFailed = sessionQuery.isError;
  if (queryFailed || !session) {
    return (
      <div className="p-6 text-sm text-red-600">
        Could not load this quote — the underlying session may have been deleted.
      </div>
    );
  }

  return <CustomerQuotePreviewBody session={session} validSessionId={validSessionId} />;
}

function CustomerQuotePreviewBody(props: {
  session: NonNullable<ReturnType<typeof useNixExtractionSession>["data"]>;
  validSessionId: number;
}) {
  const { session, validSessionId } = props;
  const snapshotRef = useRef<QuotePdfSnapshotDto | null>(null);
  const downloadPdf = useDownloadQuotePdf();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Read URL params (?email=1, ?print=1) from the Submit-Quote flow.
  // Email mode opens the modal on first render; print mode fires
  // window.print after the snapshot has loaded. When both are set,
  // print is deferred until the email modal is closed (success or
  // dismiss) so the user sees the email confirmation first.
  const searchParams = useSearchParams();
  const router = useRouter();
  const wantEmail = searchParams ? searchParams.get("email") === "1" : false;
  const wantPrint = searchParams ? searchParams.get("print") === "1" : false;
  const wantConvert = searchParams ? searchParams.get("convert") === "1" : false;
  const [autoEmailOpened, setAutoEmailOpened] = useState(false);
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [latestSnapshot, setLatestSnapshot] = useState<QuotePdfSnapshotDto | null>(null);

  useEffect(() => {
    if (wantEmail && !autoEmailOpened) {
      setShowEmailModal(true);
      setAutoEmailOpened(true);
    }
  }, [wantEmail, autoEmailOpened]);

  useEffect(() => {
    if (!wantPrint || autoPrintTriggered) return;
    // If email is also requested, wait until the email modal closes.
    if (wantEmail && showEmailModal) return;
    // Give the layout one frame to settle (snapshot might still be hydrating).
    const handle = window.setTimeout(() => {
      window.print();
      setAutoPrintTriggered(true);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [wantPrint, autoPrintTriggered, wantEmail, showEmailModal]);

  // After the Submit-Quote flow finishes (print dialog closed, or email
  // modal closed), return the quoter to the Quotations hub — the quote
  // now shows under "Submitted to client". Only fires when the preview
  // was reached via ?print / ?email (i.e. from Submit Quote), never on
  // a plain preview visit.
  useEffect(() => {
    if (!wantPrint || !autoPrintTriggered) return;
    const handler = () => router.push("/stock-control/portal/quotations");
    window.addEventListener("afterprint", handler, { once: true });
    return () => window.removeEventListener("afterprint", handler);
  }, [wantPrint, autoPrintTriggered, router]);

  useEffect(() => {
    // Email-only submit: once the auto-opened email modal is closed
    // (sent or dismissed) and no print is pending, head to the hub.
    if (wantEmail && !wantPrint && autoEmailOpened && !showEmailModal) {
      router.push("/stock-control/portal/quotations");
    }
  }, [wantEmail, wantPrint, autoEmailOpened, showEmailModal, router]);

  // ?convert=1 from QuoteView's "Convert to Job Card" button — wait for
  // QuoteCustomerView to compute the snapshot, then open the modal.
  useEffect(() => {
    if (wantConvert && latestSnapshot && !showConvertModal) {
      setShowConvertModal(true);
    }
  }, [wantConvert, latestSnapshot, showConvertModal]);

  const rawCustomerCompanyId = session.customerCompanyId;
  const customerCompanyId: number | null =
    rawCustomerCompanyId === undefined || rawCustomerCompanyId === null
      ? null
      : rawCustomerCompanyId;
  const rawPromotedRef = session.promotedRef;
  const modalQuoteRef = rawPromotedRef ? rawPromotedRef : `Quote-${validSessionId}`;
  const liveCustomer = useStockControlCustomer(customerCompanyId);
  const defaultEmail = useMemo(() => {
    const live = liveCustomer.data;
    if (live?.email && live.email.trim().length > 0) return live.email.trim();
    const snap = session.customerSnapshot;
    const snapEmail = snap ? snap.email : null;
    if (isString(snapEmail) && snapEmail.trim().length > 0) return snapEmail.trim();
    return "";
  }, [liveCustomer.data, session.customerSnapshot]);

  const handleDownload = () => {
    setDownloadError(null);
    const snap = snapshotRef.current;
    if (!snap) {
      setDownloadError("Quote is still loading — try again in a second.");
      return;
    }
    downloadPdf.mutate(
      { sessionId: validSessionId, snapshot: snap },
      {
        onSuccess: ({ blob, filename }) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = filename;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Download failed";
          setDownloadError(msg);
        },
      },
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen py-6">
      <div className="max-w-[900px] mx-auto px-4 print:max-w-none print:px-0">
        <div className="flex items-center justify-between mb-3 print:hidden">
          <Link
            href={`/stock-control/portal/quotations/quotes/${validSessionId}`}
            className="text-sm text-[#323288] hover:underline"
          >
            ← Back to editor
          </Link>
          <div className="flex items-center gap-2">
            {downloadError && <span className="text-xs text-red-700">{downloadError}</span>}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloadPdf.isPending}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-white text-[#323288] border border-[#323288] rounded hover:bg-[#323288] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadPdf.isPending ? "Generating…" : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-white text-[#323288] border border-[#323288] rounded hover:bg-[#323288] hover:text-white"
            >
              Email customer
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-[#323288] text-white rounded hover:bg-[#2a2a73]"
            >
              Print
            </button>
          </div>
        </div>
        <div className="bg-white shadow-md print:shadow-none">
          <QuoteCustomerView
            session={session}
            onSnapshotChange={(snap) => {
              snapshotRef.current = snap;
              setLatestSnapshot(snap);
            }}
          />
        </div>
      </div>
      {showEmailModal && (
        <EmailQuoteModal
          sessionId={validSessionId}
          quoteRef={modalQuoteRef}
          defaultTo={defaultEmail}
          snapshotRef={snapshotRef}
          onClose={() => setShowEmailModal(false)}
        />
      )}
      {showConvertModal && latestSnapshot && (
        <ConvertToJobCardModal
          sessionId={validSessionId}
          snapshot={latestSnapshot}
          defaults={buildJobCardDefaults(session, modalQuoteRef)}
          onClose={() => setShowConvertModal(false)}
        />
      )}
    </div>
  );
}

/** Derive sensible pre-fills for the Convert-to-Job-Card modal from the
 *  session's customer snapshot and the quote reference. The quoter can
 *  override any field before confirming. */
function buildJobCardDefaults(
  session: NonNullable<ReturnType<typeof useNixExtractionSession>["data"]>,
  modalQuoteRef: string,
): {
  jobNumber: string;
  jobName: string;
  siteLocation: string;
  contactPerson: string;
} {
  const snap = session.customerSnapshot;
  const customerName = snap && isString(snap.name) ? snap.name : "";
  const streetAddress = snap && isString(snap.streetAddress) ? snap.streetAddress : "";
  const contactPerson = snap && isString(snap.contactPerson) ? snap.contactPerson : "";
  // JC-{YEAR}-{4-digit session id} keeps the job number unique per session
  // and easy to trace back to the source quote at a glance.
  const year = DateTime.now().year;
  const sessionSuffix = String(session.id).padStart(4, "0");
  return {
    jobNumber: `JC-${year}-${sessionSuffix}`,
    jobName: `${customerName ? `${customerName} — ` : ""}${modalQuoteRef}`.trim(),
    siteLocation: streetAddress,
    contactPerson,
  };
}

function EmailQuoteModal(props: {
  sessionId: number;
  quoteRef: string;
  defaultTo: string;
  snapshotRef: React.MutableRefObject<QuotePdfSnapshotDto | null>;
  onClose: () => void;
}) {
  const { sessionId, quoteRef, defaultTo, snapshotRef, onClose } = props;
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(`Quotation ${quoteRef}`);
  const [message, setMessage] = useState(`Please find attached our quotation ${quoteRef}.`);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const emailMutation = useEmailQuoteToCustomer();

  const handleSend = () => {
    setSubmitError(null);
    setSuccessInfo(null);
    const trimmedTo = to.trim();
    if (trimmedTo.length === 0) {
      setSubmitError("Recipient email is required.");
      return;
    }
    const snap = snapshotRef.current;
    if (!snap) {
      setSubmitError("Quote is still loading — try again in a second.");
      return;
    }
    emailMutation.mutate(
      {
        sessionId,
        snapshot: snap,
        to: trimmedTo,
        cc: cc.trim().length > 0 ? cc.trim() : undefined,
        subject: subject.trim(),
        message: message.trim(),
      },
      {
        onSuccess: (result) => {
          setSuccessInfo(`Sent to ${result.to}`);
        },
        onError: (err) => {
          setSubmitError(err instanceof Error ? err.message : "Email failed");
        },
      },
    );
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !emailMutation.isPending) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [emailMutation.isPending, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-quote-title"
    >
      <button
        type="button"
        aria-label="Close email dialog"
        className="fixed inset-0 bg-black/10 backdrop-blur-md cursor-default"
        onClick={() => !emailMutation.isPending && onClose()}
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-[#323288] text-white">
          <h2 id="email-quote-title" className="text-base font-semibold tracking-wide">
            Email quotation
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={emailMutation.isPending}
            className="text-white/80 hover:text-white text-xl leading-none disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="To">
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
            />
          </Field>
          <Field label="CC (optional)">
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="comma-separated emails"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
            />
          </Field>
          <Field label="Subject">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
            />
          </Field>
          <Field label="Message">
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30 resize-y"
            />
          </Field>
          <p className="text-xs text-gray-500">
            The PDF will be attached automatically using your tenant SMTP configuration.
          </p>
          {submitError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {submitError}
            </p>
          )}
          {successInfo && (
            <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded p-2">
              {successInfo}
            </p>
          )}
        </div>
        <footer className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#323288]/40"
          >
            {successInfo ? "Close" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={emailMutation.isPending}
            className="px-4 py-2 text-sm font-medium bg-[#323288] text-white rounded-md hover:bg-[#2a2a73] focus:outline-none focus:ring-2 focus:ring-[#323288]/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {emailMutation.isPending ? "Sending…" : "Send"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-gray-600 font-medium mb-1">
        {props.label}
      </span>
      {props.children}
    </label>
  );
}
