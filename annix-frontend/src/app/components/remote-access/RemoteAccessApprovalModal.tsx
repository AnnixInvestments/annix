'use client';

import React, { useState } from 'react';
import {
  remoteAccessApi,
  type RemoteAccessRequestResponse,
} from '@/app/lib/api/remoteAccessApi';
import { formatDateTime } from '@/app/lib/datetime';

interface RemoteAccessApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RemoteAccessRequestResponse;
  onResponded: () => void;
}

export default function RemoteAccessApprovalModal({
  isOpen,
  onClose,
  request,
  onResponded,
}: RemoteAccessApprovalModalProps) {
  const [denialReason, setDenialReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRespond = async (approved: boolean) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await remoteAccessApi.respondToRequest(request.id, {
        approved,
        denialReason: approved ? undefined : denialReason.trim() || undefined,
      });
      onResponded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to respond to request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div
          className="px-8 py-6 flex flex-col items-center"
          style={{ backgroundColor: '#323288' }}
        >
          <h1 className="text-xl font-bold text-white">Remote Access Request</h1>
        </div>

        <div className="px-8 py-6">
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Administrator Requesting Access
          </h2>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-500">Requested by:</span>
                <p className="font-medium text-gray-900">
                  {request.requestedBy?.name || request.requestedBy?.email || 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Access type:</span>
                <p className="font-medium text-gray-900 capitalize">
                  {request.requestType.toLowerCase()}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Document:</span>
                <p className="font-medium text-gray-900">
                  {request.documentType} #{request.documentId}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Requested at:</span>
                <p className="font-medium text-gray-900">
                  {formatDateTime(request.requestedAt)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Expires:</span>
                <p className="font-medium text-gray-900">
                  {formatDateTime(request.expiresAt)}
                </p>
              </div>
            </div>
          </div>

          {request.message && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <span className="text-sm font-medium text-blue-800">Message from administrator:</span>
              <p className="text-sm text-blue-700 mt-1">{request.message}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for denial (optional)
            </label>
            <textarea
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              placeholder="Only needed if denying access..."
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
              onClick={() => handleRespond(false)}
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 border border-red-300 rounded-lg font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Deny'}
            </button>
            <button
              onClick={() => handleRespond(true)}
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#16a34a' }}
            >
              {isSubmitting ? 'Processing...' : 'Approve'}
            </button>
          </div>
        </div>

        <div
          className="h-1.5"
          style={{ backgroundColor: '#FFA500' }}
        />
      </div>
    </div>
  );
}
