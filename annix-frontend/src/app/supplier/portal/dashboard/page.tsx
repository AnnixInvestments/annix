'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupplierAuth } from '@/app/context/SupplierAuthContext';
import { type SupplierBoqListItem, type SupplierBoqStatus } from '@/app/lib/api/supplierApi';
import { useToast } from '@/app/components/Toast';
import { formatDateZA, fromISO, now, nowMillis, formatIcsDate } from '@/app/lib/datetime';
import {
  useSupplierOnboardingStatus,
  useSupplierDashboardBoqs,
  useDeclineBoq,
  useMarkBoqViewed,
  useSetBoqReminder,
} from '@/app/lib/query/hooks';

const statusColors: Record<SupplierBoqStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Response' },
  viewed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Viewed' },
  quoted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Quoted' },
  declined: { bg: 'bg-red-100', text: 'text-red-800', label: 'Declined' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' },
};

export default function SupplierDashboardPage() {
  const { supplier, dashboard, refreshDashboard } = useSupplierAuth();
  const { showToast } = useToast();
  const onboardingQuery = useSupplierOnboardingStatus();
  const boqsQuery = useSupplierDashboardBoqs();
  const declineMutation = useDeclineBoq();
  const markViewedMutation = useMarkBoqViewed();
  const setReminderMutation = useSetBoqReminder();

  const onboardingStatus = onboardingQuery.data ?? null;
  const boqs = boqsQuery.data ?? [];
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedBoqForDecline, setSelectedBoqForDecline] = useState<SupplierBoqListItem | null>(null);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState<string>('');
  const [customDeclineReasons, setCustomDeclineReasons] = useState<string[]>([]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const defaultDeclineReasons = [
    'Capacity constraints - current workload too high',
    'Material specifications outside our capability',
    'Project timeline too tight',
    'Geographic location not serviceable',
    'Required certifications not held',
    'Price competitiveness concerns',
    'Minimum order quantity not met',
    'Technical specifications unclear',
    'Payment terms not acceptable',
    'Currently not quoting on new work',
  ];

  useEffect(() => {
    const savedReasons = localStorage.getItem('supplierCustomDeclineReasons');
    if (savedReasons) {
      try {
        setCustomDeclineReasons(JSON.parse(savedReasons));
      } catch {
        setCustomDeclineReasons([]);
      }
    }
  }, []);
  const [selectedBoqForCalendar, setSelectedBoqForCalendar] = useState<SupplierBoqListItem | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<string>('none');

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const handleDeclineClick = (boq: SupplierBoqListItem) => {
    setSelectedBoqForDecline(boq);
    setSelectedDeclineReason('');
    setDeclineReason('');
    setShowDeclineModal(true);
  };

  const handleDeclineReasonSelect = (reason: string) => {
    setSelectedDeclineReason(reason);
    if (reason !== 'other') {
      setDeclineReason(reason);
    } else {
      setDeclineReason('');
    }
  };

  const handleConfirmDecline = async () => {
    const finalReason = selectedDeclineReason === 'other' ? declineReason.trim() : selectedDeclineReason;

    if (!selectedBoqForDecline || !finalReason) {
      showToast('Please select or enter a reason for declining', 'warning');
      return;
    }

    try {
      await declineMutation.mutateAsync({ boqId: selectedBoqForDecline.id, reason: finalReason });

      if (selectedDeclineReason === 'other' && declineReason.trim()) {
        const newCustomReasons = [...customDeclineReasons, declineReason.trim()].slice(-10);
        setCustomDeclineReasons(newCustomReasons);
        localStorage.setItem('supplierCustomDeclineReasons', JSON.stringify(newCustomReasons));
      }

      showToast('RFQ declined successfully', 'success');
      setShowDeclineModal(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to decline', 'error');
    }
  };

  const allDeclineReasons = [...defaultDeclineReasons, ...customDeclineReasons];

  const handleIntendToQuote = async (boqId: number) => {
    try {
      await markViewedMutation.mutateAsync(boqId);
      showToast('Marked as intending to quote', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  const handleCalendarClick = (boq: SupplierBoqListItem) => {
    setSelectedBoqForCalendar(boq);
    setSelectedReminder('none');
    setShowCalendarModal(true);
  };

  const generateIcsFile = (boq: SupplierBoqListItem) => {
    if (!boq.projectInfo?.requiredDate) {
      showToast('No closing date available for this RFQ', 'warning');
      return;
    }

    const closingDate = fromISO(boq.projectInfo.requiredDate);
    const eventEndDate = closingDate.plus({ hours: 1 });

    const eventStart = formatIcsDate(boq.projectInfo.requiredDate);
    const eventEnd = formatIcsDate(eventEndDate.toISO() ?? '');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Annix//RFQ Closing Date//EN',
      'BEGIN:VEVENT',
      `UID:${boq.id}-${nowMillis()}@annix.co.za`,
      `DTSTAMP:${formatIcsDate(now().toISO() ?? '')}`,
      `DTSTART:${eventStart}`,
      `DTEND:${eventEnd}`,
      `SUMMARY:RFQ Closing - ${boq.boqNumber}`,
      `DESCRIPTION:RFQ ${boq.boqNumber} closing date for ${boq.projectInfo?.name || 'Project'}\\nCustomer: ${boq.customerInfo?.company || boq.customerInfo?.name || 'N/A'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RFQ-${boq.boqNumber}-closing.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Calendar event downloaded', 'success');
  };

  const handleSaveReminder = async () => {
    if (!selectedBoqForCalendar) return;

    try {
      await setReminderMutation.mutateAsync({ boqId: selectedBoqForCalendar.id, reminderDays: selectedReminder });
      showToast(selectedReminder === 'none' ? 'Reminder cancelled' : 'Reminder set successfully', 'success');
      setShowCalendarModal(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to set reminder', 'error');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return formatDateZA(dateString);
  };

  const getDaysUntilDeadline = (dateString?: string): number | null => {
    if (!dateString) return null;
    const deadline = fromISO(dateString).startOf('day');
    const today = now().startOf('day');
    const diffDays = deadline.diff(today, 'days').days;
    return Math.ceil(diffDays);
  };

  const boqStats = {
    pending: boqs.filter(b => b.status === 'pending').length,
    viewed: boqs.filter(b => b.status === 'viewed').length,
    quoted: boqs.filter(b => b.status === 'quoted').length,
    declined: boqs.filter(b => b.status === 'declined').length,
    total: boqs.length,
  };

  const pendingBoqs = boqs.filter(b => b.status === 'pending' || b.status === 'viewed');

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {supplier?.firstName || supplier?.companyName || 'Supplier'}
            </h1>
            <p className="mt-1 text-gray-600">{dashboard?.profile.email}</p>
          </div>
          {onboardingStatus?.status === 'approved' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Approved Supplier
            </span>
          )}
        </div>
      </div>

      {/* RFQ Statistics - Only show for approved suppliers */}
      {onboardingStatus?.status === 'approved' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total RFQs" value={boqStats.total} icon={<DocumentIcon />} color="blue" />
          <StatCard label="Pending" value={boqStats.pending} icon={<ClockIcon />} color="yellow" />
          <StatCard label="Intend to Quote" value={boqStats.viewed} icon={<EyeIcon />} color="purple" />
          <StatCard label="Quoted" value={boqStats.quoted} icon={<CheckIcon />} color="green" />
          <StatCard label="Declined" value={boqStats.declined} icon={<XIcon />} color="red" />
        </div>
      )}

      {/* RFQ List - Only show for approved suppliers */}
      {onboardingStatus?.status === 'approved' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">RFQ Requests</h2>
                <p className="text-sm text-gray-500">Respond to quotation requests from customers</p>
              </div>
            </div>
            <Link
              href="/supplier/portal/boqs"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </Link>
          </div>

          {boqsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : boqs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No RFQ requests yet</h3>
              <p className="mt-2 text-sm text-gray-500">You will receive RFQ requests from customers here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {boqs.slice(0, 10).map((boq) => {
                const statusStyle = statusColors[boq.status];
                const daysLeft = getDaysUntilDeadline(boq.projectInfo?.requiredDate);
                const isUrgent = daysLeft !== null && daysLeft <= 3;
                const canRespond = boq.status === 'pending' || boq.status === 'viewed';

                return (
                  <div key={boq.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* RFQ Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {boq.boqNumber}
                          </h3>
                          {isUrgent && canRespond && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              {daysLeft === 0 ? 'Closes Today!' : `${daysLeft} days left`}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {boq.customerInfo?.company || boq.customerInfo?.name || 'Customer'}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {boq.projectInfo?.name || 'Project'}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Closes: {formatDate(boq.projectInfo?.requiredDate)}
                          </span>
                          {boq.projectInfo?.requiredDate && (
                            <button
                              onClick={() => handleCalendarClick(boq)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-teal-700 bg-teal-50 rounded hover:bg-teal-100 transition-colors"
                              title="Add to calendar & set reminder"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Remind Me
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* View BOQ/Documents */}
                        <Link
                          href={`/supplier/portal/boqs/${boq.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View BOQ
                        </Link>

                        {/* Response Actions - Only for pending/viewed */}
                        {canRespond && (
                          <>
                            {boq.status === 'pending' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleIntendToQuote(boq.id);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Will Quote
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeclineClick(boq);
                              }}
                              disabled={declineMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Onboarding Status for Non-Approved Suppliers */}
      {onboardingStatus?.status !== 'approved' && (
        <>
          {/* Status Banner */}
          <div className={`rounded-lg border p-4 ${getStatusColor(onboardingStatus?.status || 'draft')}`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {onboardingStatus?.status === 'rejected' ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium">
                  Status: {(onboardingStatus?.status || 'draft').replace(/_/g, ' ').toUpperCase()}
                </h3>
                <p className="mt-1 text-sm">
                  {getStatusMessage(onboardingStatus?.status || 'draft')}
                </p>
              </div>
            </div>
          </div>

          {/* Onboarding Checklist */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Onboarding Checklist</h2>
            <div className="space-y-3">
              <ChecklistItem
                label="Company Details"
                complete={onboardingStatus?.companyDetailsComplete || false}
                href="/supplier/portal/onboarding"
              />
              <ChecklistItem
                label="Required Documents"
                complete={onboardingStatus?.documentsComplete || false}
                href="/supplier/portal/documents"
                subtext={
                  onboardingStatus?.missingDocuments?.length
                    ? `Missing: ${onboardingStatus.missingDocuments.join(', ')}`
                    : undefined
                }
              />
            </div>

            {onboardingStatus?.canSubmit && onboardingStatus.status === 'draft' && (
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3">
                  All requirements met! You can now submit your application for review.
                </p>
                <Link
                  href="/supplier/portal/onboarding"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Submit Application
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Company Details"
          description="Update your company information"
          href="/supplier/portal/company"
          icon={<BuildingIcon />}
        />
        <QuickActionCard
          title="Documents"
          description="Manage your compliance documents"
          href="/supplier/portal/documents"
          icon={<DocumentUploadIcon />}
        />
        <QuickActionCard
          title="Profile Settings"
          description="Manage your account"
          href="/supplier/portal/profile"
          icon={<UserIcon />}
        />
      </div>

      {/* Decline Modal */}
      {showDeclineModal && selectedBoqForDecline && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowDeclineModal(false)} />
            <div className="relative bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Decline RFQ</h3>
              <p className="text-sm text-gray-500 mb-4">
                You are declining <strong>{selectedBoqForDecline.boqNumber}</strong>. Please select a reason.
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {allDeclineReasons.map((reason, index) => (
                  <label
                    key={index}
                    className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDeclineReason === reason
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="declineReason"
                      value={reason}
                      checked={selectedDeclineReason === reason}
                      onChange={() => handleDeclineReasonSelect(reason)}
                      className="mt-0.5 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">{reason}</span>
                    {customDeclineReasons.includes(reason) && (
                      <span className="ml-auto text-xs text-gray-400 italic">Custom</span>
                    )}
                  </label>
                ))}

                <label
                  className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedDeclineReason === 'other'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="declineReason"
                    value="other"
                    checked={selectedDeclineReason === 'other'}
                    onChange={() => handleDeclineReasonSelect('other')}
                    className="mt-0.5 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <span className="ml-3 text-sm text-gray-700 font-medium">Other (specify below)</span>
                </label>
              </div>

              {selectedDeclineReason === 'other' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Reason
                  </label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter your reason for declining..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This reason will be saved for future use.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={declineMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecline}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  disabled={declineMutation.isPending || !selectedDeclineReason || (selectedDeclineReason === 'other' && !declineReason.trim())}
                >
                  {declineMutation.isPending ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar/Reminder Modal */}
      {showCalendarModal && selectedBoqForCalendar && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCalendarModal(false)} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar & Reminder</h3>
              <p className="text-sm text-gray-500 mb-4">
                RFQ <strong>{selectedBoqForCalendar.boqNumber}</strong> closes on{' '}
                <strong>{formatDate(selectedBoqForCalendar.projectInfo?.requiredDate)}</strong>
              </p>

              <div className="mb-6">
                <button
                  onClick={() => generateIcsFile(selectedBoqForCalendar)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Add to External Calendar
                </button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Downloads an .ics file you can open with Outlook, Google Calendar, etc.
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Email Reminder</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Would you like us to send you an email reminder before the closing date?
                </p>
                <div className="space-y-2">
                  {[
                    { value: '7', label: '7 days before' },
                    { value: '3', label: '3 days before' },
                    { value: '1', label: '1 day before' },
                    { value: 'none', label: 'No reminder' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedReminder === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reminder"
                        value={option.value}
                        checked={selectedReminder === option.value}
                        onChange={(e) => setSelectedReminder(e.target.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={setReminderMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReminder}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={setReminderMutation.isPending}
                >
                  {setReminderMutation.isPending ? 'Saving...' : 'Save Reminder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'submitted':
    case 'under_review':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getStatusMessage(status: string) {
  switch (status) {
    case 'approved':
      return 'Your supplier account has been approved. You can now access all portal features.';
    case 'rejected':
      return 'Your application was not approved. Please review the feedback and resubmit.';
    case 'submitted':
      return 'Your application has been submitted and is awaiting review.';
    case 'under_review':
      return 'Your application is currently being reviewed by our team.';
    default:
      return 'Complete your onboarding to become an approved supplier.';
  }
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: 'blue' | 'yellow' | 'purple' | 'green' | 'red' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  const iconColors = {
    blue: 'text-blue-500',
    yellow: 'text-yellow-500',
    purple: 'text-purple-500',
    green: 'text-green-500',
    red: 'text-red-500',
  };

  return (
    <div className={`rounded-lg p-4 border ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm opacity-75">{label}</p>
        </div>
        <div className={iconColors[color]}>{icon}</div>
      </div>
    </div>
  );
}

function ChecklistItem({ label, complete, href, subtext }: { label: string; complete: boolean; href: string; subtext?: string }) {
  return (
    <Link href={href} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
      <div className="flex items-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${complete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
          {complete ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
            </svg>
          )}
        </div>
        <div>
          <span className={complete ? 'text-gray-900' : 'text-gray-600'}>{label}</span>
          {subtext && <p className="text-xs text-red-500 mt-0.5">{subtext}</p>}
        </div>
      </div>
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function QuickActionCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="text-blue-600 mb-3">{icon}</div>
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </Link>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function DocumentUploadIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
