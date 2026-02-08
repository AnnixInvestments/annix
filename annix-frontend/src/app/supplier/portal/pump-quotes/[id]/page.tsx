"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SupplierQuoteForm } from "@/app/components/pumps";
import { useToast } from "@/app/components/Toast";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useDeclinePumpQuote,
  useMarkPumpQuoteViewed,
  useSubmitPumpQuote,
  useSupplierPumpQuoteDetails,
} from "@/app/lib/query/hooks";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending Quote" },
  viewed: { bg: "bg-blue-50", text: "text-blue-700", label: "Viewed" },
  quoted: { bg: "bg-blue-100", text: "text-blue-800", label: "Quote Submitted" },
  declined: { bg: "bg-red-100", text: "text-red-800", label: "Declined" },
  expired: { bg: "bg-gray-100", text: "text-gray-800", label: "Expired" },
};

export default function SupplierPumpQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const rfqId = Number(params.id);
  const { data, isLoading, error } = useSupplierPumpQuoteDetails(rfqId);
  const markViewedMutation = useMarkPumpQuoteViewed();
  const declineMutation = useDeclinePumpQuote();
  const submitQuoteMutation = useSubmitPumpQuote();

  useEffect(() => {
    if (data && data.accessStatus === "pending") {
      markViewedMutation.mutate(rfqId);
    }
  }, [data, rfqId]);

  const handleSubmitQuote = async (quote: {
    lineItems: Array<{
      rfqItemId: string;
      unitPrice: number;
      quantity: number;
      leadTimeDays: number;
      notes?: string;
    }>;
    totalAmount: number;
    generalNotes?: string;
  }) => {
    const firstItem = quote.lineItems[0];
    const quoteData = {
      unitPrice: firstItem?.unitPrice ?? 0,
      totalPrice: quote.totalAmount,
      leadTimeDays: firstItem?.leadTimeDays,
      notes: quote.generalNotes,
    };

    submitQuoteMutation.mutate(
      { rfqId, data: quoteData },
      {
        onSuccess: () => {
          showToast("Quote submitted successfully", "success");
          router.push("/supplier/portal/pump-quotes");
        },
        onError: () => {
          showToast("Failed to submit quote. Please try again.", "error");
        },
      },
    );
  };

  const handleDecline = async () => {
    const reason = prompt("Please provide a reason for declining this quote request:");
    if (reason === null) return;

    declineMutation.mutate(
      { rfqId, reason: reason || "No reason provided" },
      {
        onSuccess: () => {
          showToast("Quote request declined", "info");
          router.push("/supplier/portal/pump-quotes");
        },
        onError: () => {
          showToast("Failed to decline. Please try again.", "error");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading pump quote details. Please try again later.</p>
        <Link
          href="/supplier/portal/pump-quotes"
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          Back to Pump Quotes
        </Link>
      </div>
    );
  }

  const { rfq, customer, pump, item, accessStatus } = data;
  const canQuote = accessStatus === "pending" || accessStatus === "viewed";
  const statusStyle = STATUS_STYLES[accessStatus] ?? STATUS_STYLES.pending;

  if (showQuoteForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submit Quote</h1>
            <p className="mt-1 text-gray-600">
              {rfq.rfqNumber} - {customer.company ?? customer.name}
            </p>
          </div>
          <button
            onClick={() => setShowQuoteForm(false)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Details
          </button>
        </div>

        <SupplierQuoteForm
          rfqItems={[
            {
              id: String(item?.id ?? rfq.id),
              serviceType:
                (pump?.serviceType as "new_pump" | "spare_parts" | "repair_service" | "rental") ??
                "new_pump",
              pumpType: pump?.pumpType ?? "Unknown",
              flowRate: pump?.flowRate ?? 0,
              totalHead: pump?.totalHead ?? 0,
              quantity: pump?.quantity ?? item?.quantity ?? 1,
              description: item?.description ?? rfq.description ?? pump?.pumpType ?? "",
            },
          ]}
          rfqNumber={rfq.rfqNumber}
          customerName={customer.company ?? customer.name}
          onSubmit={handleSubmitQuote}
          onCancel={() => setShowQuoteForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quote Request Details</h1>
          <p className="mt-1 text-gray-600">Review the requirements and submit your quotation</p>
        </div>
        <Link
          href="/supplier/portal/pump-quotes"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Requests
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">{rfq.rfqNumber}</h2>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
              >
                {statusStyle.label}
              </span>
            </div>
            {canQuote && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDecline}
                  disabled={declineMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {declineMutation.isPending ? "Declining..." : "Decline"}
                </button>
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Submit Quote
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
            <dl className="space-y-3">
              {customer.company && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Company</dt>
                  <dd className="text-sm font-medium text-gray-900">{customer.company}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Contact</dt>
                <dd className="text-sm font-medium text-gray-900">{customer.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-medium text-gray-900">{customer.email}</dd>
              </div>
              {customer.phone && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Phone</dt>
                  <dd className="text-sm font-medium text-gray-900">{customer.phone}</dd>
                </div>
              )}
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Request Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Project</dt>
                <dd className="text-sm font-medium text-gray-900">{rfq.projectName}</dd>
              </div>
              {rfq.requiredDate && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Required By</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {formatDateZA(rfq.requiredDate)}
                  </dd>
                </div>
              )}
              {pump?.serviceType && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Service Type</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {pump.serviceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {pump && (
          <>
            <div className="p-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pump Requirements</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Pump Type</p>
                  <p className="text-lg font-semibold text-gray-900">{pump.pumpType}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Quantity</p>
                  <p className="text-lg font-semibold text-gray-900">{pump.quantity}</p>
                </div>
                {pump.flowRate && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Flow Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{pump.flowRate} m³/h</p>
                  </div>
                )}
                {pump.totalHead && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Total Head</p>
                    <p className="text-lg font-semibold text-gray-900">{pump.totalHead} m</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Specifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {pump.fluidType && (
                  <div>
                    <p className="text-sm text-gray-500">Fluid Type</p>
                    <p className="text-sm font-medium text-gray-900">{pump.fluidType}</p>
                  </div>
                )}
                {pump.operatingTemp != null && (
                  <div>
                    <p className="text-sm text-gray-500">Temperature</p>
                    <p className="text-sm font-medium text-gray-900">{pump.operatingTemp}°C</p>
                  </div>
                )}
                {pump.viscosity != null && (
                  <div>
                    <p className="text-sm text-gray-500">Viscosity</p>
                    <p className="text-sm font-medium text-gray-900">{pump.viscosity} cP</p>
                  </div>
                )}
                {pump.specificGravity != null && (
                  <div>
                    <p className="text-sm text-gray-500">Specific Gravity</p>
                    <p className="text-sm font-medium text-gray-900">{pump.specificGravity}</p>
                  </div>
                )}
                {pump.npshAvailable != null && (
                  <div>
                    <p className="text-sm text-gray-500">NPSH Available</p>
                    <p className="text-sm font-medium text-gray-900">{pump.npshAvailable} m</p>
                  </div>
                )}
                {pump.casingMaterial && (
                  <div>
                    <p className="text-sm text-gray-500">Casing Material</p>
                    <p className="text-sm font-medium text-gray-900">{pump.casingMaterial}</p>
                  </div>
                )}
                {pump.impellerMaterial && (
                  <div>
                    <p className="text-sm text-gray-500">Impeller Material</p>
                    <p className="text-sm font-medium text-gray-900">{pump.impellerMaterial}</p>
                  </div>
                )}
                {pump.shaftMaterial && (
                  <div>
                    <p className="text-sm text-gray-500">Shaft Material</p>
                    <p className="text-sm font-medium text-gray-900">{pump.shaftMaterial}</p>
                  </div>
                )}
                {pump.sealType && (
                  <div>
                    <p className="text-sm text-gray-500">Seal Type</p>
                    <p className="text-sm font-medium text-gray-900">{pump.sealType}</p>
                  </div>
                )}
                {pump.motorType && (
                  <div>
                    <p className="text-sm text-gray-500">Motor Type</p>
                    <p className="text-sm font-medium text-gray-900">{pump.motorType}</p>
                  </div>
                )}
                {pump.voltage && (
                  <div>
                    <p className="text-sm text-gray-500">Voltage</p>
                    <p className="text-sm font-medium text-gray-900">{pump.voltage}</p>
                  </div>
                )}
                {pump.frequency && (
                  <div>
                    <p className="text-sm text-gray-500">Frequency</p>
                    <p className="text-sm font-medium text-gray-900">{pump.frequency}</p>
                  </div>
                )}
              </div>
            </div>

            {pump.existingPumpModel && (
              <div className="p-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Existing Pump Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Model</p>
                    <p className="text-sm font-medium text-gray-900">{pump.existingPumpModel}</p>
                  </div>
                  {pump.existingPumpSerial && (
                    <div>
                      <p className="text-sm text-gray-500">Serial Number</p>
                      <p className="text-sm font-medium text-gray-900">{pump.existingPumpSerial}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {pump.spareParts && pump.spareParts.length > 0 && (
              <div className="p-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Required Spare Parts</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Part Number
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Description
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pump.spareParts.map((part, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">{part.partNumber}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{part.description}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {part.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {pump.rentalDurationDays != null && (
              <div className="p-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Requirements</h3>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="text-sm font-medium text-gray-900">
                    {pump.rentalDurationDays} days
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {(rfq.notes || item?.notes) && (
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Notes</h3>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">
              {rfq.notes ?? item?.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
