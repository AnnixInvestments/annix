'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { browserBaseUrl } from '@/lib/api-config';

interface SteelSpecification {
  id: number;
  steel_spec_name: string;
}

interface StraightPipeDetails {
  id: number;
  nominalBoreMm: number;
  scheduleType: string;
  scheduleNumber?: string;
  wallThicknessMm?: number;
  pipeEndConfiguration?: string;
  individualPipeLength: number;
  lengthUnit: string;
  quantityType: string;
  quantityValue: number;
  workingPressureBar: number;
  workingTemperatureC?: number;
  calculatedOdMm?: number;
  calculatedWtMm?: number;
  pipeWeightPerMeterKg?: number;
  totalPipeWeightKg?: number;
  calculatedPipeCount?: number;
  calculatedTotalLengthM?: number;
  numberOfFlanges?: number;
  numberOfButtWelds?: number;
  totalButtWeldLengthM?: number;
  numberOfFlangeWelds?: number;
  totalFlangeWeldLengthM?: number;
  steelSpecification?: SteelSpecification;
}

interface RfqItem {
  id: number;
  lineNumber: number;
  description: string;
  itemType: string;
  quantity: number;
  weightPerUnitKg?: number;
  totalWeightKg?: number;
  unitPrice?: number;
  totalPrice?: number;
  notes?: string;
  straightPipeDetails?: StraightPipeDetails;
}

interface Rfq {
  id: number;
  rfqNumber: string;
  projectName: string;
  description?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  requiredDate?: string;
  status: string;
  notes?: string;
  totalWeightKg?: number;
  totalCost?: number;
  createdAt: string;
  updatedAt: string;
  items: RfqItem[];
}

export default function RfqDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchRfqDetails();
    }
  }, [id]);

  const fetchRfqDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${browserBaseUrl()}/rfq/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch RFQ details');
      }
      const data = await response.json();
      setRfq(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return 'N/A';
    return new Intl.NumberFormat('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading RFQ Details...</p>
        </div>
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">✕</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'RFQ not found'}</p>
          <button
            onClick={() => router.push('/rfqs')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            Back to RFQ List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/rfqs')}
            className="flex items-center text-blue-600 hover:text-blue-700 font-semibold mb-4 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to RFQ List
          </button>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {rfq.rfqNumber}
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(rfq.status)}`}>
                  {rfq.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xl text-gray-700 font-medium">{rfq.projectName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-gray-700 font-semibold">{formatDate(rfq.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Customer Information */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-blue-600">👤</span>
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Customer Name</p>
                <p className="text-lg font-semibold text-gray-900">{rfq.customerName}</p>
              </div>
              {rfq.customerEmail && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-lg font-semibold text-gray-900">{rfq.customerEmail}</p>
                </div>
              )}
              {rfq.customerPhone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-lg font-semibold text-gray-900">{rfq.customerPhone}</p>
                </div>
              )}
              {rfq.requiredDate && (
                <div>
                  <p className="text-sm text-gray-500">Required By</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(rfq.requiredDate)}</p>
                </div>
              )}
            </div>
            {rfq.description && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-900 mt-1">{rfq.description}</p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-md p-6">
              <p className="text-sm text-gray-600 mb-2">Total Items</p>
              <p className="text-4xl font-bold text-blue-600">{rfq.items.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-md p-6">
              <p className="text-sm text-gray-600 mb-2">Total Weight</p>
              <p className="text-4xl font-bold text-purple-600">{formatNumber(rfq.totalWeightKg)}</p>
              <p className="text-sm text-gray-500 mt-1">kg</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-md p-6">
              <p className="text-sm text-gray-600 mb-2">Total Cost</p>
              <p className="text-4xl font-bold text-green-600">
                {rfq.totalCost ? `R ${formatNumber(rfq.totalCost)}` : 'TBD'}
              </p>
            </div>
          </div>

          {/* Line Items */}
          {rfq.items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                  {item.lineNumber}
                </span>
                <h3 className="text-xl font-bold text-gray-900 flex-1">{item.description}</h3>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                  {item.itemType.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Quantity</p>
                  <p className="text-lg font-semibold text-gray-900">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Weight per Unit</p>
                  <p className="text-lg font-semibold text-gray-900">{formatNumber(item.weightPerUnitKg)} kg</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Weight</p>
                  <p className="text-lg font-semibold text-gray-900">{formatNumber(item.totalWeightKg)} kg</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Price</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {item.totalPrice ? `R ${formatNumber(item.totalPrice)}` : 'TBD'}
                  </p>
                </div>
              </div>

              {item.notes && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-gray-900">{item.notes}</p>
                </div>
              )}

              {/* Straight Pipe Details */}
              {item.straightPipeDetails && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Pipe Specifications</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
                      <p className="text-xs text-gray-600 mb-1">Nominal Bore</p>
                      <p className="text-xl font-bold text-blue-600">{item.straightPipeDetails.nominalBoreMm} mm</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
                      <p className="text-xs text-gray-600 mb-1">Schedule</p>
                      <p className="text-xl font-bold text-purple-600">
                        {item.straightPipeDetails.scheduleNumber || `${formatNumber(item.straightPipeDetails.wallThicknessMm)} mm`}
                      </p>
                    </div>
                    {item.straightPipeDetails.steelSpecification && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
                        <p className="text-xs text-gray-600 mb-1">Steel Specification</p>
                        <p className="text-xl font-bold text-green-600">{item.straightPipeDetails.steelSpecification.steel_spec_name}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Individual Length</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatNumber(item.straightPipeDetails.individualPipeLength)} {item.straightPipeDetails.lengthUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Quantity Type</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {item.straightPipeDetails.quantityType.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Quantity Value</p>
                      <p className="text-lg font-semibold text-gray-900">{formatNumber(item.straightPipeDetails.quantityValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Working Pressure</p>
                      <p className="text-lg font-semibold text-gray-900">{item.straightPipeDetails.workingPressureBar} bar</p>
                    </div>
                    {item.straightPipeDetails.workingTemperatureC && (
                      <div>
                        <p className="text-sm text-gray-500">Working Temperature</p>
                        <p className="text-lg font-semibold text-gray-900">{item.straightPipeDetails.workingTemperatureC}°C</p>
                      </div>
                    )}
                    {item.straightPipeDetails.pipeEndConfiguration && (
                      <div>
                        <p className="text-sm text-gray-500">Pipe End Configuration</p>
                        <p className="text-lg font-semibold text-gray-900">{item.straightPipeDetails.pipeEndConfiguration}</p>
                      </div>
                    )}
                  </div>

                  {/* Calculated Values */}
                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <h5 className="text-md font-bold text-gray-900 mb-3">Calculated Values</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {item.straightPipeDetails.calculatedOdMm && (
                        <div>
                          <p className="text-sm text-gray-500">Outside Diameter</p>
                          <p className="text-lg font-semibold text-gray-900">{formatNumber(item.straightPipeDetails.calculatedOdMm)} mm</p>
                        </div>
                      )}
                      {item.straightPipeDetails.calculatedWtMm && (
                        <div>
                          <p className="text-sm text-gray-500">Wall Thickness</p>
                          <p className="text-lg font-semibold text-gray-900">{formatNumber(item.straightPipeDetails.calculatedWtMm)} mm</p>
                        </div>
                      )}
                      {item.straightPipeDetails.pipeWeightPerMeterKg && (
                        <div>
                          <p className="text-sm text-gray-500">Weight per Meter</p>
                          <p className="text-lg font-semibold text-gray-900">{formatNumber(item.straightPipeDetails.pipeWeightPerMeterKg)} kg/m</p>
                        </div>
                      )}
                      {item.straightPipeDetails.calculatedPipeCount && (
                        <div>
                          <p className="text-sm text-gray-500">Pipe Count</p>
                          <p className="text-lg font-semibold text-gray-900">{item.straightPipeDetails.calculatedPipeCount}</p>
                        </div>
                      )}
                      {item.straightPipeDetails.calculatedTotalLengthM && (
                        <div>
                          <p className="text-sm text-gray-500">Total Length</p>
                          <p className="text-lg font-semibold text-gray-900">{formatNumber(item.straightPipeDetails.calculatedTotalLengthM)} m</p>
                        </div>
                      )}
                      {item.straightPipeDetails.numberOfButtWelds !== undefined && (
                        <div>
                          <p className="text-sm text-gray-500">Butt Welds</p>
                          <p className="text-lg font-semibold text-gray-900">{item.straightPipeDetails.numberOfButtWelds}</p>
                        </div>
                      )}
                      {item.straightPipeDetails.totalButtWeldLengthM && (
                        <div>
                          <p className="text-sm text-gray-500">Butt Weld Length</p>
                          <p className="text-lg font-semibold text-gray-900">{formatNumber(item.straightPipeDetails.totalButtWeldLengthM)} m</p>
                        </div>
                      )}
                      {item.straightPipeDetails.numberOfFlanges !== undefined && (
                        <div>
                          <p className="text-sm text-gray-500">Flanges</p>
                          <p className="text-lg font-semibold text-gray-900">{item.straightPipeDetails.numberOfFlanges}</p>
                        </div>
                      )}
                      {item.straightPipeDetails.numberOfFlangeWelds !== undefined && (
                        <div>
                          <p className="text-sm text-gray-500">Flange Welds</p>
                          <p className="text-lg font-semibold text-gray-900">{item.straightPipeDetails.numberOfFlangeWelds}</p>
                        </div>
                      )}
                      {item.straightPipeDetails.totalFlangeWeldLengthM && (
                        <div>
                          <p className="text-sm text-gray-500">Flange Weld Length</p>
                          <p className="text-lg font-semibold text-gray-900">{formatNumber(item.straightPipeDetails.totalFlangeWeldLengthM)} m</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Notes */}
          {rfq.notes && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Additional Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{rfq.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
