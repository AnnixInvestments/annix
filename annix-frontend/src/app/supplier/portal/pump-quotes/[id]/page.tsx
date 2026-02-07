"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { SupplierQuoteForm } from "@/app/components/pumps";
import { useToast } from "@/app/components/Toast";
import { useSupplierAuth } from "@/app/context/SupplierAuthContext";
import { formatDateZA } from "@/app/lib/datetime";

interface PumpQuoteRequest {
  id: number;
  requestNumber: string;
  customerCompany: string;
  customerContact: string;
  customerEmail: string;
  requestDate: string;
  requiredDate: string;
  status: "pending" | "quoted" | "accepted" | "declined" | "expired";
  pumpType: string;
  quantity: number;
  flowRate: number;
  totalHead: number;
  application: string;
  priority: "normal" | "urgent";
  specifications: {
    fluidType: string;
    temperature: number;
    viscosity?: number;
    solidsContent?: number;
    suctionPressure?: number;
    dischargePressure?: number;
    casingMaterial?: string;
    impellerMaterial?: string;
    sealType?: string;
    motorType?: string;
    voltage?: string;
    hazardousArea?: string;
  };
  notes?: string;
}

const MOCK_REQUEST: PumpQuoteRequest = {
  id: 1,
  requestNumber: "PQR-2026-001",
  customerCompany: "Mining Corp SA",
  customerContact: "John Smith",
  customerEmail: "john.smith@miningcorp.co.za",
  requestDate: "2026-02-01",
  requiredDate: "2026-02-15",
  status: "pending",
  pumpType: "Slurry Pump",
  quantity: 2,
  flowRate: 200,
  totalHead: 45,
  application: "Mining slurry transfer",
  priority: "urgent",
  specifications: {
    fluidType: "Slurry (mining tailings)",
    temperature: 35,
    viscosity: 150,
    solidsContent: 25,
    suctionPressure: 0.5,
    dischargePressure: 4.5,
    casingMaterial: "High chrome alloy",
    impellerMaterial: "High chrome alloy",
    sealType: "Expeller seal",
    motorType: "Electric AC",
    voltage: "525V",
    hazardousArea: "None",
  },
  notes:
    "Pump will be used in underground mining operation. Must be suitable for abrasive slurry with high solids content. Require spare parts package with initial order.",
};

export default function SupplierPumpQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { supplier } = useSupplierAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const request = MOCK_REQUEST;

  const handleSubmitQuote = async (quoteData: any) => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      showToast("Quote submitted successfully", "success");
      router.push("/supplier/portal/pump-quotes");
    } catch (err) {
      showToast("Failed to submit quote. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm("Are you sure you want to decline this quote request?")) return;

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      showToast("Quote request declined", "info");
      router.push("/supplier/portal/pump-quotes");
    } catch (err) {
      showToast("Failed to decline. Please try again.", "error");
    }
  };

  if (showQuoteForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Submit Quote</h1>
            <p className="mt-1 text-gray-600">
              {request.requestNumber} - {request.customerCompany}
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
              id: String(request.id),
              serviceType: "new_pump",
              pumpType: request.pumpType,
              flowRate: request.flowRate,
              totalHead: request.totalHead,
              quantity: request.quantity,
              description: request.application,
            },
          ]}
          rfqNumber={request.requestNumber}
          customerName={request.customerCompany}
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
              <h2 className="text-xl font-semibold text-gray-900">{request.requestNumber}</h2>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                  request.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : request.status === "quoted"
                      ? "bg-blue-100 text-blue-800"
                      : request.status === "accepted"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
              {request.priority === "urgent" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  Urgent
                </span>
              )}
            </div>
            {request.status === "pending" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDecline}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Decline
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
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Company</dt>
                <dd className="text-sm font-medium text-gray-900">{request.customerCompany}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Contact</dt>
                <dd className="text-sm font-medium text-gray-900">{request.customerContact}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-medium text-gray-900">{request.customerEmail}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Request Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Request Date</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDateZA(request.requestDate)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Required By</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDateZA(request.requiredDate)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Application</dt>
                <dd className="text-sm font-medium text-gray-900">{request.application}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pump Requirements</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Pump Type</p>
              <p className="text-lg font-semibold text-gray-900">{request.pumpType}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Quantity</p>
              <p className="text-lg font-semibold text-gray-900">{request.quantity}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Flow Rate</p>
              <p className="text-lg font-semibold text-gray-900">{request.flowRate} m³/h</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Head</p>
              <p className="text-lg font-semibold text-gray-900">{request.totalHead} m</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Specifications</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Fluid Type</p>
              <p className="text-sm font-medium text-gray-900">
                {request.specifications.fluidType}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Temperature</p>
              <p className="text-sm font-medium text-gray-900">
                {request.specifications.temperature}°C
              </p>
            </div>
            {request.specifications.viscosity && (
              <div>
                <p className="text-sm text-gray-500">Viscosity</p>
                <p className="text-sm font-medium text-gray-900">
                  {request.specifications.viscosity} cP
                </p>
              </div>
            )}
            {request.specifications.solidsContent && (
              <div>
                <p className="text-sm text-gray-500">Solids Content</p>
                <p className="text-sm font-medium text-gray-900">
                  {request.specifications.solidsContent}%
                </p>
              </div>
            )}
            {request.specifications.casingMaterial && (
              <div>
                <p className="text-sm text-gray-500">Casing Material</p>
                <p className="text-sm font-medium text-gray-900">
                  {request.specifications.casingMaterial}
                </p>
              </div>
            )}
            {request.specifications.impellerMaterial && (
              <div>
                <p className="text-sm text-gray-500">Impeller Material</p>
                <p className="text-sm font-medium text-gray-900">
                  {request.specifications.impellerMaterial}
                </p>
              </div>
            )}
            {request.specifications.sealType && (
              <div>
                <p className="text-sm text-gray-500">Seal Type</p>
                <p className="text-sm font-medium text-gray-900">
                  {request.specifications.sealType}
                </p>
              </div>
            )}
            {request.specifications.motorType && (
              <div>
                <p className="text-sm text-gray-500">Motor Type</p>
                <p className="text-sm font-medium text-gray-900">
                  {request.specifications.motorType}
                </p>
              </div>
            )}
            {request.specifications.voltage && (
              <div>
                <p className="text-sm text-gray-500">Voltage</p>
                <p className="text-sm font-medium text-gray-900">
                  {request.specifications.voltage}
                </p>
              </div>
            )}
          </div>
        </div>

        {request.notes && (
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Notes</h3>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">{request.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
