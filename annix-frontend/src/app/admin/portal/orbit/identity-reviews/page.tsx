"use client";

import { useToast } from "@/app/components/Toast";
import type { OrbitIdentityReview } from "@/app/lib/api/adminApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAdminOrbitIdentityReviews,
  useAdminResolveOrbitIdentityReview,
} from "@/app/lib/query/hooks";

const DOC_LABELS: Record<string, string> = {
  "sa-id-card": "SA smart ID card",
  "sa-id-book": "SA ID book",
  passport: "Passport",
  other: "Other document",
};

export default function OrbitIdentityReviewsPage() {
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();
  const reviewsQuery = useAdminOrbitIdentityReviews();
  const resolveMutation = useAdminResolveOrbitIdentityReview();

  const reviewsData = reviewsQuery.data;
  const reviews = reviewsData ? reviewsData : [];
  const isLoading = reviewsQuery.isLoading;

  const handleResolve = async (review: OrbitIdentityReview, action: "approve" | "reject") => {
    const approving = action === "approve";
    const confirmed = await confirm({
      title: approving ? "Confirm this seeker's identity?" : "Confirm the mismatch?",
      message: approving
        ? "Approve only if the document, registration and CV names plausibly belong to the same person. The raw document image is deleted on resolution."
        : "Rejecting marks this profile's identity as mismatched. The raw document image is deleted on resolution.",
      confirmLabel: approving ? "Approve identity" : "Confirm mismatch",
      variant: approving ? "info" : "danger",
    });
    if (!confirmed) return;
    resolveMutation.mutate(
      { profileId: review.profileId, action },
      {
        onSuccess: () =>
          showToast(approving ? "Identity approved." : "Mismatch confirmed.", "success"),
        onError: () => alert({ message: "Couldn't resolve — please try again.", variant: "error" }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Identity reviews</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Seeker identity checks Nix wasn't sure about. Compare the three name sources (and the
          document, while it's retained) and approve or confirm the mismatch — seekers are never
          auto-blocked on a name.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center text-gray-500">
          Loading identity reviews…
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center text-gray-500">
          Nothing waiting for review.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const surname = review.identity.surname;
            const idName = [...review.identity.givenNames, surname ? surname : ""].join(" ").trim();
            const docTypeKey = review.identity.documentType;
            const docTypeLookup = docTypeKey ? DOC_LABELS[docTypeKey] : null;
            const docType = docTypeLookup ? docTypeLookup : "Document";
            const mismatch = review.identity.status === "mismatch";
            const registrationName = review.registrationName ? review.registrationName : "(none)";
            const email = review.email ? review.email : "";
            const cvName = review.cvName ? review.cvName : "(no name found)";
            return (
              <div
                key={review.profileId}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        mismatch ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {mismatch ? "Mismatch" : "Needs review"}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {docType}
                      {review.identity.confidence != null
                        ? ` · Nix confidence ${review.identity.confidence}%`
                        : ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {review.documentUrl ? (
                      <a
                        href={review.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        View document
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={resolveMutation.isPending}
                      onClick={() => void handleResolve(review, "approve")}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={resolveMutation.isPending}
                      onClick={() => void handleResolve(review, "reject")}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">On document</div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {idName || "(unreadable)"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      Registered as
                    </div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {registrationName}
                    </div>
                    <div className="text-xs text-gray-400">{email}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-400">On CV</div>
                    <div className="text-gray-900 dark:text-white font-medium">{cvName}</div>
                  </div>
                </div>
                {review.identity.reasoning ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-slate-700 pt-3">
                    <span className="font-medium">Nix:</span> {review.identity.reasoning}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {ConfirmDialog}
      {AlertDialog}
    </div>
  );
}
