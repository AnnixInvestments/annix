"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UnifiedMultiStepRfqForm from "@/app/components/rfq/forms/UnifiedMultiStepRfqForm";
import { CustomerAuthProvider } from "@/app/context/CustomerAuthContext";
import { log } from "@/app/lib/logger";

export default function RfqPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(true);
  const [submissionResult, setSubmissionResult] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState<string>("/customer/portal/dashboard");

  useEffect(() => {
    const storedPath = sessionStorage.getItem("rfq_return_path");
    if (storedPath) {
      log.info("Return path from sessionStorage:", storedPath);
      setReturnPath(storedPath);
    } else {
      log.info("No return path in sessionStorage, using default dashboard");
      setReturnPath("/customer/portal/dashboard");
    }
  }, []);

  const handleFormSuccess = (rfqId: string) => {
    log.info("RFQ submitted successfully:", rfqId);
    setSubmissionResult(`RFQ submitted successfully! ID: ${rfqId}`);
    setShowForm(false);
  };

  const handleFormCancel = () => {
    log.debug("Form cancelled, navigating to:", returnPath);
    sessionStorage.removeItem("rfq_return_path");
    router.push(returnPath);
  };

  const handleBackNavigation = () => {
    sessionStorage.removeItem("rfq_return_path");
    router.push(returnPath);
  };

  const resetForm = () => {
    setShowForm(true);
    setSubmissionResult(null);
  };

  if (!showForm && submissionResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-2xl p-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600 mb-6">{submissionResult}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={resetForm}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Create Another RFQ
            </button>
            <button
              onClick={handleBackNavigation}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Form Cancelled</h2>
          <p className="text-gray-600 mb-6">Your RFQ form has been cancelled. No data was saved.</p>
          <div className="space-y-3">
            <button
              onClick={resetForm}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Start New RFQ
            </button>
            <button
              onClick={handleBackNavigation}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CustomerAuthProvider>
      <UnifiedMultiStepRfqForm onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
    </CustomerAuthProvider>
  );
}
