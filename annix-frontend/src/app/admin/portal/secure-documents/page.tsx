'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { adminApiClient, SecureDocument, SecureDocumentWithContent } from '@/app/lib/api/adminApi';
import { useToast } from '@/app/components/Toast';
import { formatDateZA } from '@/app/lib/datetime';
import SecureDocumentEditor from './SecureDocumentEditor';
import SecureDocumentViewer from './SecureDocumentViewer';

type ViewMode = 'list' | 'view' | 'edit' | 'create';

interface ImportedFile {
  title: string;
  description: string;
  content: string;
}

interface FileError {
  filename: string;
  message: string;
}

function authorDisplay(doc: SecureDocument): string {
  if (!doc.createdBy) return '-';
  const { firstName, lastName, username, email } = doc.createdBy;
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;
  if (username) return username;
  if (email) return email;
  return '-';
}

function extractDescription(content: string): string {
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('---')) continue;
    if (trimmed.startsWith('```')) continue;
    if (trimmed.startsWith('>')) {
      return trimmed.replace(/^>\s*\*?\*?/, '').replace(/\*?\*?\s*$/, '').slice(0, 150);
    }
    if (trimmed.length > 10) {
      return trimmed.slice(0, 150);
    }
  }

  return '';
}

export default function SecureDocumentsPage() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<SecureDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDocument, setSelectedDocument] = useState<SecureDocumentWithContent | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importedFile, setImportedFile] = useState<ImportedFile | null>(null);
  const [fileError, setFileError] = useState<FileError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminApiClient.listSecureDocuments();
      setDocuments(response);
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

  const handleViewDocument = async (id: string) => {
    try {
      setIsLoadingDocument(true);
      const doc = await adminApiClient.getSecureDocument(id);
      setSelectedDocument(doc);
      setViewMode('view');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load document';
      showToast(message, 'error');
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const handleEditDocument = async (id: string) => {
    try {
      setIsLoadingDocument(true);
      const doc = await adminApiClient.getSecureDocument(id);
      setSelectedDocument(doc);
      setViewMode('edit');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load document';
      showToast(message, 'error');
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedDocument(null);
    setViewMode('create');
  };

  const handleSave = async (data: { title: string; description: string; content: string }) => {
    try {
      if (viewMode === 'create') {
        await adminApiClient.createSecureDocument(data);
        showToast('Document created successfully', 'success');
      } else if (selectedDocument) {
        await adminApiClient.updateSecureDocument(selectedDocument.id, data);
        showToast('Document updated successfully', 'success');
      }
      setViewMode('list');
      setSelectedDocument(null);
      fetchDocuments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save document';
      showToast(message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await adminApiClient.deleteSecureDocument(id);
      showToast('Document deleted successfully', 'success');
      setShowDeleteConfirm(null);
      fetchDocuments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete document';
      showToast(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedDocument(null);
    setImportedFile(null);
    setFileError(null);
  };

  const processFile = useCallback((file: File) => {
    setFileError(null);
    const lowerName = file.name.toLowerCase();
    const isTextFile = lowerName.endsWith('.md') || lowerName.endsWith('.markdown') || lowerName.endsWith('.txt');

    if (!isTextFile) {
      const extension = file.name.split('.').pop()?.toUpperCase() || 'Unknown';
      setFileError({
        filename: file.name,
        message: `${extension} files are not yet supported. Currently only Markdown (.md) and Text (.txt) files can be imported, but I'm sure Andy will ask for all manner of things to be dropped here in the future. We just need to conserve poor old Claude's credits for the moment. 😭`
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const title = file.name.replace(/\.(md|markdown|txt)$/i, '');
      const description = extractDescription(content);
      setImportedFile({ title, description, content });
      setViewMode('create');
    };
    reader.onerror = () => {
      setFileError({
        filename: file.name,
        message: 'Failed to read file. Please try again.'
      });
    };
    reader.readAsText(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
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
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  if (viewMode === 'view' && selectedDocument) {
    return (
      <SecureDocumentViewer
        document={selectedDocument}
        onBack={handleBack}
        onEdit={() => setViewMode('edit')}
      />
    );
  }

  if (viewMode === 'edit' || viewMode === 'create') {
    const initialData = viewMode === 'create' && importedFile
      ? { title: importedFile.title, description: importedFile.description, content: importedFile.content }
      : null;
    return (
      <SecureDocumentEditor
        document={viewMode === 'edit' ? selectedDocument : null}
        initialData={initialData}
        onSave={handleSave}
        onCancel={handleBack}
      />
    );
  }

  if (error) {
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
      <div className="relative">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Secure Documents</h1>
          <p className="mt-1 text-sm text-gray-600">
            Encrypted markdown documents for sensitive information
          </p>
        </div>
        <div className="absolute right-0 top-0 flex space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import File
          </button>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#323288] hover:bg-[#4a4da3]"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Document
          </button>
        </div>
      </div>

      <div
        className={`relative bg-white shadow rounded-lg overflow-hidden transition-colors ${isDragging ? 'ring-2 ring-[#323288] ring-offset-2' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-[#323288]/10 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-white rounded-lg shadow-lg px-6 py-4 text-center">
              <svg className="mx-auto h-12 w-12 text-[#323288]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm font-medium text-[#323288]">Drop file to import</p>
            </div>
          </div>
        )}
        {isLoading || isLoadingDocument ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#323288] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div
            className={`text-center py-12 px-6 transition-colors ${isDragging ? 'bg-[#323288]/5 border-2 border-dashed border-[#323288]' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first secure document or drag and drop a markdown file
            </p>
            <div className="mt-4 flex justify-center space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import File
              </button>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#323288] hover:bg-[#4a4da3]"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Document
              </button>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => handleViewDocument(doc.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">{doc.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 truncate max-w-xs block">
                      {doc.description || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {authorDisplay(doc)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(doc.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="relative group">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDocument(doc.id);
                          }}
                          className="p-1.5 text-[#323288] hover:text-[#252560] hover:bg-[#323288]/10 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs !text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                          Edit document
                        </span>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(doc.id);
                          }}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs !text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                          Delete document
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {fileError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-amber-800">
                Unable to import: {fileError.filename}
              </h4>
              <p className="mt-1 text-sm text-amber-700">{fileError.message}</p>
            </div>
            <button
              onClick={() => setFileError(null)}
              className="text-amber-500 hover:text-amber-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging ? 'border-[#323288] bg-[#323288]/5' : 'border-gray-300 hover:border-gray-400'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium">Drop files here</span> to import markdown documents
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Supports .md, .markdown, and .txt files
        </p>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowDeleteConfirm(null)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Document</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this document? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
