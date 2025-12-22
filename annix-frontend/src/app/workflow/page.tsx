'use client';

import React, { useState, useEffect } from 'react';

interface Workflow {
  id: number;
  entityType: 'DRAWING' | 'BOQ' | 'RFQ';
  entityId: number;
  status: 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  submittedBy: string;
  reviewer?: string;
  submittedAt: string;
  reviewedAt?: string;
  notes?: string;
}

export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Annix Workflow';
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      // TODO: Replace with actual API call
      const mockWorkflows: Workflow[] = [
        {
          id: 1,
          entityType: 'DRAWING',
          entityId: 1,
          status: 'PENDING_REVIEW',
          submittedBy: 'John Doe',
          submittedAt: new Date().toISOString(),
        },
        {
          id: 2,
          entityType: 'BOQ',
          entityId: 1,
          status: 'UNDER_REVIEW',
          submittedBy: 'Jane Smith',
          reviewer: 'Bob Wilson',
          submittedAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
        },
      ];
      setWorkflows(mockWorkflows);
    } catch (err) {
      setError('Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'UNDER_REVIEW':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CHANGES_REQUESTED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflows</h1>
          <p className="text-gray-600">Review and manage approval workflows</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Active Workflows</h2>
          </div>
          
          {workflows.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-400 text-5xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
              <p className="text-gray-600">No workflows are currently active.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-gray-900">
                          {workflow.entityType} #{workflow.entityId}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(workflow.status)}`}>
                          {workflow.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        Submitted by {workflow.submittedBy} on {new Date(workflow.submittedAt).toLocaleDateString()}
                      </div>
                      {workflow.reviewer && (
                        <div className="text-sm text-gray-500">
                          Reviewed by {workflow.reviewer}
                          {workflow.reviewedAt && ` on ${new Date(workflow.reviewedAt).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}