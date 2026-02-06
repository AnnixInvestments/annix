'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApiClient, RfqFullDraftResponse } from '@/app/lib/api/adminApi';
import { formatDateZA } from '@/app/lib/datetime';
import { StatusBadge, LoadingSpinner, ErrorDisplay } from '@/app/admin/components';
import { NB_TO_OD_LOOKUP } from '@/app/lib/hooks/useFlangeWeights';
import { log } from '@/app/lib/logger';

interface RfqDetail {
  id: number;
  projectName: string;
  description?: string;
  requiredDate?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: string;
  isUnregistered?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    email: string;
    name: string;
  };
}

export default function AdminRfqDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [rfq, setRfq] = useState<RfqDetail | null>(null);
  const [fullDraft, setFullDraft] = useState<RfqFullDraftResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRfqDetail = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      const [detail, draft] = await Promise.all([
        adminApiClient.getRfqDetail(parseInt(id)),
        adminApiClient.getRfqFullDraft(parseInt(id)),
      ]);

      setRfq(detail);
      setFullDraft(draft);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch RFQ details');
      log.error('Error fetching RFQ:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRfqDetail();
  }, [fetchRfqDetail]);

  if (isLoading) {
    return <LoadingSpinner message="Loading RFQ details..." />;
  }

  if (error || !rfq) {
    return (
      <ErrorDisplay
        title="Error Loading RFQ"
        message={error || 'RFQ not found'}
        onRetry={() => router.push('/admin/portal/rfqs')}
      />
    );
  }

  const allItems = fullDraft?.straightPipeEntries || [];
  const globalSpecs = fullDraft?.globalSpecs || {};
  const formData = fullDraft?.formData || {};

  const getTotalWeight = () => {
    return allItems.reduce((total: number, entry: any) => {
      const weight = (entry.itemType === 'bend' || entry.itemType === 'fitting')
        ? (entry.calculation?.totalWeight || 0)
        : (entry.calculation?.totalSystemWeight || 0);
      return total + weight;
    }, 0);
  };

  const getTotalLength = () => {
    return allItems.reduce((total: number, entry: any) => {
      const qty = entry.specs?.quantityValue || 1;

      if (entry.itemType === 'bend') {
        const nb = entry.specs?.nominalBoreMm || 0;
        const bendRadiusType = entry.specs?.bendType || '1.5D';
        const radiusFactor = parseFloat(bendRadiusType.replace('D', '')) || 1.5;
        const bendRadiusMm = nb * radiusFactor;
        const bendAngleRad = ((entry.specs?.bendDegrees || 90) * Math.PI) / 180;
        const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;
        const tangents = entry.specs?.tangentLengths || [];
        const tangentLengthM = tangents.reduce((sum: number, t: number) => sum + (t || 0), 0) / 1000;
        return total + ((arcLengthM + tangentLengthM) * qty);
      }

      if (entry.itemType === 'fitting') {
        const lengthAMm = entry.specs?.pipeLengthAMm || 0;
        const lengthBMm = entry.specs?.pipeLengthBMm || 0;
        const totalLengthM = (lengthAMm + lengthBMm) / 1000;
        return total + (totalLengthM * qty);
      }

      if (entry.specs?.quantityType === 'total_length') {
        return total + (entry.specs.quantityValue || 0);
      } else {
        const numPipes = entry.specs?.quantityValue || 1;
        const pipeLength = entry.specs?.individualPipeLength || 0;
        return total + (numPipes * pipeLength);
      }
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/admin/portal/rfqs')}
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium mb-2"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to RFQs
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{rfq.projectName}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {fullDraft?.draftNumber || `RFQ #${rfq.id}`}
            {rfq.isUnregistered && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                Unregistered Customer
              </span>
            )}
          </p>
        </div>
        <StatusBadge status={rfq.status} />
      </div>

      {/* Project Information */}
      <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Project Name</p>
            <p className="font-medium text-gray-900">{rfq.projectName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Customer</p>
            <p className="font-medium text-gray-900">{rfq.customerName || formData.customerName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Contact Email</p>
            <p className="font-medium text-gray-900">{rfq.customerEmail || formData.customerEmail || 'N/A'}</p>
          </div>
          {(rfq.customerPhone || formData.customerPhone) && (
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium text-gray-900">{rfq.customerPhone || formData.customerPhone}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600">Required Date</p>
            <p className="font-medium text-gray-900">
              {rfq.requiredDate || formData.requiredDate ? formatDateZA(rfq.requiredDate || formData.requiredDate) : 'Not specified'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Created</p>
            <p className="font-medium text-gray-900">{formatDateZA(rfq.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Last Updated</p>
            <p className="font-medium text-gray-900">{formatDateZA(rfq.updatedAt)}</p>
          </div>
        </div>
        {(rfq.description || formData.description) && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">Description</p>
            <p className="font-medium text-gray-900">{rfq.description || formData.description}</p>
          </div>
        )}
      </div>

      {/* Global Specifications */}
      {Object.keys(globalSpecs).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Global Specifications</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {globalSpecs.steelSpecification && (
              <div>
                <p className="text-gray-600">Steel Spec</p>
                <p className="font-medium text-gray-900">{globalSpecs.steelSpecification}</p>
              </div>
            )}
            {globalSpecs.pressureClassDesignation && (
              <div>
                <p className="text-gray-600">Pressure Class</p>
                <p className="font-medium text-gray-900">{globalSpecs.pressureClassDesignation}</p>
              </div>
            )}
            {globalSpecs.flangeStandard && (
              <div>
                <p className="text-gray-600">Flange Standard</p>
                <p className="font-medium text-gray-900">{globalSpecs.flangeStandard}</p>
              </div>
            )}
            {globalSpecs.flangeType && (
              <div>
                <p className="text-gray-600">Flange Type</p>
                <p className="font-medium text-gray-900">{globalSpecs.flangeType}</p>
              </div>
            )}
            {globalSpecs.gasketType && (
              <div>
                <p className="text-gray-600">Gasket Type</p>
                <p className="font-medium text-gray-900">{globalSpecs.gasketType}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Item Requirements */}
      <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Item Requirements ({allItems.length})</h3>
        {allItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No items in this RFQ draft</p>
        ) : (
          <div className="space-y-4">
            {allItems.map((entry: any, index: number) => (
              <ItemCard
                key={`${entry.id}-${entry.itemType}-${index}`}
                entry={entry}
                index={index}
                globalSpecs={globalSpecs}
              />
            ))}
          </div>
        )}
      </div>

      {/* Total Summary */}
      {allItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Total Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Total Items</p>
              <p className="text-2xl font-bold text-blue-900">{allItems.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Total Length</p>
              <p className="text-2xl font-bold text-blue-900">{getTotalLength().toFixed(1)} m</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Total Weight</p>
              <p className="text-2xl font-bold text-blue-900">{getTotalWeight().toFixed(2)} kg</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-blue-700">Completion</p>
              <p className="text-2xl font-bold text-blue-900">{fullDraft?.completionPercentage || 0}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Created By */}
      {rfq.createdBy && (
        <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Created By</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium text-gray-900">{rfq.createdBy.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{rfq.createdBy.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({ entry, index, globalSpecs }: { entry: any; index: number; globalSpecs: any }) {
  const specs = entry.specs || {};
  const calculation = entry.calculation || {};
  const itemType = entry.itemType || 'pipe';

  const bgColor = itemType === 'bend' ? 'bg-purple-50' :
                  itemType === 'fitting' ? 'bg-green-50' : 'bg-gray-50';
  const badgeColor = itemType === 'bend' ? 'bg-purple-200 text-purple-800' :
                     itemType === 'fitting' ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800';
  const typeLabel = itemType === 'bend' ? 'Bend' :
                    itemType === 'fitting' ? 'Fitting' : 'Pipe';

  const totalWeight = (itemType === 'bend' || itemType === 'fitting')
    ? (calculation.totalWeight || 0)
    : (calculation.totalSystemWeight || 0);

  const qty = specs.quantityValue || 1;
  const weightPerItem = qty > 0 ? totalWeight / qty : 0;

  return (
    <div className={`border border-gray-200 rounded-lg p-4 ${bgColor}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-semibold rounded ${badgeColor}`}>
            {typeLabel}
          </span>
          <h4 className="font-medium text-gray-800">Item #{index + 1}</h4>
        </div>
        <span className="text-sm font-medium text-gray-700">
          {totalWeight.toFixed(2)} kg total
        </span>
      </div>

      {entry.description && (
        <p className="text-sm text-gray-600 mb-3">{entry.description}</p>
      )}

      {entry.notes && (
        <p className="text-sm text-gray-500 italic mb-3">Notes: {entry.notes}</p>
      )}

      {/* Specifications Grid */}
      {itemType === 'bend' ? (
        <BendSpecs specs={specs} calculation={calculation} weightPerItem={weightPerItem} globalSpecs={globalSpecs} />
      ) : itemType === 'fitting' ? (
        <FittingSpecs specs={specs} calculation={calculation} weightPerItem={weightPerItem} globalSpecs={globalSpecs} />
      ) : (
        <PipeSpecs specs={specs} calculation={calculation} weightPerItem={weightPerItem} globalSpecs={globalSpecs} />
      )}
    </div>
  );
}

function BendSpecs({ specs, calculation, weightPerItem, globalSpecs }: any) {
  const nb = specs.nominalBoreMm || 0;
  const od = calculation.outsideDiameterMm || NB_TO_OD_LOOKUP[nb] || (nb * 1.05);
  const wt = specs.wallThicknessMm || calculation.wallThicknessMm || 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      <div>
        <span className="text-gray-500">NB:</span>
        <span className="ml-1 font-medium">{nb}mm</span>
      </div>
      <div>
        <span className="text-gray-500">OD:</span>
        <span className="ml-1 font-medium">{od.toFixed(1)}mm</span>
      </div>
      <div>
        <span className="text-gray-500">WT:</span>
        <span className="ml-1 font-medium">{wt}mm</span>
      </div>
      <div>
        <span className="text-gray-500">Angle:</span>
        <span className="ml-1 font-medium">{specs.bendDegrees || 90}°</span>
      </div>
      <div>
        <span className="text-gray-500">Type:</span>
        <span className="ml-1 font-medium">{specs.bendType || '1.5D'}</span>
      </div>
      <div>
        <span className="text-gray-500">Bend Type:</span>
        <span className="ml-1 font-medium">{specs.bendItemType || 'SEGMENTED'}</span>
      </div>
      <div>
        <span className="text-gray-500">Qty:</span>
        <span className="ml-1 font-medium">{specs.quantityValue || 1}</span>
      </div>
      <div>
        <span className="text-gray-500">Weight/item:</span>
        <span className="ml-1 font-medium">{weightPerItem.toFixed(2)} kg</span>
      </div>
      {specs.numberOfTangents > 0 && (
        <div className="col-span-2">
          <span className="text-gray-500">Tangents:</span>
          <span className="ml-1 font-medium">{specs.numberOfTangents} ({specs.tangentLengths?.join('mm, ')}mm)</span>
        </div>
      )}
      {specs.numberOfStubs > 0 && (
        <div className="col-span-2">
          <span className="text-gray-500">Stubs:</span>
          <span className="ml-1 font-medium">{specs.numberOfStubs}</span>
        </div>
      )}
      {specs.bendEndConfiguration && specs.bendEndConfiguration !== 'PE' && (
        <div className="col-span-2">
          <span className="text-gray-500">End Config:</span>
          <span className="ml-1 font-medium">{specs.bendEndConfiguration}</span>
          {globalSpecs?.pressureClassDesignation && (
            <span className="ml-1 text-blue-600">({globalSpecs.pressureClassDesignation})</span>
          )}
        </div>
      )}
      {specs.stubs?.length > 0 && (
        <div className="col-span-4 mt-2 pt-2 border-t border-gray-200">
          <span className="text-gray-500 font-medium">Stub Details:</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {specs.stubs.map((stub: any, i: number) => (
              <div key={i} className="text-xs bg-white p-2 rounded">
                <span className="font-medium">Stub {i + 1}:</span> {stub.nominalBoreMm}NB, {stub.length}mm long, {stub.orientation} @ {stub.locationFromFlange}mm
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FittingSpecs({ specs, calculation, weightPerItem, globalSpecs }: any) {
  const nb = specs.nominalDiameterMm || 0;
  const branchNb = specs.branchNominalDiameterMm || nb;
  const od = calculation.outsideDiameterMm || NB_TO_OD_LOOKUP[nb] || (nb * 1.05);
  const wt = specs.wallThicknessMm || calculation.wallThicknessMm || 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      <div>
        <span className="text-gray-500">Type:</span>
        <span className="ml-1 font-medium">{specs.fittingType || 'TEE'}</span>
      </div>
      <div>
        <span className="text-gray-500">Standard:</span>
        <span className="ml-1 font-medium">{specs.fittingStandard || 'N/A'}</span>
      </div>
      <div>
        <span className="text-gray-500">Main NB:</span>
        <span className="ml-1 font-medium">{nb}mm</span>
      </div>
      {branchNb !== nb && (
        <div>
          <span className="text-gray-500">Branch NB:</span>
          <span className="ml-1 font-medium">{branchNb}mm</span>
        </div>
      )}
      <div>
        <span className="text-gray-500">OD:</span>
        <span className="ml-1 font-medium">{od.toFixed(1)}mm</span>
      </div>
      <div>
        <span className="text-gray-500">WT:</span>
        <span className="ml-1 font-medium">{wt}mm</span>
      </div>
      <div>
        <span className="text-gray-500">Qty:</span>
        <span className="ml-1 font-medium">{specs.quantityValue || 1}</span>
      </div>
      <div>
        <span className="text-gray-500">Weight/item:</span>
        <span className="ml-1 font-medium">{weightPerItem.toFixed(2)} kg</span>
      </div>
      {specs.pipeLengthAMm && (
        <div>
          <span className="text-gray-500">Length A:</span>
          <span className="ml-1 font-medium">{specs.pipeLengthAMm}mm</span>
        </div>
      )}
      {specs.pipeLengthBMm && (
        <div>
          <span className="text-gray-500">Length B:</span>
          <span className="ml-1 font-medium">{specs.pipeLengthBMm}mm</span>
        </div>
      )}
      {specs.teeHeightMm && (
        <div>
          <span className="text-gray-500">Tee Height:</span>
          <span className="ml-1 font-medium">{specs.teeHeightMm}mm</span>
        </div>
      )}
      {specs.pipeEndConfiguration && specs.pipeEndConfiguration !== 'PE' && (
        <div className="col-span-2">
          <span className="text-gray-500">End Config:</span>
          <span className="ml-1 font-medium">{specs.pipeEndConfiguration}</span>
          {globalSpecs?.pressureClassDesignation && (
            <span className="ml-1 text-blue-600">({globalSpecs.pressureClassDesignation})</span>
          )}
        </div>
      )}
    </div>
  );
}

function PipeSpecs({ specs, calculation, weightPerItem, globalSpecs }: any) {
  const nb = specs.nominalBoreMm || 0;
  const od = calculation.outsideDiameterMm || NB_TO_OD_LOOKUP[nb] || (nb * 1.05);
  const wt = specs.wallThicknessMm || 0;
  const qty = specs.quantityType === 'total_length' ? 1 : (specs.quantityValue || 1);
  const lengthPerPipe = specs.quantityType === 'total_length'
    ? specs.quantityValue
    : specs.individualPipeLength || 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      <div>
        <span className="text-gray-500">NB:</span>
        <span className="ml-1 font-medium">{nb}mm</span>
      </div>
      <div>
        <span className="text-gray-500">OD:</span>
        <span className="ml-1 font-medium">{od.toFixed(1)}mm</span>
      </div>
      <div>
        <span className="text-gray-500">WT:</span>
        <span className="ml-1 font-medium">{wt}mm</span>
      </div>
      {specs.scheduleNumber && (
        <div>
          <span className="text-gray-500">Schedule:</span>
          <span className="ml-1 font-medium">{specs.scheduleNumber}</span>
        </div>
      )}
      <div>
        <span className="text-gray-500">Length/pipe:</span>
        <span className="ml-1 font-medium">{lengthPerPipe.toFixed(3)}m</span>
      </div>
      <div>
        <span className="text-gray-500">Qty:</span>
        <span className="ml-1 font-medium">{qty}</span>
      </div>
      <div>
        <span className="text-gray-500">Weight/pipe:</span>
        <span className="ml-1 font-medium">{weightPerItem.toFixed(2)} kg</span>
      </div>
      {specs.pipeEndConfiguration && specs.pipeEndConfiguration !== 'PE' && (
        <div className="col-span-2">
          <span className="text-gray-500">End Config:</span>
          <span className="ml-1 font-medium">{specs.pipeEndConfiguration}</span>
          {globalSpecs?.pressureClassDesignation && (
            <span className="ml-1 text-blue-600">({globalSpecs.pressureClassDesignation})</span>
          )}
        </div>
      )}
      {specs.coatingRequirements && (
        <div className="col-span-2">
          <span className="text-gray-500">Coating:</span>
          <span className="ml-1 font-medium">{specs.coatingRequirements}</span>
        </div>
      )}
    </div>
  );
}
