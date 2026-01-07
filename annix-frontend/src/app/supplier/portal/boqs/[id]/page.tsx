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
} from '@/app/lib/api/supplierApi';

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
  const boqId = parseInt(resolvedParams.id, 10);

  const [boqDetail, setBoqDetail] = useState<SupplierBoqDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [decliningLoading, setDecliningLoading] = useState(false);

  useEffect(() => {
    loadBoqDetails();
  }, [boqId]);

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
      alert('Please provide a reason for declining');
      return;
    }

    try {
      setDecliningLoading(true);
      await supplierPortalApi.declineBoq(boqId, declineReason);
      setShowDeclineModal(false);
      loadBoqDetails(); // Refresh to show updated status
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to decline BOQ');
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
            item.welds?.pipeWeld?.toFixed(3) || '-',
            item.welds?.flangeWeld?.toFixed(3) || '-',
            item.welds?.mitreWeld?.toFixed(3) || '-',
            item.welds?.teeWeld?.toFixed(3) || '-'
          );
        }
        if (hasAreas) {
          row.push(
            item.areas?.intAreaM2?.toFixed(2) || '-',
            item.areas?.extAreaM2?.toFixed(2) || '-'
          );
        }
        row.push(item.weightKg.toFixed(2));
        return row;
      });

      // Add totals row
      const totalWeightIdx = headers.indexOf('Weight (kg)');
      const totalsRow: (string | number)[] = headers.map((_, idx) => {
        if (idx === 1) return 'TOTAL';
        if (idx === totalWeightIdx) return section.totalWeightKg?.toFixed(2) || '0.00';
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

      {/* BOQ Sections */}
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
                      {item.welds?.pipeWeld?.toFixed(3) || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {item.welds?.flangeWeld?.toFixed(3) || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {item.welds?.mitreWeld?.toFixed(3) || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {item.welds?.teeWeld?.toFixed(3) || '-'}
                    </td>
                  </>
                )}
                {hasAreas && (
                  <>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {item.areas?.intAreaM2?.toFixed(2) || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {item.areas?.extAreaM2?.toFixed(2) || '-'}
                    </td>
                  </>
                )}
                <td className="px-3 py-2 text-sm text-gray-900 text-right font-medium">
                  {item.weightKg.toFixed(2)}
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
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{totals.pipeWeld.toFixed(3)}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{totals.flangeWeld.toFixed(3)}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{totals.mitreWeld.toFixed(3)}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{totals.teeWeld.toFixed(3)}</td>
                </>
              )}
              {hasAreas && (
                <>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{totals.intArea.toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right">{totals.extArea.toFixed(2)}</td>
                </>
              )}
              <td className="px-3 py-2 text-sm text-gray-900 text-right">{totals.weight.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
