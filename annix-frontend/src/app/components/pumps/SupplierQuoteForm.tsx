'use client';

import React, { useState, useMemo } from 'react';

interface PumpRfqItem {
  id: string;
  serviceType: 'new_pump' | 'spare_parts' | 'repair_service' | 'rental';
  pumpType?: string;
  pumpCategory?: string;
  flowRate?: number;
  totalHead?: number;
  quantity: number;
  description?: string;
  existingPumpModel?: string;
  spareParts?: string[];
}

interface QuoteLineItem {
  rfqItemId: string;
  unitPrice: number;
  quantity: number;
  leadTimeDays: number;
  notes?: string;
  alternativeOffered?: boolean;
  alternativeDescription?: string;
  alternativeUnitPrice?: number;
}

interface SupplierQuoteFormProps {
  rfqItems: PumpRfqItem[];
  rfqNumber?: string;
  customerName?: string;
  onSubmit: (quote: SupplierQuote) => void;
  onSaveDraft?: (quote: Partial<SupplierQuote>) => void;
  onCancel?: () => void;
}

interface SupplierQuote {
  rfqNumber?: string;
  quoteNumber: string;
  validUntil: string;
  currency: string;
  deliveryTerms: string;
  paymentTerms: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  generalNotes?: string;
  termsAndConditions?: string;
  attachments?: string[];
}

const DELIVERY_TERMS = [
  { value: 'ex_works', label: 'Ex Works (EXW)' },
  { value: 'fob', label: 'Free on Board (FOB)' },
  { value: 'cif', label: 'Cost, Insurance & Freight (CIF)' },
  { value: 'dap', label: 'Delivered at Place (DAP)' },
  { value: 'ddp', label: 'Delivered Duty Paid (DDP)' },
];

const PAYMENT_TERMS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'net_30', label: 'Net 30 Days' },
  { value: 'net_60', label: 'Net 60 Days' },
  { value: 'pro_forma', label: '100% Pro-forma' },
  { value: 'deposit_balance', label: '50% Deposit, 50% on Delivery' },
];

const SERVICE_TYPE_LABELS: Record<string, string> = {
  new_pump: 'New Pump Supply',
  spare_parts: 'Spare Parts',
  repair_service: 'Repair Service',
  rental: 'Pump Rental',
};

const VAT_RATE = 0.15;

export function SupplierQuoteForm({
  rfqItems,
  rfqNumber,
  customerName,
  onSubmit,
  onSaveDraft,
  onCancel,
}: SupplierQuoteFormProps) {
  const [quoteNumber, setQuoteNumber] = useState(`QT-${Date.now().toString(36).toUpperCase()}`);
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  const [currency, setCurrency] = useState('ZAR');
  const [deliveryTerms, setDeliveryTerms] = useState('dap');
  const [paymentTerms, setPaymentTerms] = useState('net_30');
  const [generalNotes, setGeneralNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. Prices are valid for the period stated above.\n2. Delivery times are estimates and subject to change.\n3. All prices exclude VAT unless otherwise stated.\n4. Payment terms as stated above.'
  );

  const [lineItems, setLineItems] = useState<QuoteLineItem[]>(
    rfqItems.map((item) => ({
      rfqItemId: item.id,
      unitPrice: 0,
      quantity: item.quantity,
      leadTimeDays: 14,
      notes: '',
      alternativeOffered: false,
      alternativeDescription: '',
      alternativeUnitPrice: 0,
    }))
  );

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const updateLineItem = (rfqItemId: string, updates: Partial<QuoteLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => (item.rfqItemId === rfqItemId ? { ...item, ...updates } : item))
    );
  };

  const toggleExpanded = (rfqItemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(rfqItemId)) {
        next.delete(rfqItemId);
      } else {
        next.add(rfqItemId);
      }
      return next;
    });
  };

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      const baseTotal = item.unitPrice * item.quantity;
      const altTotal = item.alternativeOffered && item.alternativeUnitPrice
        ? item.alternativeUnitPrice * item.quantity
        : 0;
      return sum + baseTotal + altTotal;
    }, 0);

    const vatAmount = subtotal * VAT_RATE;
    const totalAmount = subtotal + vatAmount;

    return { subtotal, vatAmount, totalAmount };
  }, [lineItems]);

  const isValid = useMemo(() => {
    return lineItems.every((item) => item.unitPrice > 0 && item.leadTimeDays > 0);
  }, [lineItems]);

  const handleSubmit = () => {
    if (!isValid) return;

    const quote: SupplierQuote = {
      rfqNumber,
      quoteNumber,
      validUntil,
      currency,
      deliveryTerms,
      paymentTerms,
      lineItems,
      ...totals,
      generalNotes: generalNotes || undefined,
      termsAndConditions: termsAndConditions || undefined,
    };

    onSubmit(quote);
  };

  const handleSaveDraft = () => {
    if (onSaveDraft) {
      onSaveDraft({
        rfqNumber,
        quoteNumber,
        validUntil,
        currency,
        deliveryTerms,
        paymentTerms,
        lineItems,
        ...totals,
        generalNotes,
        termsAndConditions,
      });
    }
  };

  const rfqItemMap = useMemo(() => {
    return rfqItems.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {} as Record<string, PumpRfqItem>);
  }, [rfqItems]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Submit Quote</h3>
            {rfqNumber && (
              <p className="text-sm text-gray-600 mt-1">
                For RFQ: {rfqNumber} {customerName && `- ${customerName}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSaveDraft && (
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Save Draft
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quote Number</label>
            <input
              type="text"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ZAR">ZAR - South African Rand</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Terms</label>
            <select
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {DELIVERY_TERMS.map((term) => (
                <option key={term.value} value={term.value}>
                  {term.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {PAYMENT_TERMS.map((term) => (
                <option key={term.value} value={term.value}>
                  {term.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-4">Line Items</h4>
          <div className="space-y-4">
            {lineItems.map((lineItem, index) => {
              const rfqItem = rfqItemMap[lineItem.rfqItemId];
              const isExpanded = expandedItems.has(lineItem.rfqItemId);
              const lineTotal = lineItem.unitPrice * lineItem.quantity;

              return (
                <div key={lineItem.rfqItemId} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="p-4 bg-gray-50 cursor-pointer flex items-center justify-between"
                    onClick={() => toggleExpanded(lineItem.rfqItemId)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 font-medium">#{index + 1}</span>
                      <div>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded mr-2">
                          {SERVICE_TYPE_LABELS[rfqItem.serviceType]}
                        </span>
                        <span className="font-medium text-gray-900">
                          {rfqItem.pumpType || rfqItem.existingPumpModel || 'Pump Item'}
                        </span>
                        <span className="text-gray-500 ml-2">x {rfqItem.quantity}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {lineItem.unitPrice > 0 && (
                        <span className="font-medium text-gray-900">
                          {currency} {lineTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 space-y-4 border-t border-gray-200">
                      {rfqItem.description && (
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-sm text-gray-600">{rfqItem.description}</p>
                          {rfqItem.flowRate && (
                            <p className="text-sm text-gray-500 mt-1">
                              Flow: {rfqItem.flowRate} m³/h | Head: {rfqItem.totalHead} m
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price ({currency}) *
                          </label>
                          <input
                            type="number"
                            value={lineItem.unitPrice || ''}
                            onChange={(e) =>
                              updateLineItem(lineItem.rfqItemId, {
                                unitPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={lineItem.quantity}
                            onChange={(e) =>
                              updateLineItem(lineItem.rfqItemId, {
                                quantity: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                            min={1}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Lead Time (days) *
                          </label>
                          <input
                            type="number"
                            value={lineItem.leadTimeDays || ''}
                            onChange={(e) =>
                              updateLineItem(lineItem.rfqItemId, {
                                leadTimeDays: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                            min={0}
                            placeholder="14"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={lineItem.notes || ''}
                          onChange={(e) => updateLineItem(lineItem.rfqItemId, { notes: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                          placeholder="Any additional notes for this item..."
                        />
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={lineItem.alternativeOffered}
                            onChange={(e) =>
                              updateLineItem(lineItem.rfqItemId, {
                                alternativeOffered: e.target.checked,
                              })
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Offer Alternative Product</span>
                        </label>

                        {lineItem.alternativeOffered && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Alternative Description
                              </label>
                              <input
                                type="text"
                                value={lineItem.alternativeDescription || ''}
                                onChange={(e) =>
                                  updateLineItem(lineItem.rfqItemId, {
                                    alternativeDescription: e.target.value,
                                  })
                                }
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Equivalent model or alternative..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Alternative Unit Price ({currency})
                              </label>
                              <input
                                type="number"
                                value={lineItem.alternativeUnitPrice || ''}
                                onChange={(e) =>
                                  updateLineItem(lineItem.rfqItemId, {
                                    alternativeUnitPrice: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                min={0}
                                step={0.01}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">General Notes</label>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Any general notes about this quote..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
          <textarea
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
          />
        </div>
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="flex justify-between items-start">
          <div>
            {!isValid && (
              <p className="text-sm text-red-600">
                Please complete all required fields (unit price and lead time for each item)
              </p>
            )}
          </div>

          <div className="text-right">
            <div className="space-y-1 mb-4">
              <div className="flex justify-between gap-8 text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  {currency} {totals.subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between gap-8 text-sm">
                <span className="text-gray-600">VAT (15%):</span>
                <span className="font-medium">
                  {currency} {totals.vatAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between gap-8 text-lg pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-900">Total:</span>
                <span className="font-bold text-gray-900">
                  {currency} {totals.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={`px-6 py-2 rounded-md font-medium ${
                isValid
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Submit Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupplierQuoteForm;
