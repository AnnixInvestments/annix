'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { browserBaseUrl, getAuthHeaders } from '@/lib/api-config';

function CreateBoqContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [drawingId, setDrawingId] = useState<string>('');
  const [rfqId, setRfqId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rfqIdParam = searchParams.get('rfqId');
    if (rfqIdParam) {
      setRfqId(rfqIdParam);
    }
    const drawingIdParam = searchParams.get('drawingId');
    if (drawingIdParam) {
      setDrawingId(drawingIdParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setCreating(true);
    setError(null);

    try {
      const body: Record<string, any> = { title };
      if (description) body.description = description;
      if (drawingId) body.drawingId = parseInt(drawingId);
      if (rfqId) body.rfqId = parseInt(rfqId);

      const response = await fetch(`${browserBaseUrl()}/boq`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create BOQ');
      }

      const boq = await response.json();
      router.push(`/boq/${boq.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create BOQ');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <span>←</span>
            <span>Back to BOQs</span>
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Create New BOQ
          </h1>
          <p className="text-gray-600 mt-2">Create a new Bill of Quantities</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter BOQ title..."
              className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for this BOQ..."
              rows={3}
              className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Drawing ID (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link to Drawing (Optional)
            </label>
            <input
              type="number"
              value={drawingId}
              onChange={(e) => setDrawingId(e.target.value)}
              placeholder="Enter Drawing ID to link..."
              className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              You can link this BOQ to an existing drawing
            </p>
          </div>

          {/* RFQ ID (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link to RFQ (Optional)
            </label>
            <input
              type="number"
              value={rfqId}
              onChange={(e) => setRfqId(e.target.value)}
              placeholder="Enter RFQ ID to link..."
              className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">You can link this BOQ to an existing RFQ</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title || creating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Creating...
                </span>
              ) : (
                'Create BOQ'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateBoqPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading...</p>
          </div>
        </div>
      }
    >
      <CreateBoqContent />
    </Suspense>
  );
}
