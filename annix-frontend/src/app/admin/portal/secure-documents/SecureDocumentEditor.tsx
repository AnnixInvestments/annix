"use client";

import type { ICommand } from "@uiw/react-md-editor";
import { isArray, isBoolean, isNumber, isString } from "es-toolkit/compat";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/app/components/ThemeProvider";
import { SecureDocumentWithContent } from "@/app/lib/api/adminApi";
import MermaidBlock from "./MermaidBlock";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

function extractText(node: React.ReactNode): string {
  if (isString(node)) return node;
  if (isNumber(node)) return String(node);
  if (node === null || node === undefined || isBoolean(node)) return "";
  if (isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return "";
}

interface InitialData {
  title: string;
  description: string;
  content: string;
  folder?: string;
}

export type EditorPaneMode = "edit" | "live" | "preview";

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
  onSave: (data: {
    title: string;
    description: string;
    content: string;
    folder?: string;
  }) => Promise<boolean>;
  onBack: () => void;
}

export default function SecureDocumentEditor(props: SecureDocumentEditorProps) {
  const {
    document,
    initialData,
    paneMode = "live",
    fullscreen = false,
    onStateChange,
    onSave,
    onBack,
  } = props;
  const rawInitialTitle = initialData?.title;
  const rawDocumentTitle = document?.title;
  const initialTitle = rawInitialTitle || rawDocumentTitle || "";
  const rawInitialDescription = initialData?.description;
  const rawDocumentDescription = document?.description;
  const initialDescription = rawInitialDescription || rawDocumentDescription || "";
  const rawInitialFolder = initialData?.folder;
  const rawDocumentFolder = document?.folder;
  const initialFolder = rawInitialFolder || rawDocumentFolder || "";
  const rawInitialContent = initialData?.content;
  const rawDocumentContent = document?.content;
  const initialContent = rawInitialContent || rawDocumentContent || "";
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [folder, setFolder] = useState(initialFolder);
  const [content, setContent] = useState(initialContent);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [savedDescription, setSavedDescription] = useState(initialDescription);
  const [savedFolder, setSavedFolder] = useState(initialFolder);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [editorHeight, setEditorHeight] = useState(500);
  const [localPaneMode, setLocalPaneMode] = useState<EditorPaneMode>(paneMode);
  const [localFullscreen, setLocalFullscreen] = useState(fullscreen);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setLocalPaneMode(paneMode);
  }, [paneMode]);

  useEffect(() => {
    setLocalFullscreen(fullscreen);
  }, [fullscreen]);

  useEffect(() => {
    if (document) {
      setTitle(
        (() => {
          const rawTitle = document.title;
          return rawTitle || "";
        })(),
      );
      setDescription(
        (() => {
          const rawDescription = document.description;
          return rawDescription || "";
        })(),
      );
      setFolder(
        (() => {
          const rawFolder = document.folder;
          return rawFolder || "";
        })(),
      );
      setContent(
        (() => {
          const rawContent = document.content;
          return rawContent || "";
        })(),
      );
      setSavedTitle(
        (() => {
          const rawTitle = document.title;
          return rawTitle || "";
        })(),
      );
      setSavedDescription(
        (() => {
          const rawDescription = document.description;
          return rawDescription || "";
        })(),
      );
      setSavedFolder(
        (() => {
          const rawFolder = document.folder;
          return rawFolder || "";
        })(),
      );
      setSavedContent(
        (() => {
          const rawContent = document.content;
          return rawContent || "";
        })(),
      );
    }
  }, [document?.id]);

  const handlePaneModeChange = useCallback(
    (mode: EditorPaneMode) => {
      setLocalPaneMode(mode);
      onStateChange?.({ paneMode: mode });
    },
    [onStateChange],
  );

  const handleFullscreenChange = useCallback(
    (isFullscreen: boolean) => {
      setLocalFullscreen(isFullscreen);
      onStateChange?.({ fullscreen: isFullscreen });
    },
    [onStateChange],
  );

  const commandsFilter = useCallback(
    (cmd: ICommand): ICommand => {
      if (cmd.name === "edit") {
        return { ...cmd, execute: () => handlePaneModeChange("edit") };
      } else if (cmd.name === "live") {
        return { ...cmd, execute: () => handlePaneModeChange("live") };
      } else if (cmd.name === "preview") {
        return { ...cmd, execute: () => handlePaneModeChange("preview") };
      } else if (cmd.name === "fullscreen") {
        return { ...cmd, execute: () => handleFullscreenChange(!localFullscreen) };
      }
      return cmd;
    },
    [handlePaneModeChange, handleFullscreenChange, localFullscreen],
  );

  useEffect(() => {
    const calculateHeight = () => {
      if (editorContainerRef.current) {
        const rect = editorContainerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 48;
        setEditorHeight(Math.max(400, availableHeight));
      }
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);
    return () => window.removeEventListener("resize", calculateHeight);
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave({
        title: title.trim(),
        description: description.trim(),
        content,
        folder: folder.trim() || undefined,
      });
      if (success) {
        setSavedTitle(title.trim());
        setSavedDescription(description.trim());
        setSavedFolder(folder.trim());
        setSavedContent(content);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isEdit = document !== null;

  const hasChanges =
    title.trim() !== savedTitle ||
    description.trim() !== savedDescription ||
    folder.trim() !== savedFolder ||
    content !== savedContent;

  const handleRevert = () => {
    setTitle(savedTitle);
    setDescription(savedDescription);
    setFolder(savedFolder);
    setContent(savedContent);
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
        [data-color-mode="dark"] .w-md-editor,
        [data-color-mode="dark"] .w-md-editor *,
        [data-color-mode="dark"] .w-md-editor-text-input,
        [data-color-mode="dark"] .w-md-editor-text-input:focus,
        [data-color-mode="dark"] .w-md-editor-text-pre,
        [data-color-mode="dark"] .w-md-editor-text-pre > code,
        [data-color-mode="dark"] .w-md-editor-area,
        [data-color-mode="dark"] .w-md-editor-preview,
        [data-color-mode="dark"] .wmde-markdown,
        [data-color-mode="dark"] .w-md-editor-content {
          background-color: #1f2937 !important;
        }
        [data-color-mode="dark"] .w-md-editor-text-input,
        [data-color-mode="dark"] .w-md-editor-text-input:focus,
        [data-color-mode="dark"] .w-md-editor-text-pre,
        [data-color-mode="dark"] .w-md-editor-text-pre > code {
          color: #e5e7eb !important;
          -webkit-text-fill-color: #e5e7eb !important;
          caret-color: #e5e7eb !important;
        }
        .w-md-editor-preview .wmde-markdown table {
          display: table;
          width: auto;
          max-width: 100%;
          table-layout: auto;
        }
        .w-md-editor-preview .wmde-markdown table th,
        .w-md-editor-preview .wmde-markdown table td {
          overflow-wrap: anywhere;
        }
        .w-md-editor-preview .wmde-markdown table code {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isEdit ? "Edit Document" : "Create Document"}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {isEdit ? "Update the document content below" : "Create a new secure document"}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Secure Documents
          </button>
          {isEdit && hasChanges && (
            <button
              onClick={handleRevert}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-300 rounded-md hover:bg-orange-100"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-[#323288] focus:ring-[#323288] sm:text-sm border p-2"
            placeholder="Document title"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-[#323288] focus:ring-[#323288] sm:text-sm border p-2"
            placeholder="Brief description for the document list"
          />
        </div>

        <div>
          <label
            htmlFor="folder"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Folder
          </label>
          <input
            type="text"
            id="folder"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-[#323288] focus:ring-[#323288] sm:text-sm border p-2"
            placeholder="e.g. deployment/aws (leave empty for root)"
          />
        </div>

        <div ref={editorContainerRef}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content
          </label>
          <div data-color-mode={resolvedTheme}>
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || "")}
              height={editorHeight}
              preview={localPaneMode}
              commandsFilter={commandsFilter}
              previewOptions={{
                components: {
                  pre: ({
                    children,
                    ...preProps
                  }: React.HTMLAttributes<HTMLPreElement> & { children?: React.ReactNode }) => {
                    const codeChild = React.Children.toArray(children).find(
                      (child): child is React.ReactElement =>
                        React.isValidElement(child) && child.type === "code",
                    );
                    if (codeChild) {
                      const codeClassName = (() => {
                        const rawClassName = (codeChild.props as { className?: string }).className;
                        return rawClassName || "";
                      })();
                      if (/language-mermaid/.test(codeClassName)) {
                        const text = extractText(
                          (codeChild.props as { children?: React.ReactNode }).children,
                        );
                        return <MermaidBlock chart={text} />;
                      }
                    }
                    return <pre {...preProps}>{children}</pre>;
                  },
                },
              }}
              style={
                resolvedTheme === "dark"
                  ? ({
                      "--color-canvas-default": "#1f2937",
                      "--color-canvas-subtle": "#111827",
                      "--color-border-default": "#374151",
                      "--color-border-muted": "#374151",
                    } as React.CSSProperties)
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
