'use client';

import React, { useState, useMemo } from 'react';
import { currencyByCode, DEFAULT_CURRENCY } from '@/app/lib/currencies';
import { formatDateTimeZA } from '@/app/lib/datetime';

export interface SupplierQuote {
  supplierId: number;
  supplierName: string;
  companyName?: string;
  status: 'pending' | 'viewed' | 'quoted' | 'declined' | 'expired';
  quoteSubmittedAt?: string | null;
  viewedAt?: string | null;
  declineReason?: string | null;
  currencyCode?: string;
  quoteData?: {
    pricingInputs?: Record<string, any>;
    unitPrices?: Record<string, Record<number, number>>;
    weldUnitPrices?: Record<string, number>;
    totals?: {
      subtotal: number;
      contingencies: number;
      grandTotalExVat: number;
      vatAmount: number;
      grandTotalIncVat: number;
    };
    leadTimeDays?: number;
    validityDays?: number;
    notes?: string;
  };
  allowedSections: string[];
}

interface QuoteComparisonViewProps {
  quotes: SupplierQuote[];
  boqNumber?: string;
  projectName?: string;
  onSelectQuote?: (supplierId: number) => void;
  selectedSupplierId?: number;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Awaiting Quote' },
  viewed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Viewed' },
  quoted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Quoted' },
  declined: { bg: 'bg-red-100', text: 'text-red-800', label: 'Declined' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Expired' },
};

export default function QuoteComparisonView({
  quotes,
  boqNumber,
  projectName,
  onSelectQuote,
  selectedSupplierId,
}: QuoteComparisonViewProps) {
  const [sortBy, setSortBy] = useState<'price' | 'supplier' | 'date'>('price');
  const [selectedQuotes, setSelectedQuotes] = useState<number[]>([]);
  const [showDeclined, setShowDeclined] = useState(false);

  const quotedSuppliers = useMemo(() => {
    return quotes.filter(q => q.status === 'quoted' && q.quoteData?.totals);
  }, [quotes]);

  const declinedSuppliers = useMemo(() => {
    return quotes.filter(q => q.status === 'declined');
  }, [quotes]);

  const pendingSuppliers = useMemo(() => {
    return quotes.filter(q => q.status === 'pending' || q.status === 'viewed');
  }, [quotes]);

  const sortedQuotes = useMemo(() => {
    const quoted = [...quotedSuppliers];
    if (sortBy === 'price') {
      quoted.sort((a, b) => (a.quoteData?.totals?.grandTotalIncVat || 0) - (b.quoteData?.totals?.grandTotalIncVat || 0));
    } else if (sortBy === 'supplier') {
      quoted.sort((a, b) => (a.companyName || a.supplierName).localeCompare(b.companyName || b.supplierName));
    } else if (sortBy === 'date') {
      quoted.sort((a, b) => {
        const dateA = a.quoteSubmittedAt ? new Date(a.quoteSubmittedAt).getTime() : 0;
        const dateB = b.quoteSubmittedAt ? new Date(b.quoteSubmittedAt).getTime() : 0;
        return dateB - dateA;
      });
    }
    return quoted;
  }, [quotedSuppliers, sortBy]);

  const lowestPrice = useMemo(() => {
    if (quotedSuppliers.length === 0) return null;
    return Math.min(...quotedSuppliers.map(q => q.quoteData?.totals?.grandTotalIncVat || Infinity));
  }, [quotedSuppliers]);

  const toggleQuoteSelection = (supplierId: number) => {
    setSelectedQuotes(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const formatCurrency = (value: number, currencyCode?: string): string => {
    const currency = currencyByCode(currencyCode || DEFAULT_CURRENCY);
    const symbol = currency?.symbol || currencyCode || 'R';
    return `${symbol} ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const comparisonQuotes = useMemo(() => {
    if (selectedQuotes.length === 0) return sortedQuotes;
    return sortedQuotes.filter(q => selectedQuotes.includes(q.supplierId));
  }, [sortedQuotes, selectedQuotes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quote Comparison</h2>
          {boqNumber && (
            <p className="text-sm text-gray-600 mt-1">
              BOQ: {boqNumber} {projectName && `- ${projectName}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'price' | 'supplier' | 'date')}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="price">Price (Low to High)</option>
              <option value="supplier">Supplier Name</option>
              <option value="date">Submission Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{quotedSuppliers.length}</div>
          <div className="text-sm text-green-600">Quotes Received</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{pendingSuppliers.length}</div>
          <div className="text-sm text-yellow-600">Awaiting Response</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{declinedSuppliers.length}</div>
          <div className="text-sm text-red-600">Declined</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">{quotes.length}</div>
          <div className="text-sm text-blue-600">Total Suppliers</div>
        </div>
      </div>

      {/* Quote Selection for Comparison */}
      {quotedSuppliers.length > 2 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Quotes to Compare</h3>
          <div className="flex flex-wrap gap-2">
            {quotedSuppliers.map(quote => (
              <button
                key={quote.supplierId}
                onClick={() => toggleQuoteSelection(quote.supplierId)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  selectedQuotes.includes(quote.supplierId)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'
                }`}
              >
                {quote.companyName || quote.supplierName}
              </button>
            ))}
            {selectedQuotes.length > 0 && (
              <button
                onClick={() => setSelectedQuotes([])}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {comparisonQuotes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white shadow rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtotal</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contingencies</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ex VAT</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">VAT</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Inc VAT</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lead Time</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Validity</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                {onSelectQuote && (
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comparisonQuotes.map((quote, idx) => {
                const totals = quote.quoteData?.totals;
                const isLowest = totals?.grandTotalIncVat === lowestPrice;
                const isSelected = selectedSupplierId === quote.supplierId;

                return (
                  <tr
                    key={quote.supplierId}
                    className={`${isLowest ? 'bg-green-50' : ''} ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''} hover:bg-gray-50 transition-colors`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {isLowest && (
                          <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Best</span>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{quote.companyName || quote.supplierName}</div>
                          {quote.companyName && (
                            <div className="text-xs text-gray-500">{quote.supplierName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {formatCurrency(totals?.subtotal || 0, quote.currencyCode)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {formatCurrency(totals?.contingencies || 0, quote.currencyCode)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(totals?.grandTotalExVat || 0, quote.currencyCode)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {formatCurrency(totals?.vatAmount || 0, quote.currencyCode)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${isLowest ? 'text-green-700' : 'text-gray-900'}`}>
                        {formatCurrency(totals?.grandTotalIncVat || 0, quote.currencyCode)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">
                      {quote.quoteData?.leadTimeDays ? `${quote.quoteData.leadTimeDays} days` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">
                      {quote.quoteData?.validityDays ? `${quote.quoteData.validityDays} days` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-500">
                      {quote.quoteSubmittedAt ? formatDateTimeZA(quote.quoteSubmittedAt) : '-'}
                    </td>
                    {onSelectQuote && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onSelectQuote(quote.supplierId)}
                          className={`px-3 py-1.5 text-sm rounded transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-yellow-800">No Quotes Received Yet</h3>
          <p className="text-sm text-yellow-600 mt-1">
            {pendingSuppliers.length > 0
              ? `${pendingSuppliers.length} supplier(s) have been invited and are pending response.`
              : 'No suppliers have been invited to quote on this BOQ.'}
          </p>
        </div>
      )}

      {/* Pending Suppliers */}
      {pendingSuppliers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-700">Awaiting Response ({pendingSuppliers.length})</h3>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-3">
              {pendingSuppliers.map(supplier => (
                <div
                  key={supplier.supplierId}
                  className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm"
                >
                  <span className={`w-2 h-2 rounded-full ${supplier.status === 'viewed' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                  <span className="text-gray-700">{supplier.companyName || supplier.supplierName}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_BADGES[supplier.status].bg} ${STATUS_BADGES[supplier.status].text}`}>
                    {STATUS_BADGES[supplier.status].label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Declined Suppliers */}
      {declinedSuppliers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <button
            onClick={() => setShowDeclined(!showDeclined)}
            className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <h3 className="font-semibold text-gray-700">Declined ({declinedSuppliers.length})</h3>
            <svg className={`w-5 h-5 text-gray-500 transition-transform ${showDeclined ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showDeclined && (
            <div className="p-4 space-y-2">
              {declinedSuppliers.map(supplier => (
                <div
                  key={supplier.supplierId}
                  className="flex items-start gap-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-sm"
                >
                  <span className="w-2 h-2 mt-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-700">{supplier.companyName || supplier.supplierName}</span>
                    {supplier.declineReason && (
                      <p className="text-gray-500 mt-0.5 text-xs">{supplier.declineReason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
