'use client';

import React from 'react';
import MultiStepStraightPipeRfqForm from './MultiStepStraightPipeRfqForm';

interface Props {
  onSuccess: (rfqId: string) => void;
  onCancel: () => void;
}

/**
 * Unified RFQ Form - Single form that handles BOTH straight pipes AND bends
 * Users can mix and match - add straight pipes, bends, or both in the same RFQ!
 */
export default function UnifiedMultiStepRfqForm({ onSuccess, onCancel }: Props) {
  return (
    <div className="max-w-full mx-auto">
      {/* The form now supports adding both straight pipes and bends */}
      <MultiStepStraightPipeRfqForm 
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </div>
  );
}