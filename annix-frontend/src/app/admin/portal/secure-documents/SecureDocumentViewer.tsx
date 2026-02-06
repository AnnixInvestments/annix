'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';
import { SecureDocumentWithContent, adminApiClient } from '@/app/lib/api/adminApi';
import { formatDateZA } from '@/app/lib/datetime';
import { useTheme } from '@/app/components/ThemeProvider';
import { log } from '@/app/lib/logger';

function authorName(doc: SecureDocumentWithContent): string {
  if (!doc.createdBy) return 'Unknown';
  const { firstName, lastName, username, email } = doc.createdBy;
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;
  if (username) return username;
  if (email) return email;
  return 'Unknown';
}

const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

interface SheetData {
  name: string;
  data: string[][];
}

interface ExcelPreviewProps {
  documentId: string;
}

function ExcelPreview({ documentId }: ExcelPreviewProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndParseExcel = async () => {
      try {
        setLoading(true);
        setError(null);

        const { url } = await adminApiClient.secureDocumentAttachmentUrl(documentId);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to download attachment');
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const parsedSheets: SheetData[] = workbook.SheetNames.map((name) => {
          const worksheet = workbook.Sheets[name];
          const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
          return { name, data: jsonData };
        });

        setSheets(parsedSheets);
        setActiveSheet(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Excel file');
      } finally {
        setLoading(false);
      }
    };

    fetchAndParseExcel();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#323288]"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading Excel file...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">No data found in Excel file</div>
    );
  }

  const currentSheet = sheets[activeSheet];

  return (
    <div className="space-y-4">
      {sheets.length > 1 && (
        <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(index)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                index === activeSheet
                  ? 'border-[#323288] text-[#323288] dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            {currentSheet.data.length > 0 && (
              <tr>
                {currentSheet.data[0].map((cell, cellIndex) => (
                  <th
                    key={cellIndex}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border border-gray-200 dark:border-gray-700"
                  >
                    {cell ?? ''}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {currentSheet.data.slice(1).map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 whitespace-nowrap"
                  >
                    {cell ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        {currentSheet.data.length - 1} rows × {currentSheet.data[0]?.length || 0} columns
      </div>
    </div>
  );
}

interface SecureDocumentViewerProps {
  document: SecureDocumentWithContent;
  onBack: () => void;
  onEdit?: () => void;
  isReadOnly?: boolean;
}

export default function SecureDocumentViewer({
  document,
  onBack,
  onEdit,
  isReadOnly = false,
}: SecureDocumentViewerProps) {
  const { resolvedTheme } = useTheme();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    try {
      setDownloading(true);
      const { url, filename } = await adminApiClient.secureDocumentAttachmentUrl(document.id);

      const response = await fetch(url);
      const blob = await response.blob();

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      log.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  }, [document.id]);

  const isExcelAttachment = document.fileType === 'excel' && document.attachmentPath;
  const hasAttachment = Boolean(document.attachmentPath);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-2"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{document.title}</h1>
          {document.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{document.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasAttachment && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Original
                </>
              )}
            </button>
          )}
          {!isReadOnly && onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#323288] hover:bg-[#4a4da3]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>Created by {authorName(document)}</span>
              <span>|</span>
              <span>Created: {formatDateZA(document.createdAt)}</span>
              <span>|</span>
              <span>Updated: {formatDateZA(document.updatedAt)}</span>
            </div>
            <div className="flex items-center space-x-3">
              {document.fileType && document.fileType !== 'markdown' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {document.fileType.toUpperCase()}
                </span>
              )}
              {isReadOnly ? (
                <div className="flex items-center text-blue-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Local file (read-only)
                </div>
              ) : (
                <div className="flex items-center text-green-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Encrypted
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-6" data-color-mode={resolvedTheme}>
          {isExcelAttachment ? (
            <ExcelPreview documentId={document.id} />
          ) : (
            <MarkdownPreview
              source={document.content}
              style={resolvedTheme === 'dark' ? {
                backgroundColor: 'transparent',
                '--color-canvas-default': 'transparent',
                '--color-canvas-subtle': '#111827',
              } as React.CSSProperties : { backgroundColor: 'transparent' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
