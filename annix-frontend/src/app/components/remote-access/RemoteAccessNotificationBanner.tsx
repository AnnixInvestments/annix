"use client";

import { useState } from "react";
import { useRemoteAccessEnabled } from "@/app/hooks/useRemoteAccessEnabled";
import { useRemoteAccessPolling } from "@/app/hooks/useRemoteAccessPolling";
import type { RemoteAccessRequestResponse } from "@/app/lib/api/remoteAccessApi";
import RemoteAccessApprovalModal from "./RemoteAccessApprovalModal";

export default function RemoteAccessNotificationBanner() {
  const { isEnabled } = useRemoteAccessEnabled();
  const { pendingRequests, hasPendingRequests, refresh, dismissAll } = useRemoteAccessPolling({
    enabled: isEnabled ?? false,
  });

  const [selectedRequest, setSelectedRequest] = useState<RemoteAccessRequestResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isEnabled || !hasPendingRequests) {
    return null;
  }

  const handleViewRequest = (request: RemoteAccessRequestResponse) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleResponded = () => {
    refresh();
  };

  return (
    <>
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  {pendingRequests.length === 1
                    ? "An administrator is requesting access to one of your documents"
                    : `${pendingRequests.length} administrators are requesting access to your documents`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingRequests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => handleViewRequest(request)}
                  className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  View
                </button>
              ))}
              {pendingRequests.length > 1 && (
                <button
                  onClick={dismissAll}
                  className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Dismiss all
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedRequest && (
        <RemoteAccessApprovalModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          request={selectedRequest}
          onResponded={handleResponded}
        />
      )}
    </>
  );
}
