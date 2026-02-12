'use client';

import React, { useState } from 'react';
import UnifiedMultiStepRfqForm from '@/app/components/rfq/UnifiedMultiStepRfqForm';

export default function HomePage() {
  const [showForm, setShowForm] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<string | null>(null);

  const handleGetStarted = () => {
    setShowForm(true);
  };

  const handleFormSuccess = (rfqId: string) => {
    console.log('RFQ submitted successfully:', rfqId);
    setSubmissionResult(`RFQ submitted successfully! ID: ${rfqId}`);
    setShowForm(false);
  };

  const handleFormCancel = () => {
    console.log('Form cancelled');
    setShowForm(false);
  };

  const resetForm = () => {
    setShowForm(true);
    setSubmissionResult(null);
  };

  if (!showForm && !submissionResult) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Annix RFQ System</h1>
          <p className="text-gray-600 mb-8">Create requests for quotation for pipeline projects</p>
          
          <button
            onClick={handleGetStarted}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg mb-4"
          >
            Create New RFQ
          </button>
          
          <div className="text-sm text-gray-500">
            <p className="mb-2">Choose from:</p>
            <p>• Straight Pipe RFQs</p>
            <p>• Bend & Elbow RFQs</p>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <a 
              href="/rfqs" 
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View Existing RFQs →
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!showForm && submissionResult) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600 mb-6">{submissionResult}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleGetStarted}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Create Another RFQ
            </button>
            <button
              onClick={() => window.location.href = '/rfqs'}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
            >
              View All RFQs
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Form Cancelled</h2>
          <p className="text-gray-600 mb-6">Your RFQ form has been cancelled. No data was saved.</p>
          <div className="space-y-3">
            <button
              onClick={handleGetStarted}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Start New RFQ
            </button>
            <button
              onClick={() => window.location.href = '/rfqs'}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
            >
              View All RFQs
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show the RFQ form
  return (
    <UnifiedMultiStepRfqForm
      onSuccess={handleFormSuccess}
      onCancel={handleFormCancel}
    />
  );
}
