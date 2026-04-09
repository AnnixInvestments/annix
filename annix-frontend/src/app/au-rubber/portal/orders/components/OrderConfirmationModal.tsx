"use client";

import { Loader2, Mail, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderNumber: string;
  customerName: string;
  onSent: () => void;
}

export function OrderConfirmationModal(props: OrderConfirmationModalProps) {
  const { isOpen, onClose, orderId, orderNumber, customerName, onSent } = props;
  const [email, setEmail] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfPreview = usePdfPreview();

  const handlePreview = async () => {
    pdfPreview.openWithFetch(
      () => auRubberApiClient.orderConfirmationPdfBlob(orderId),
      `Order-Confirmation-${orderNumber}.pdf`,
    );
  };

  const handleSend = async () => {
    if (!email.trim()) {
      setError("Email address is required");
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      const ccValue = cc.trim() || undefined;
      const bccValue = bcc.trim() || undefined;
      await auRubberApiClient.sendOrderConfirmation(orderId, email.trim(), ccValue, bccValue);
      onSent();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send confirmation";
      setError(msg);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-medium text-gray-900">Send Order Confirmation</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <span className="font-medium">{orderNumber}</span> for{" "}
              <span className="font-medium">{customerName}</span>
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              The email will include a 24-hour dispute notice and 15% handling fee warning for
              cancelled orders.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm border p-2"
            />
          </div>

          {!showCcBcc && (
            <button
              onClick={() => setShowCcBcc(true)}
              className="text-sm text-yellow-600 hover:text-yellow-700"
            >
              + Add CC / BCC
            </button>
          )}

          {showCcBcc && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
                <input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BCC</label>
                <input
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm border p-2"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={handlePreview}
            className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200"
          >
            Preview PDF
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !email.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Confirmation
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>,
    document.body,
  );
}
