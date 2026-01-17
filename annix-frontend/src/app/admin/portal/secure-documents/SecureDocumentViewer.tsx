'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { SecureDocumentWithContent } from '@/app/lib/api/adminApi';
import { formatDateZA } from '@/app/lib/datetime';

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
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
          {document.description && (
            <p className="mt-1 text-sm text-gray-600">{document.description}</p>
          )}
        </div>
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Created by {authorName(document)}</span>
              <span>|</span>
              <span>Created: {formatDateZA(document.createdAt)}</span>
              <span>|</span>
              <span>Updated: {formatDateZA(document.updatedAt)}</span>
            </div>
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
        <div className="p-6" data-color-mode="light">
          <MarkdownPreview
            source={document.content}
            style={{ backgroundColor: 'transparent' }}
          />
        </div>
      </div>
    </div>
  );
}
