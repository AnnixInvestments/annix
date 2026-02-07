"use client";

import { useState } from "react";
import {
  type AccessStatusResponse,
  type RemoteAccessDocumentType,
  type RemoteAccessRequestType,
  remoteAccessApi,
} from "@/app/lib/api/remoteAccessApi";

interface RemoteAccessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: RemoteAccessDocumentType;
  documentId: number;
  documentName: string;
  requestType: RemoteAccessRequestType;
  onAccessGranted: () => void;
}

export default function RemoteAccessRequestModal({
  isOpen,
  onClose,
  documentType,
  documentId,
  documentName,
  requestType,
  onAccessGranted,
}: RemoteAccessRequestModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [status, setStatus] = useState<AccessStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestAccess = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await remoteAccessApi.requestAccess({
        requestType,
        documentType,
        documentId,
        message: message.trim() || undefined,
      });

      setIsPolling(true);
      pollForApproval();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request access");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollForApproval = async () => {
    const checkStatus = async () => {
      try {
        const result = await remoteAccessApi.checkAccessStatus(documentType, documentId);
        setStatus(result);

        if (result.hasAccess) {
          setIsPolling(false);
          onAccessGranted();
        } else if (result.status === "DENIED" || result.status === "EXPIRED") {
          setIsPolling(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check status");
        setIsPolling(false);
      }
    };

    checkStatus();
    const interval = setInterval(() => {
      if (isPolling) {
        checkStatus();
      } else {
        clearInterval(interval);
      }
    }, 5000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div
          className="px-8 py-6 flex flex-col items-center"
          style={{ backgroundColor: "#323288" }}
        >
          <h1 className="text-xl font-bold text-white">Remote Access Required</h1>
        </div>

        <div className="px-8 py-6">
          {!isPolling && !status && (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Request Access to Document
              </h2>

              <p className="text-gray-600 text-center mb-4">
                You are requesting <strong>{requestType.toLowerCase()}</strong> access to:
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-medium text-gray-900">{documentName}</p>
                <p className="text-sm text-gray-500">
                  {documentType} #{documentId}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message to document owner (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Explain why you need access..."
                  maxLength={500}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestAccess}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-4 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#323288" }}
                >
                  {isSubmitting ? "Requesting..." : "Request Access"}
                </button>
              </div>
            </>
          )}

          {isPolling && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4 animate-pulse">
                <svg
                  className="w-8 h-8 text-yellow-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-2">Waiting for Approval</h2>

              <p className="text-gray-600 mb-4">
                Your access request has been sent to the document owner. They will receive an email
                notification.
              </p>

              <p className="text-sm text-gray-500">
                This window will update automatically when approved.
              </p>

              <button
                onClick={onClose}
                className="mt-6 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Close and Wait
              </button>
            </div>
          )}

          {status?.status === "DENIED" && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>

              <p className="text-gray-600 mb-4">
                The document owner has denied your access request.
              </p>

              <button
                onClick={onClose}
                className="py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          )}

          {status?.status === "EXPIRED" && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-2">Request Expired</h2>

              <p className="text-gray-600 mb-4">
                Your access request has expired. Please submit a new request.
              </p>

              <button
                onClick={() => {
                  setStatus(null);
                  setIsPolling(false);
                }}
                className="py-2 px-4 rounded-lg font-medium text-white"
                style={{ backgroundColor: "#323288" }}
              >
                Request Again
              </button>
            </div>
          )}
        </div>

        <div className="h-1.5" style={{ backgroundColor: "#FFA500" }} />
      </div>
    </div>
  );
}
