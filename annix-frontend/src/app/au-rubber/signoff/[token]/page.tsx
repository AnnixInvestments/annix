"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api-config";
import { SignOffStatusBadge } from "../../components/accounting/SignOffStatusBadge";

interface SignOffData {
  signOff: {
    id: number;
    directorName: string;
    directorEmail: string;
    status: string;
    signedAt: string | null;
    notes: string | null;
  };
  account: {
    id: number;
    periodYear: number;
    periodMonth: number;
    accountType: string;
    status: string;
  };
  pdfUrl: string | null;
}

export default function SignOffPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<SignOffData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/rubber-lining/public/accounting/signoff/${token}`);
        if (!res.ok) {
          setError("Invalid or expired sign-off link");
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load sign-off details");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [token]);

  const handleSubmit = async (action: "APPROVED" | "REJECTED") => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/rubber-lining/public/accounting/signoff/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: notes || undefined }),
      });
      const result = await res.json();
      setResultMessage(result.message);
      setSubmitted(true);
    } catch {
      setError("Failed to submit sign-off");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
        <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-2">
          Sign-Off Submitted
        </h2>
        <p className="text-green-600 dark:text-green-500">{resultMessage}</p>
      </div>
    );
  }

  if (!data) return null;

  const typeLabel =
    data.account.accountType === "PAYABLE" ? "Accounts Payable" : "Accounts Receivable";
  const periodLabel = `${data.account.periodYear}-${String(data.account.periodMonth).padStart(2, "0")}`;
  const alreadyActioned = data.signOff.status !== "PENDING";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {typeLabel} - {periodLabel}
        </h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <span className="font-medium">Director:</span> {data.signOff.directorName}
          </p>
          <p>
            <span className="font-medium">Email:</span> {data.signOff.directorEmail}
          </p>
          <p className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <SignOffStatusBadge status={data.signOff.status} />
          </p>
        </div>
      </div>

      {data.pdfUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Report Preview</h3>
          </div>
          <iframe
            src={data.pdfUrl}
            className="w-full h-[600px] border-0"
            title="Account Report PDF"
          />
        </div>
      )}

      {alreadyActioned ? (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            This sign-off has already been{" "}
            <span className="font-medium">{data.signOff.status.toLowerCase()}</span>
            {data.signOff.signedAt && (
              <> on {new Date(data.signOff.signedAt).toLocaleDateString("en-ZA")}</>
            )}
            .
          </p>
          {data.signOff.notes && <p className="mt-2 text-sm text-gray-500">{data.signOff.notes}</p>}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Your Decision</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Add any notes..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit("APPROVED")}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Approve"}
            </button>
            <button
              onClick={() => handleSubmit("REJECTED")}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Reject"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
