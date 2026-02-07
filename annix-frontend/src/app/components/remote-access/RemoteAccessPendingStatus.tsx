"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type AccessStatusResponse,
  type RemoteAccessDocumentType,
  remoteAccessApi,
} from "@/app/lib/api/remoteAccessApi";
import { log } from "@/app/lib/logger";

interface RemoteAccessPendingStatusProps {
  documentType: RemoteAccessDocumentType;
  documentId: number;
  onAccessGranted: () => void;
  onAccessDenied?: () => void;
}

export default function RemoteAccessPendingStatus({
  documentType,
  documentId,
  onAccessGranted,
  onAccessDenied,
}: RemoteAccessPendingStatusProps) {
  const [status, setStatus] = useState<AccessStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const result = await remoteAccessApi.checkAccessStatus(documentType, documentId);
      setStatus(result);

      if (result.hasAccess) {
        setIsPolling(false);
        onAccessGranted();
      } else if (result.status === "DENIED") {
        setIsPolling(false);
        onAccessDenied?.();
      } else if (result.status === "EXPIRED") {
        setIsPolling(false);
      }
    } catch (err) {
      log.error("Failed to check access status:", err);
    }
  }, [documentType, documentId, onAccessGranted, onAccessDenied]);

  useEffect(() => {
    checkStatus();

    if (isPolling) {
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [checkStatus, isPolling]);

  if (!status) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status.hasAccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-700 font-medium">Access granted</span>
        </div>
      </div>
    );
  }

  if (status.status === "PENDING") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="animate-pulse">
            <svg
              className="h-5 w-5 text-yellow-500"
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
          <div>
            <span className="text-yellow-700 font-medium">Waiting for approval</span>
            <p className="text-sm text-yellow-600 mt-1">
              The document owner has been notified. This will update automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status.status === "DENIED") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-red-500"
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
          <span className="text-red-700 font-medium">Access denied</span>
        </div>
      </div>
    );
  }

  if (status.status === "EXPIRED") {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-gray-500"
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
          <div>
            <span className="text-gray-700 font-medium">Request expired</span>
            <p className="text-sm text-gray-500 mt-1">Please submit a new access request.</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
