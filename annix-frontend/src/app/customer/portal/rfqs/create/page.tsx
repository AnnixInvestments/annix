'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import the existing RFQ forms to avoid SSR issues
const StraightPipeRfqOrchestrator = dynamic(
  () => import('@/app/components/rfq/StraightPipeRfqOrchestrator'),
  { ssr: false, loading: () => <div className="animate-pulse h-96 bg-gray-100 rounded-lg"></div> }
);

export default function CustomerCreateRfqPage() {
  const router = useRouter();

  const handleSuccess = (rfqId: string) => {
    router.push(`/customer/portal/rfqs/${rfqId}`);
  };

  const handleCancel = () => {
    router.push('/customer/portal/rfqs');
  };

  return (
    <StraightPipeRfqOrchestrator
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}
