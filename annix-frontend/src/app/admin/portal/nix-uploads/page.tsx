'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApiClient, NixDocument } from '@/app/lib/api/adminApi';
import { formatDateZA } from '@/app/lib/datetime';

interface UploadingFile {
  id: string;
  file: File;
  title: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  documentSlug?: string;
}

interface UploadResult {
  fileName: string;
  success: boolean;
  documentSlug?: string;
  documentPath?: string;
  error?: string;
}

function fileTypeIcon(filename: string): { color: string; label: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const icons: Record<string, { color: string; label: string }> = {
    pdf: { color: 'text-red-500', label: 'PDF' },
    xlsx: { color: 'text-green-600', label: 'XLS' },
    xls: { color: 'text-green-600', label: 'XLS' },
    doc: { color: 'text-blue-600', label: 'DOC' },
    docx: { color: 'text-blue-600', label: 'DOC' },
    txt: { color: 'text-gray-500', label: 'TXT' },
    md: { color: 'text-purple-500', label: 'MD' },
  };
  return icons[ext] || { color: 'text-gray-400', label: ext.toUpperCase() || 'FILE' };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NixUploadsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<NixDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadResultModal, setUploadResultModal] = useState<UploadResult | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminApiClient.listNixDocuments();
      setDocuments(response.documents);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const uploadFile = async (uploadingFile: UploadingFile) => {
    setUploadingFiles(prev =>
      prev.map(f => f.id === uploadingFile.id ? { ...f, status: 'uploading', progress: 10 } : f)
    );

    try {
      setUploadingFiles(prev =>
        prev.map(f => f.id === uploadingFile.id ? { ...f, progress: 50 } : f)
      );

      const result = await adminApiClient.uploadNixDocument(
        uploadingFile.file,
        uploadingFile.title || undefined,
      );

      if (result.success) {
        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadingFile.id ? { ...f, status: 'success', progress: 100, documentSlug: result.documentSlug } : f)
        );
        const documentPath = result.documentSlug
          ? `Secure Documents / Nix / ${result.documentSlug}`
          : null;
        setUploadResultModal({
          fileName: uploadingFile.file.name,
          success: true,
          documentSlug: result.documentSlug,
          documentPath: documentPath || undefined,
        });
        fetchDocuments();
      } else {
        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadingFile.id ? { ...f, status: 'error', error: result.error || 'Upload failed' } : f)
        );
        setUploadResultModal({
          fileName: uploadingFile.file.name,
          success: false,
          error: result.error || 'Upload failed',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadingFiles(prev =>
        prev.map(f => f.id === uploadingFile.id ? { ...f, status: 'error', error: message } : f)
      );
      setUploadResultModal({
        fileName: uploadingFile.file.name,
        success: false,
        error: message,
      });
    }
  };

  const processFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      return ['pdf', 'xlsx', 'xls', 'doc', 'docx', 'txt', 'md', 'csv'].includes(ext);
    });

    if (validFiles.length === 0) {
      setActionMessage({ type: 'error', text: 'No supported files found. Supported formats: PDF, Excel, Word, Text, Markdown, CSV' });
      return;
    }

    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      title: file.name.replace(/\.[^.]+$/, ''),
      status: 'pending' as const,
      progress: 0,
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    for (const uploadingFile of newUploadingFiles) {
      await uploadFile(uploadingFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(Array.from(files));
    }
  }, [processFiles]);

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const viewDocument = (slug: string) => {
    router.push(`/admin/portal/secure-documents?doc=${slug}&mode=view`);
  };

  if (error && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Documents</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchDocuments}
            className="mt-4 px-4 py-2 bg-[#323288] text-white rounded-md hover:bg-[#4a4da3]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nix Document Upload</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Upload documents for Nix to process and save to Secure Documents
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-[#323288] bg-[#323288]/5'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.xlsx,.xls,.doc,.docx,.txt,.md,.csv"
        />
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          Drop files here or click to upload
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          PDF, Excel, Word, Text, and Markdown files supported (up to 100MB)
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#323288] hover:bg-[#4a4da3]"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Select Files
        </button>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Upload Queue</h2>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {uploadingFiles.map(file => {
              const icon = fileTypeIcon(file.file.name);
              return (
                <li key={file.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <span className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold ${icon.color}`}>
                        {icon.label}
                      </span>
                      <div className="ml-4 min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {file.file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center space-x-3">
                      {file.status === 'uploading' && (
                        <div className="w-24">
                          <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-[#323288] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {file.status === 'success' && (
                        <>
                          <span className="text-green-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          {file.documentSlug && (
                            <button
                              onClick={() => viewDocument(file.documentSlug!)}
                              className="text-sm text-[#323288] hover:text-[#4a4da3]"
                            >
                              View
                            </button>
                          )}
                        </>
                      )}
                      {file.status === 'error' && (
                        <span className="text-red-500 text-sm">{file.error}</span>
                      )}
                      <button
                        onClick={() => removeUploadingFile(file.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {actionMessage && (
        <div className={`rounded-lg p-4 ${actionMessage.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center">
            {actionMessage.type === 'success' ? (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className={`ml-3 flex-1 text-sm font-medium ${actionMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {actionMessage.text}
            </p>
            <button
              onClick={() => setActionMessage(null)}
              className={actionMessage.type === 'success' ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Processed Documents</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Stored in Secure Documents / Nix folder
          </span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#323288] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 px-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No documents yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload a document above to get started
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Processed
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {documents.map(doc => (
                <tr
                  key={doc.id}
                  onClick={() => viewDocument(doc.slug)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs block">
                      {doc.description || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDateZA(doc.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        viewDocument(doc.slug);
                      }}
                      className="text-[#323288] hover:text-[#4a4da3]"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {uploadResultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                {uploadResultModal.success ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {uploadResultModal.success ? 'Document Processed Successfully' : 'Upload Failed'}
                </h3>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">File Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{uploadResultModal.fileName}</p>
              </div>
              {uploadResultModal.success && uploadResultModal.documentPath && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Saved Location</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
                      {uploadResultModal.documentPath}
                    </code>
                    <button
                      onClick={() => copyToClipboard(uploadResultModal.documentPath!)}
                      className={`flex-shrink-0 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        copiedPath
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
                      }`}
                      title="Copy path to clipboard"
                    >
                      {copiedPath ? (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
              {!uploadResultModal.success && uploadResultModal.error && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Error</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{uploadResultModal.error}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              {uploadResultModal.success && uploadResultModal.documentSlug && (
                <button
                  onClick={() => {
                    setUploadResultModal(null);
                    viewDocument(uploadResultModal.documentSlug!);
                  }}
                  className="px-4 py-2 text-sm font-medium text-[#323288] hover:text-[#4a4da3] border border-[#323288] rounded-md hover:bg-[#323288]/5"
                >
                  View Document
                </button>
              )}
              <button
                onClick={() => setUploadResultModal(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#323288] rounded-md hover:bg-[#4a4da3]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
