'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import the existing RFQ forms to avoid SSR issues
const MultiStepStraightPipeRfqForm = dynamic(
  () => import('@/app/components/rfq/MultiStepStraightPipeRfqForm'),
  { ssr: false, loading: () => <div className="animate-pulse h-96 bg-gray-100 rounded-lg"></div> }
);

type RfqType = 'straight-pipe' | 'bend' | 'fitting' | null;

export default function CustomerCreateRfqPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<RfqType>(null);

  const rfqTypes = [
    {
      id: 'straight-pipe' as RfqType,
      name: 'Straight Pipe',
      description: 'Request quotation for straight pipe sections with flanges',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
    {
      id: 'bend' as RfqType,
      name: 'Pipe Bend',
      description: 'Request quotation for pipe bends with tangents',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      ),
    },
    {
      id: 'fitting' as RfqType,
      name: 'Pipe Fitting',
      description: 'Request quotation for tees, elbows, and other fittings',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      ),
    },
  ];

  const handleSuccess = (rfqId: string) => {
    router.push(`/customer/portal/rfqs/${rfqId}`);
  };

  if (selectedType) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedType(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Create {rfqTypes.find(t => t.id === selectedType)?.name} RFQ
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow">
          {selectedType === 'straight-pipe' && (
            <MultiStepStraightPipeRfqForm
              onSuccess={handleSuccess}
              onCancel={() => setSelectedType(null)}
            />
          )}
          {selectedType === 'bend' && (
            <div className="p-6 text-center">
              <p className="text-gray-600">Bend RFQ form coming soon.</p>
              <p className="text-sm text-gray-500 mt-2">
                Please contact{' '}
                <a href="mailto:support@annix.co.za" className="text-blue-600 hover:underline">
                  support@annix.co.za
                </a>{' '}
                for bend quotations.
              </p>
            </div>
          )}
          {selectedType === 'fitting' && (
            <div className="p-6 text-center">
              <p className="text-gray-600">Fitting RFQ form coming soon.</p>
              <p className="text-sm text-gray-500 mt-2">
                Please contact{' '}
                <a href="mailto:support@annix.co.za" className="text-blue-600 hover:underline">
                  support@annix.co.za
                </a>{' '}
                for fitting quotations.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New RFQ</h1>
        <p className="mt-1 text-sm text-gray-500">
          Select the type of product you need a quotation for
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rfqTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-blue-600 mb-4">{type.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900">{type.name}</h3>
            <p className="mt-2 text-sm text-gray-500">{type.description}</p>
            <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
              Get Started
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-900">Need help with your RFQ?</h3>
        <p className="mt-1 text-sm text-gray-500">
          If you need assistance or have questions about the quotation process, please contact our sales team
          at <a href="mailto:sales@annix.co.za" className="text-blue-600 hover:underline">sales@annix.co.za</a> or
          call us at <a href="tel:+27123456789" className="text-blue-600 hover:underline">+27 12 345 6789</a>.
        </p>
      </div>
    </div>
  );
}
