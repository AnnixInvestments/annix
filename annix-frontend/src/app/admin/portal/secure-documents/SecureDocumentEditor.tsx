'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { SecureDocumentWithContent } from '@/app/lib/api/adminApi';
import type { ICommand } from '@uiw/react-md-editor';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface InitialData {
  title: string;
  description: string;
  content: string;
}

export type EditorPaneMode = 'edit' | 'live' | 'preview';

export interface EditorState {
  paneMode?: EditorPaneMode;
  fullscreen?: boolean;
}

interface SecureDocumentEditorProps {
  document: SecureDocumentWithContent | null;
  initialData?: InitialData | null;
  paneMode?: EditorPaneMode;
  fullscreen?: boolean;
  onStateChange?: (state: EditorState) => void;
  onSave: (data: { title: string; description: string; content: string }) => Promise<void>;
  onCancel: () => void;
}

export default function SecureDocumentEditor({
  document,
  initialData,
  paneMode = 'live',
  fullscreen = false,
  onStateChange,
  onSave,
  onCancel,
}: SecureDocumentEditorProps) {
  const [title, setTitle] = useState(initialData?.title || document?.title || '');
  const [description, setDescription] = useState(initialData?.description || document?.description || '');
  const [content, setContent] = useState(initialData?.content || document?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [editorHeight, setEditorHeight] = useState(500);
  const [localPaneMode, setLocalPaneMode] = useState<EditorPaneMode>(paneMode);
  const [localFullscreen, setLocalFullscreen] = useState(fullscreen);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalPaneMode(paneMode);
  }, [paneMode]);

  useEffect(() => {
    setLocalFullscreen(fullscreen);
  }, [fullscreen]);

  const handlePaneModeChange = useCallback((mode: EditorPaneMode) => {
    setLocalPaneMode(mode);
    onStateChange?.({ paneMode: mode });
  }, [onStateChange]);

  const handleFullscreenChange = useCallback((isFullscreen: boolean) => {
    setLocalFullscreen(isFullscreen);
    onStateChange?.({ fullscreen: isFullscreen });
  }, [onStateChange]);

  const commandsFilter = useCallback((cmd: ICommand): ICommand => {
    if (cmd.name === 'edit') {
      return { ...cmd, execute: () => handlePaneModeChange('edit') };
    } else if (cmd.name === 'live') {
      return { ...cmd, execute: () => handlePaneModeChange('live') };
    } else if (cmd.name === 'preview') {
      return { ...cmd, execute: () => handlePaneModeChange('preview') };
    } else if (cmd.name === 'fullscreen') {
      return { ...cmd, execute: () => handleFullscreenChange(!localFullscreen) };
    }
    return cmd;
  }, [handlePaneModeChange, handleFullscreenChange, localFullscreen]);

  useEffect(() => {
    const calculateHeight = () => {
      if (editorContainerRef.current) {
        const rect = editorContainerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 48;
        setEditorHeight(Math.max(400, availableHeight));
      }
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim(), content });
    } finally {
      setIsSaving(false);
    }
  };

  const isEdit = document !== null;
  const originalTitle = initialData?.title || document?.title || '';
  const originalDescription = initialData?.description || document?.description || '';
  const originalContent = initialData?.content || document?.content || '';

  const hasChanges = title !== originalTitle ||
    description !== originalDescription ||
    content !== originalContent;

  const handleRevert = () => {
    setTitle(originalTitle);
    setDescription(originalDescription);
    setContent(originalContent);
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        .w-md-editor-toolbar {
          padding: 8px 10px !important;
        }
        .w-md-editor-toolbar button {
          width: 32px !important;
          height: 32px !important;
        }
        .w-md-editor-toolbar svg {
          width: 18px !important;
          height: 18px !important;
        }
        .w-md-editor-toolbar li > button {
          padding: 6px !important;
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Document' : 'Create Document'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isEdit ? 'Update the document content below' : 'Create a new secure document'}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
          {isEdit && hasChanges && (
            <button
              onClick={handleRevert}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-300 rounded-md hover:bg-orange-100"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Revert
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#323288] rounded-md hover:bg-[#4a4da3] disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#323288] focus:ring-[#323288] sm:text-sm border p-2"
            placeholder="Document title"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#323288] focus:ring-[#323288] sm:text-sm border p-2"
            placeholder="Brief description for the document list"
          />
        </div>

        <div ref={editorContainerRef}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content
          </label>
          <div data-color-mode="light">
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || '')}
              height={editorHeight}
              preview={localPaneMode}
              commandsFilter={commandsFilter}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
