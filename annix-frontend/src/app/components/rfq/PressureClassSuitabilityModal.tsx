'use client';

import React from 'react';

interface PressureClassSuitabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmOverride: (reason: string) => void;
  onRevertToRecommended: () => void;
  selectedClassName: string;
  recommendedClassName: string | null;
  workingPressure: number | undefined;
  workingTemperature: number | undefined;
  warningMessage: string;
  itemDescription?: string;
}

export function PressureClassSuitabilityModal({
  isOpen,
  onClose,
  onConfirmOverride,
  onRevertToRecommended,
  selectedClassName,
  recommendedClassName,
  workingPressure,
  workingTemperature,
  warningMessage,
  itemDescription,
}: PressureClassSuitabilityModalProps) {
  const [overrideReason, setOverrideReason] = React.useState('');
  const [showReasonInput, setShowReasonInput] = React.useState(false);

  if (!isOpen) return null;

  const handleConfirmWithReason = () => {
    if (overrideReason.trim()) {
      onConfirmOverride(overrideReason.trim());
      setOverrideReason('');
      setShowReasonInput(false);
    }
  };

  const handleRevert = () => {
    setOverrideReason('');
    setShowReasonInput(false);
    onRevertToRecommended();
  };

  const handleClose = () => {
    setOverrideReason('');
    setShowReasonInput(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Unsuitable Pressure Class Selected
            </h3>
            {itemDescription && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {itemDescription}
              </p>
            )}
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
            {warningMessage}
          </p>
          <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
            <p><strong>Selected:</strong> {selectedClassName}</p>
            {recommendedClassName && (
              <p><strong>Recommended:</strong> {recommendedClassName}</p>
            )}
            {workingPressure !== undefined && (
              <p><strong>Working Pressure:</strong> {workingPressure} bar</p>
            )}
            {workingTemperature !== undefined && (
              <p><strong>Working Temperature:</strong> {workingTemperature}°C</p>
            )}
          </div>
        </div>

        {!showReasonInput ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              The selected pressure class may not provide adequate pressure-temperature rating for the specified operating conditions.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Would you like to use the recommended class or confirm your selection?
            </p>

            <div className="flex flex-col gap-2 mt-4">
              {recommendedClassName && (
                <button
                  type="button"
                  onClick={handleRevert}
                  className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Use Recommended: {recommendedClassName}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowReasonInput(true)}
                className="w-full px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                Confirm Override (Requires Reason)
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Please provide a reason for using an unsuitable pressure class. This will be logged for this RFQ item.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Enter reason for override (e.g., 'Customer specification requires this class', 'Testing purposes only')"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm dark:bg-gray-700 dark:text-gray-100"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmWithReason}
                disabled={!overrideReason.trim()}
                className="flex-1 px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Override
              </button>
              <button
                type="button"
                onClick={() => setShowReasonInput(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
