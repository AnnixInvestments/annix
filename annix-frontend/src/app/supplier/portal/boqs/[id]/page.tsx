'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  supplierPortalApi,
  SupplierBoqDetailResponse,
  SupplierBoqStatus,
  BoqSection,
  ConsolidatedItem,
  RfqItemDetail,
} from '@/app/lib/api/supplierApi';
import { useToast } from '@/app/components/Toast';

const statusColors: Record<SupplierBoqStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  viewed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Viewed' },
  quoted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Quoted' },
  declined: { bg: 'bg-red-100', text: 'text-red-800', label: 'Declined' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SupplierBoqDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const boqId = parseInt(resolvedParams.id, 10);

  const [boqDetail, setBoqDetail] = useState<SupplierBoqDetailResponse | null>(null);
  const [rfqItems, setRfqItems] = useState<RfqItemDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [rfqLoading, setRfqLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [decliningLoading, setDecliningLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'boq' | 'rfq'>('boq');

  useEffect(() => {
    loadBoqDetails();
  }, [boqId]);

  useEffect(() => {
    if (viewMode === 'rfq' && rfqItems.length === 0 && !rfqLoading) {
      loadRfqItems();
    }
  }, [viewMode]);

  const loadRfqItems = async () => {
    try {
      setRfqLoading(true);
      const items = await supplierPortalApi.getRfqItems(boqId);
      setRfqItems(items);
    } catch (err) {
      console.error('Failed to load RFQ items:', err);
    } finally {
      setRfqLoading(false);
    }
  };

  const loadBoqDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await supplierPortalApi.getBoqDetails(boqId);
      setBoqDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BOQ details');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      showToast('Please provide a reason for declining', 'warning');
      return;
    }

    try {
      setDecliningLoading(true);
      await supplierPortalApi.declineBoq(boqId, declineReason);
      setShowDeclineModal(false);
      showToast('BOQ declined successfully', 'success');
      loadBoqDetails(); // Refresh to show updated status
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to decline BOQ', 'error');
    } finally {
      setDecliningLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!boqDetail) return;

    const workbook = XLSX.utils.book_new();

    // Create a sheet for each section
    boqDetail.sections.forEach((section) => {
      const hasWelds = section.items.some(
        (item) =>
          item.welds?.pipeWeld || item.welds?.flangeWeld || item.welds?.mitreWeld || item.welds?.teeWeld
      );
      const hasAreas = section.items.some((item) => item.areas?.intAreaM2 || item.areas?.extAreaM2);

      // Build headers
      const headers = ['#', 'Description', 'Qty', 'Unit'];
      if (hasWelds) {
        headers.push('Pipe Weld (m)', 'Flange Weld (m)', 'Mitre Weld (m)', 'Tee Weld (m)');
      }
      if (hasAreas) {
        headers.push('Int Area (m²)', 'Ext Area (m²)');
      }
      headers.push('Weight (kg)');

      // Build rows
      const rows = section.items.map((item, idx) => {
        const row: (string | number)[] = [idx + 1, item.description, item.qty, item.unit];
        if (hasWelds) {
          row.push(
            item.welds?.pipeWeld ? Number(item.welds.pipeWeld).toFixed(3) : '-',
            item.welds?.flangeWeld ? Number(item.welds.flangeWeld).toFixed(3) : '-',
            item.welds?.mitreWeld ? Number(item.welds.mitreWeld).toFixed(3) : '-',
            item.welds?.teeWeld ? Number(item.welds.teeWeld).toFixed(3) : '-'
          );
        }
        if (hasAreas) {
          row.push(
            item.areas?.intAreaM2 ? Number(item.areas.intAreaM2).toFixed(2) : '-',
            item.areas?.extAreaM2 ? Number(item.areas.extAreaM2).toFixed(2) : '-'
          );
        }
        row.push(Number(item.weightKg || 0).toFixed(2));
        return row;
      });

      // Add totals row
      const totalWeightIdx = headers.indexOf('Weight (kg)');
      const totalsRow: (string | number)[] = headers.map((_, idx) => {
        if (idx === 1) return 'TOTAL';
        if (idx === totalWeightIdx) return Number(section.totalWeightKg || 0).toFixed(2);
        return '';
      });
      rows.push(totalsRow);

      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = [
        { wch: 5 },
        { wch: 50 },
        { wch: 8 },
        { wch: 8 },
        ...Array(headers.length - 4).fill({ wch: 15 }),
      ];

      // Clean sheet name (max 31 chars, no special chars)
      const sheetName = section.sectionTitle.substring(0, 31).replace(/[\\/*?:[\]]/g, '');
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    });

    // Download
    const fileName = `BOQ_${boqDetail.boq.boqNumber}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading BOQ details...</span>
        </div>
      </div>
    );
  }

  if (error || !boqDetail) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error || 'BOQ not found'}</div>
          <Link
            href="/supplier/portal/boqs"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to BOQ List
          </Link>
        </div>
      </div>
    );
  }

  const statusStyle = statusColors[boqDetail.accessStatus];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/supplier/portal/boqs"
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900">
                {boqDetail.boq.boqNumber}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
              >
                {statusStyle.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {boqDetail.projectInfo?.name || boqDetail.boq.title}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'boq' ? 'rfq' : 'boq')}
              className="inline-flex items-center px-4 py-2 border border-blue-500 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              {viewMode === 'boq' ? 'RFQ View' : 'BOQ View'}
            </button>
            <button
              onClick={exportToExcel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </button>
            {boqDetail.accessStatus !== 'declined' && boqDetail.accessStatus !== 'quoted' && (
              <button
                onClick={() => setShowDeclineModal(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Decline
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Project & Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {boqDetail.projectInfo && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Project Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Project Name</dt>
                <dd className="text-sm text-gray-900">{boqDetail.projectInfo.name}</dd>
              </div>
              {boqDetail.projectInfo.description && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="text-sm text-gray-900">{boqDetail.projectInfo.description}</dd>
                </div>
              )}
              {boqDetail.projectInfo.requiredDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Required Date</dt>
                  <dd className="text-sm text-gray-900">
                    {formatDate(boqDetail.projectInfo.requiredDate)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {boqDetail.customerInfo && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
            <dl className="space-y-3">
              {boqDetail.customerInfo.company && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company</dt>
                  <dd className="text-sm text-gray-900">{boqDetail.customerInfo.company}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Name</dt>
                <dd className="text-sm text-gray-900">{boqDetail.customerInfo.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">
                  <a href={`mailto:${boqDetail.customerInfo.email}`} className="text-blue-600 hover:underline">
                    {boqDetail.customerInfo.email}
                  </a>
                </dd>
              </div>
              {boqDetail.customerInfo.phone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900">{boqDetail.customerInfo.phone}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {/* BOQ/RFQ Content */}
      {viewMode === 'boq' ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Bill of Quantities ({boqDetail.sections.length} sections)
          </h2>

          <div className="space-y-8">
            {boqDetail.sections.map((section) => (
              <SectionTable key={section.id} section={section} />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            RFQ Item Details ({rfqItems.length > 0 ? rfqItems.length : boqDetail.sections.reduce((sum, s) => sum + s.items.length, 0)} items)
          </h2>

          {rfqLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading RFQ details...</span>
            </div>
          ) : rfqItems.length > 0 ? (
            <div className="space-y-6">
              <RfqItemsDetailedView items={rfqItems} />
            </div>
          ) : (
            <div className="space-y-6">
              {boqDetail.sections.map((section) => (
                <RfqSectionTable key={section.id} section={section} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowDeclineModal(false)} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Decline to Quote</h3>
              <p className="text-sm text-gray-500 mb-4">
                Please provide a reason for declining this quotation request.
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Enter your reason..."
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={decliningLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecline}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  disabled={decliningLoading}
                >
                  {decliningLoading ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTable({ section }: { section: BoqSection }) {
  const hasWelds = section.items.some(
    (item) =>
      item.welds?.pipeWeld || item.welds?.flangeWeld || item.welds?.mitreWeld || item.welds?.teeWeld
  );
  const hasAreas = section.items.some((item) => item.areas?.intAreaM2 || item.areas?.extAreaM2);

  // Calculate totals
  const totals = {
    pipeWeld: section.items.reduce((sum, item) => sum + (item.welds?.pipeWeld || 0), 0),
    flangeWeld: section.items.reduce((sum, item) => sum + (item.welds?.flangeWeld || 0), 0),
    mitreWeld: section.items.reduce((sum, item) => sum + (item.welds?.mitreWeld || 0), 0),
    teeWeld: section.items.reduce((sum, item) => sum + (item.welds?.teeWeld || 0), 0),
    intArea: section.items.reduce((sum, item) => sum + (item.areas?.intAreaM2 || 0), 0),
    extArea: section.items.reduce((sum, item) => sum + (item.areas?.extAreaM2 || 0), 0),
    weight: Number(section.totalWeightKg) || 0,
  };

  return (
    <div>
      <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
        {section.sectionTitle}
        <span className="text-sm font-normal text-gray-500">({section.itemCount} items)</span>
      </h3>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              {hasWelds && (
                <>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pipe Weld (m)</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Flange Weld (m)</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Mitre Weld (m)</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tee Weld (m)</th>
                </>
              )}
              {hasAreas && (
                <>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Int m²</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ext m²</th>
                </>
              )}
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {section.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                <td className="px-3 py-2 text-sm text-gray-900">{item.description}</td>
                <td className="px-3 py-2 text-sm text-gray-900 text-right">{item.qty}</td>
                <td className="px-3 py-2 text-sm text-gray-500">{item.unit}</td>
                {hasWelds && (
                  <>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {item.welds?.pipeWeld ? Number(item.welds.pipeWeld).toFixed(3) : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {item.welds?.flangeWeld ? Number(item.welds.flangeWeld).toFixed(3) : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {item.welds?.mitreWeld ? Number(item.welds.mitreWeld).toFixed(3) : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {item.welds?.teeWeld ? Number(item.welds.teeWeld).toFixed(3) : '-'}
                    </td>
                  </>
                )}
                {hasAreas && (
                  <>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {item.areas?.intAreaM2 ? Number(item.areas.intAreaM2).toFixed(2) : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {item.areas?.extAreaM2 ? Number(item.areas.extAreaM2).toFixed(2) : '-'}
                    </td>
                  </>
                )}
                <td className="px-3 py-2 text-sm text-gray-900 text-right font-medium">
                  {Number(item.weightKg || 0).toFixed(2)}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="bg-gray-100 font-medium">
              <td className="px-3 py-2 text-sm text-gray-900" colSpan={4}>
                TOTAL
              </td>
              {hasWelds && (
                <>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.pipeWeld || 0).toFixed(3)}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.flangeWeld || 0).toFixed(3)}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.mitreWeld || 0).toFixed(3)}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.teeWeld || 0).toFixed(3)}</td>
                </>
              )}
              {hasAreas && (
                <>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.intArea || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.extArea || 0).toFixed(2)}</td>
                </>
              )}
              <td className="px-3 py-2 text-sm text-gray-900 text-right">{Number(totals.weight || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RfqSectionTable({ section }: { section: BoqSection }) {
  const hasAreas = section.items.some((item) => item.areas?.intAreaM2 || item.areas?.extAreaM2);

  // Calculate section totals
  const sectionTotals = section.items.reduce(
    (acc, item) => ({
      qty: acc.qty + (item.qty || 0),
      weight: acc.weight + Number(item.weightKg || 0),
      extArea: acc.extArea + Number(item.areas?.extAreaM2 || 0),
      intArea: acc.intArea + Number(item.areas?.intAreaM2 || 0),
    }),
    { qty: 0, weight: 0, extArea: 0, intArea: 0 }
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-2">
        <h3 className="text-white font-semibold text-sm">
          {section.sectionTitle}
          <span className="ml-2 text-blue-200 font-normal">({section.itemCount} items)</span>
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-50 border-b border-blue-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-blue-800 w-24">Item #</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-blue-800">Description</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-20">Weld WT</th>
              {hasAreas && (
                <>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-20">Ext m²</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-20">Int m²</th>
                </>
              )}
              <th className="text-center py-2 px-3 text-xs font-semibold text-blue-800 w-16">Qty</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-blue-800 w-28">Weight/Item</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-blue-800 w-28">Line Weight</th>
            </tr>
          </thead>
          <tbody>
            {section.items.map((item, idx) => {
              const itemNumber = `${section.sectionType.substring(0, 3).toUpperCase()}-${String(idx + 1).padStart(3, '0')}`;
              const weightPerItem = item.qty > 0 ? Number(item.weightKg || 0) / item.qty : 0;
              const lineWeight = Number(item.weightKg || 0);

              // Extract wall thickness from description if available
              const wtMatch = item.description.match(/W\/T\s*(\d+(?:\.\d+)?)\s*mm|(\d+(?:\.\d+)?)\s*mm\s*W\/T|Sch\w*\s*\((\d+(?:\.\d+)?)mm\)/i);
              const weldWt = wtMatch ? (wtMatch[1] || wtMatch[2] || wtMatch[3]) : null;

              return (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 text-xs text-blue-600 font-medium">{itemNumber}</td>
                  <td className="py-2 px-3 text-xs text-gray-700">{item.description}</td>
                  <td className="py-2 px-3 text-xs text-gray-600 text-center">
                    {weldWt ? `${weldWt}mm` : '-'}
                  </td>
                  {hasAreas && (
                    <>
                      <td className="py-2 px-3 text-xs text-gray-600 text-center">
                        {item.areas?.extAreaM2 ? Number(item.areas.extAreaM2).toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600 text-center">
                        {item.areas?.intAreaM2 ? Number(item.areas.intAreaM2).toFixed(2) : '-'}
                      </td>
                    </>
                  )}
                  <td className="py-2 px-3 text-xs text-gray-900 text-center font-medium">{item.qty}</td>
                  <td className="py-2 px-3 text-xs text-gray-600 text-right">
                    {weightPerItem.toFixed(2)} kg
                  </td>
                  <td className="py-2 px-3 text-xs text-green-700 text-right font-semibold">
                    {lineWeight.toFixed(2)} kg
                  </td>
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr className="bg-blue-100 border-t-2 border-blue-300 font-semibold">
              <td className="py-2 px-3 text-xs text-blue-800" colSpan={2}>TOTAL</td>
              <td className="py-2 px-3 text-xs text-blue-800 text-center">-</td>
              {hasAreas && (
                <>
                  <td className="py-2 px-3 text-xs text-blue-800 text-center">
                    {sectionTotals.extArea > 0 ? sectionTotals.extArea.toFixed(2) : '-'}
                  </td>
                  <td className="py-2 px-3 text-xs text-blue-800 text-center">
                    {sectionTotals.intArea > 0 ? sectionTotals.intArea.toFixed(2) : '-'}
                  </td>
                </>
              )}
              <td className="py-2 px-3 text-xs text-blue-800 text-center">{sectionTotals.qty}</td>
              <td className="py-2 px-3 text-xs text-blue-800 text-right">-</td>
              <td className="py-2 px-3 text-xs text-green-700 text-right">{sectionTotals.weight.toFixed(2)} kg</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RfqItemsDetailedView({ items }: { items: RfqItemDetail[] }) {
  const totalWeight = items.reduce((sum, item) => sum + Number(item.totalWeightKg || 0), 0);

  const itemTypeColors: Record<string, { bg: string; badge: string; badgeText: string }> = {
    straight_pipe: { bg: 'bg-blue-50', badge: 'bg-blue-200', badgeText: 'text-blue-800' },
    bend: { bg: 'bg-purple-50', badge: 'bg-purple-200', badgeText: 'text-purple-800' },
    fitting: { bg: 'bg-green-50', badge: 'bg-green-200', badgeText: 'text-green-800' },
  };

  const formatItemType = (type: string) => {
    const labels: Record<string, string> = {
      straight_pipe: 'Pipe',
      bend: 'Bend',
      fitting: 'Fitting',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Items List */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const colors = itemTypeColors[item.itemType] || itemTypeColors.straight_pipe;
          const details = item.straightPipeDetails || item.bendDetails || item.fittingDetails;

          return (
            <div key={item.id} className={`border border-gray-200 rounded-lg p-4 ${colors.bg}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${colors.badge} ${colors.badgeText}`}>
                    {formatItemType(item.itemType)}
                  </span>
                  <h4 className="font-medium text-gray-800">Item #{item.lineNumber || index + 1}</h4>
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {Number(item.totalWeightKg || 0).toFixed(2)} kg
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-3 font-medium">{item.description}</p>

              {/* Item Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {item.straightPipeDetails && (
                  <>
                    <div>
                      <span className="text-gray-500">NB:</span>{' '}
                      <span className="font-medium">{item.straightPipeDetails.nominalBoreMm}mm</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Schedule:</span>{' '}
                      <span className="font-medium">
                        {item.straightPipeDetails.scheduleNumber || `${item.straightPipeDetails.wallThicknessMm}mm WT`}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Length:</span>{' '}
                      <span className="font-medium">
                        {item.straightPipeDetails.individualPipeLength
                          ? Number(item.straightPipeDetails.individualPipeLength).toFixed(3)
                          : item.straightPipeDetails.totalLength
                            ? Number(item.straightPipeDetails.totalLength).toFixed(3)
                            : '-'}m
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Qty:</span>{' '}
                      <span className="font-medium">{item.quantity || item.straightPipeDetails.quantityValue || 1}</span>
                    </div>
                    {item.straightPipeDetails.pipeEndConfiguration && item.straightPipeDetails.pipeEndConfiguration !== 'PE' && (
                      <div className="col-span-2">
                        <span className="text-gray-500">End Config:</span>{' '}
                        <span className="font-medium text-blue-700">{item.straightPipeDetails.pipeEndConfiguration}</span>
                      </div>
                    )}
                    {item.straightPipeDetails.pipeStandard && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Standard:</span>{' '}
                        <span className="font-medium">{item.straightPipeDetails.pipeStandard}</span>
                      </div>
                    )}
                  </>
                )}

                {item.bendDetails && (
                  <>
                    <div>
                      <span className="text-gray-500">NB:</span>{' '}
                      <span className="font-medium">{item.bendDetails.nominalBoreMm}mm</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Angle:</span>{' '}
                      <span className="font-medium">{item.bendDetails.bendDegrees}°</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>{' '}
                      <span className="font-medium">{item.bendDetails.bendType || '1.5D'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Qty:</span>{' '}
                      <span className="font-medium">{item.quantity || 1}</span>
                    </div>
                    {item.bendDetails.scheduleNumber && (
                      <div>
                        <span className="text-gray-500">Schedule:</span>{' '}
                        <span className="font-medium">{item.bendDetails.scheduleNumber}</span>
                      </div>
                    )}
                    {item.bendDetails.bendEndConfiguration && item.bendDetails.bendEndConfiguration !== 'PE' && (
                      <div className="col-span-2">
                        <span className="text-gray-500">End Config:</span>{' '}
                        <span className="font-medium text-purple-700">{item.bendDetails.bendEndConfiguration}</span>
                      </div>
                    )}
                  </>
                )}

                {item.fittingDetails && (
                  <>
                    <div>
                      <span className="text-gray-500">Type:</span>{' '}
                      <span className="font-medium">{item.fittingDetails.fittingType || 'Tee'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">NB:</span>{' '}
                      <span className="font-medium">{item.fittingDetails.nominalDiameterMm}mm</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Qty:</span>{' '}
                      <span className="font-medium">{item.quantity || 1}</span>
                    </div>
                    {item.fittingDetails.scheduleNumber && (
                      <div>
                        <span className="text-gray-500">Schedule:</span>{' '}
                        <span className="font-medium">{item.fittingDetails.scheduleNumber}</span>
                      </div>
                    )}
                    {item.fittingDetails.pipeLengthAMm && (
                      <div>
                        <span className="text-gray-500">Length A:</span>{' '}
                        <span className="font-medium">{item.fittingDetails.pipeLengthAMm}mm</span>
                      </div>
                    )}
                    {item.fittingDetails.pipeLengthBMm && (
                      <div>
                        <span className="text-gray-500">Length B:</span>{' '}
                        <span className="font-medium">{item.fittingDetails.pipeLengthBMm}mm</span>
                      </div>
                    )}
                    {item.fittingDetails.pipeEndConfiguration && item.fittingDetails.pipeEndConfiguration !== 'PE' && (
                      <div className="col-span-2">
                        <span className="text-gray-500">End Config:</span>{' '}
                        <span className="font-medium text-green-700">{item.fittingDetails.pipeEndConfiguration}</span>
                      </div>
                    )}
                  </>
                )}

                {item.weightPerUnitKg && (
                  <div>
                    <span className="text-gray-500">Weight/Unit:</span>{' '}
                    <span className="font-medium">{Number(item.weightPerUnitKg).toFixed(2)} kg</span>
                  </div>
                )}
              </div>

              {item.notes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Notes:</span>{' '}
                  <span className="text-xs text-gray-700">{item.notes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">Total Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700">Total Items</p>
            <p className="text-2xl font-bold text-blue-900">{items.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700">Total Weight</p>
            <p className="text-2xl font-bold text-blue-900">{totalWeight.toFixed(2)} kg</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700">Pipes</p>
            <p className="text-2xl font-bold text-blue-900">
              {items.filter(i => i.itemType === 'straight_pipe').length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-blue-700">Bends/Fittings</p>
            <p className="text-2xl font-bold text-blue-900">
              {items.filter(i => i.itemType === 'bend' || i.itemType === 'fitting').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
