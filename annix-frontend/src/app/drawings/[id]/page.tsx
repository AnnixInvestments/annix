'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { browserBaseUrl, getAuthHeaders } from '@/lib/api-config';

interface DrawingVersion {
  id: number;
  versionNumber: number;
  filePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  changeNotes?: string;
  uploadedBy: {
    id: number;
    username: string;
  };
  createdAt: string;
}

interface DrawingComment {
  id: number;
  commentText: string;
  commentType: string;
  isResolved: boolean;
  user: {
    id: number;
    username: string;
  };
  createdAt: string;
}

interface Drawing {
  id: number;
  drawingNumber: string;
  title: string;
  description?: string;
  fileType: string;
  filePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  currentVersion: number;
  status: string;
  uploadedBy: {
    id: number;
    username: string;
  };
  rfq?: {
    id: number;
    rfqNumber: string;
  };
  versions: DrawingVersion[];
  createdAt: string;
  updatedAt: string;
}

interface AnalysisResult {
  success: boolean;
  drawingTitle?: string;
  drawingNumber?: string;
  projectName?: string;
  components: {
    itemNumber?: string;
    description: string;
    materialType?: string;
    dimensions?: {
      diameter?: string;
      length?: string;
      thickness?: string;
      size?: string;
    };
    quantity?: number;
    unit?: string;
    confidence: 'high' | 'medium' | 'low';
  }[];
  errors: string[];
  warnings: string[];
  metadata: {
    pageCount: number;
    extractionMethod: string;
    analysisTimestamp: string;
  };
}

export default function DrawingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [comments, setComments] = useState<DrawingComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (id) {
      fetchDrawing();
      fetchComments();
    }
  }, [id]);

  const fetchDrawing = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${browserBaseUrl()}/drawings/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch drawing');
      }

      const data = await response.json();
      setDrawing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`${browserBaseUrl()}/drawings/${id}/comments`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const handleDownload = async (version?: number) => {
    try {
      const url = version
        ? `${browserBaseUrl()}/drawings/${id}/download?version=${version}`
        : `${browserBaseUrl()}/drawings/${id}/download`;

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
        drawing?.originalFilename ||
        'download';

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert('Download failed');
    }
  };

  const handleSubmitForReview = async () => {
    try {
      const response = await fetch(`${browserBaseUrl()}/workflow/drawings/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit for review');
      }

      await fetchDrawing();
      alert('Drawing submitted for review');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`${browserBaseUrl()}/drawings/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ commentText: newComment }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setNewComment('');
      await fetchComments();
    } catch (err) {
      alert('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUploadNewVersion = async (file: File, changeNotes: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (changeNotes) {
        formData.append('changeNotes', changeNotes);
      }

      const response = await fetch(`${browserBaseUrl()}/drawings/${id}/version`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Upload failed');
      }

      setShowVersionModal(false);
      await fetchDrawing();
      alert('New version uploaded successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyzeDrawing = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    setShowAnalysisModal(true);

    try {
      const response = await fetch(`${browserBaseUrl()}/drawings/${id}/analyze`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisResult({
        success: false,
        components: [],
        errors: [err instanceof Error ? err.message : 'Analysis failed'],
        warnings: [],
        metadata: {
          pageCount: 0,
          extractionMethod: 'none',
          analysisTimestamp: new Date().toISOString(),
        },
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'changes_requested':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Drawing...</p>
        </div>
      </div>
    );
  }

  if (error || !drawing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Drawing not found'}</p>
          <button
            onClick={() => router.push('/drawings')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Drawings
          </button>
        </div>
      </div>
    );
  }

  const canSubmit = drawing.status === 'draft' || drawing.status === 'changes_requested';
  const canUploadVersion = drawing.status !== 'approved';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/drawings')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <span>←</span>
            <span>Back to Drawings</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{drawing.drawingNumber}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                    drawing.status
                  )}`}
                >
                  {drawing.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  v{drawing.currentVersion}
                </span>
              </div>
              <p className="text-xl text-gray-700">{drawing.title}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleDownload()}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Download
              </button>
              {canUploadVersion && (
                <button
                  onClick={() => setShowVersionModal(true)}
                  className="px-4 py-2 bg-white border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors"
                >
                  Upload New Version
                </button>
              )}
              {canSubmit && (
                <button
                  onClick={handleSubmitForReview}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium shadow-lg transition-all"
                >
                  Submit for Review
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details Card */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Details</h2>

              {drawing.description && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700">{drawing.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">File Type</p>
                  <p className="font-medium text-gray-900">{drawing.fileType.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">File Size</p>
                  <p className="font-medium text-gray-900">
                    {formatFileSize(drawing.fileSizeBytes)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Uploaded By</p>
                  <p className="font-medium text-gray-900">{drawing.uploadedBy.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">{formatDate(drawing.createdAt)}</p>
                </div>
                {drawing.rfq && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Linked RFQ</p>
                    <button
                      onClick={() => router.push(`/rfqs/${drawing.rfq!.id}`)}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {drawing.rfq.rfqNumber}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Version History */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Version History</h2>

              <div className="space-y-4">
                {drawing.versions
                  .sort((a, b) => b.versionNumber - a.versionNumber)
                  .map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                          v{version.versionNumber}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{version.originalFilename}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(version.createdAt)} by {version.uploadedBy.username}
                          </p>
                          {version.changeNotes && (
                            <p className="text-sm text-gray-600 mt-1">{version.changeNotes}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(version.versionNumber)}
                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
                      >
                        Download
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Comments */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Comments</h2>

              <form onSubmit={handleAddComment} className="mb-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">{comment.user.username}</span>
                        <span className="text-sm text-gray-500">
                          {formatDate(comment.createdAt)}
                        </span>
                        {comment.isResolved && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700">{comment.commentText}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => handleDownload()}
                  className="w-full px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <span>📥</span> Download Current Version
                </button>
                {drawing.mimeType === 'application/pdf' && (
                  <button
                    onClick={handleAnalyzeDrawing}
                    disabled={analyzing}
                    className="w-full px-4 py-3 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {analyzing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></span>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <span>🔍</span> Analyze Drawing
                      </>
                    )}
                  </button>
                )}
                {canUploadVersion && (
                  <button
                    onClick={() => setShowVersionModal(true)}
                    className="w-full px-4 py-3 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <span>📤</span> Upload New Version
                  </button>
                )}
                {canSubmit && (
                  <button
                    onClick={handleSubmitForReview}
                    className="w-full px-4 py-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <span>✓</span> Submit for Review
                  </button>
                )}
              </div>
            </div>

            {/* Status Info */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Status</h2>
              <div
                className={`p-4 rounded-lg ${getStatusColor(drawing.status)} text-center font-semibold`}
              >
                {drawing.status.replace('_', ' ').toUpperCase()}
              </div>
              <p className="text-sm text-gray-500 text-center mt-2">
                Last updated: {formatDate(drawing.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Upload New Version Modal */}
        {showVersionModal && (
          <UploadVersionModal
            onClose={() => setShowVersionModal(false)}
            onUpload={handleUploadNewVersion}
            uploading={uploading}
          />
        )}

        {/* Analysis Modal */}
        {showAnalysisModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Drawing Analysis</h2>
                  <button
                    onClick={() => setShowAnalysisModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {analyzing ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Analyzing PDF drawing...</p>
                    <p className="text-sm text-gray-500 mt-2">Extracting components and dimensions</p>
                  </div>
                ) : analysisResult ? (
                  <div className="space-y-6">
                    {/* Errors */}
                    {analysisResult.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 className="font-semibold text-red-800 mb-2">Errors</h3>
                        <ul className="text-sm text-red-700 space-y-1">
                          {analysisResult.errors.map((err, i) => (
                            <li key={i}>• {err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Warnings */}
                    {analysisResult.warnings.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-800 mb-2">Notices</h3>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {analysisResult.warnings.map((warn, i) => (
                            <li key={i}>• {warn}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Document Info</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Pages:</span>{' '}
                          <span className="text-gray-900">{analysisResult.metadata.pageCount}</span>
                        </div>
                        {analysisResult.drawingNumber && (
                          <div>
                            <span className="text-gray-500">Drawing #:</span>{' '}
                            <span className="text-gray-900">{analysisResult.drawingNumber}</span>
                          </div>
                        )}
                        {analysisResult.projectName && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Project:</span>{' '}
                            <span className="text-gray-900">{analysisResult.projectName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Components */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Extracted Components ({analysisResult.components.length})
                      </h3>
                      {analysisResult.components.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">No components could be extracted from this drawing.</p>
                          <p className="text-sm text-gray-400 mt-2">
                            This may be a scanned document or the format is not recognized.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {analysisResult.components.map((comp, index) => (
                            <div
                              key={index}
                              className={`p-4 rounded-lg border ${
                                comp.confidence === 'high'
                                  ? 'bg-green-50 border-green-200'
                                  : comp.confidence === 'medium'
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {comp.itemNumber && (
                                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                                        #{comp.itemNumber}
                                      </span>
                                    )}
                                    <span
                                      className={`px-2 py-0.5 text-xs rounded ${
                                        comp.confidence === 'high'
                                          ? 'bg-green-200 text-green-800'
                                          : comp.confidence === 'medium'
                                          ? 'bg-blue-200 text-blue-800'
                                          : 'bg-gray-200 text-gray-600'
                                      }`}
                                    >
                                      {comp.confidence} confidence
                                    </span>
                                  </div>
                                  <p className="font-medium text-gray-900">{comp.description}</p>
                                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                                    {comp.quantity && (
                                      <span>Qty: {comp.quantity} {comp.unit}</span>
                                    )}
                                    {comp.materialType && <span>Material: {comp.materialType}</span>}
                                    {comp.dimensions?.diameter && (
                                      <span>Dia: {comp.dimensions.diameter}</span>
                                    )}
                                    {comp.dimensions?.length && (
                                      <span>Length: {comp.dimensions.length}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                {analysisResult && analysisResult.components.length > 0 && (
                  <button
                    onClick={() => {
                      router.push(`/boq/create?drawingId=${id}`);
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium"
                  >
                    Create BOQ from Components
                  </button>
                )}
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UploadVersionModal({
  onClose,
  onUpload,
  uploading,
}: {
  onClose: () => void;
  onUpload: (file: File, changeNotes: string) => void;
  uploading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [changeNotes, setChangeNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onUpload(file, changeNotes);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Upload New Version</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Change Notes</label>
            <textarea
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="Describe what changed in this version..."
              rows={3}
              className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
