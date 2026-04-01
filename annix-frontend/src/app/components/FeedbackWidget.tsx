"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFeatureGate } from "@/app/hooks/useFeatureGate";
import { useVoiceDictation } from "@/app/hooks/useVoiceDictation";
import { type FeedbackAuthContext, submitFeedbackWithAttachments } from "@/app/lib/api/feedbackApi";

type FeedbackSource = "text" | "voice";
type ResizeEdge = "n" | "e" | "w" | "s" | "nw" | "ne" | "sw" | "se" | null;

const MIN_WIDTH = 320;
const MIN_HEIGHT = 300;
const DEFAULT_WIDTH = 340;
const DEFAULT_HEIGHT = 420;
const GEOMETRY_KEY = "feedback-widget-geometry";

interface PanelGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Attachment {
  file: File;
  preview: string;
  isAutoScreenshot: boolean;
}

interface FeedbackWidgetProps {
  authContext: FeedbackAuthContext;
}

function savedGeometry(): PanelGeometry | null {
  try {
    const raw = localStorage.getItem(GEOMETRY_KEY);
    return raw ? (JSON.parse(raw) as PanelGeometry) : null;
  } catch {
    return null;
  }
}

function defaultPosition(): { x: number; y: number } {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }
  return {
    x: window.innerWidth - DEFAULT_WIDTH - 16,
    y: window.innerHeight - DEFAULT_HEIGHT - 80,
  };
}

export function FeedbackWidget(props: FeedbackWidgetProps) {
  const authContext = props.authContext;
  const pathname = usePathname();
  const { isFeatureEnabled, isLoading: flagsLoading } = useFeatureGate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [feedbackSource, setFeedbackSource] = useState<FeedbackSource>("text");
  const [showSuccess, setShowSuccess] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [position, setPosition] = useState(() => {
    const geo = savedGeometry();
    return geo ? { x: geo.x, y: geo.y } : defaultPosition();
  });
  const [size, setSize] = useState(() => {
    const geo = savedGeometry();
    return geo
      ? { width: geo.width, height: geo.height }
      : { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  });

  const dragOffset = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<ResizeEdge>(null);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, panelX: 0, panelY: 0 });

  const isInteracting = isDragging || resizeEdge !== null;

  const clampPosition = useCallback(
    (clientX: number, clientY: number) => ({
      x: Math.max(0, Math.min(clientX - dragOffset.current.x, window.innerWidth - size.width)),
      y: Math.max(0, Math.min(clientY - dragOffset.current.y, window.innerHeight - size.height)),
    }),
    [size],
  );

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      setIsDragging(true);
    },
    [position],
  );

  const handleTouchDragStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      dragOffset.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      setIsDragging(true);
    },
    [position],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition(clampPosition(e.clientX, e.clientY));
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      setPosition(clampPosition(touch.clientX, touch.clientY));
    };

    const handleEnd = () => setIsDragging(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, clampPosition]);

  const startResize = useCallback(
    (edge: ResizeEdge, clientX: number, clientY: number) => {
      resizeStart.current = {
        mouseX: clientX,
        mouseY: clientY,
        width: size.width,
        height: size.height,
        panelX: position.x,
        panelY: position.y,
      };
      setResizeEdge(edge);
    },
    [size, position],
  );

  const handleResizeStart = useCallback(
    (edge: ResizeEdge) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startResize(edge, e.clientX, e.clientY);
    },
    [startResize],
  );

  const handleTouchResizeStart = useCallback(
    (edge: ResizeEdge) => (e: React.TouchEvent) => {
      e.stopPropagation();
      const touch = e.touches[0];
      if (!touch) return;
      startResize(edge, touch.clientX, touch.clientY);
    },
    [startResize],
  );

  useEffect(() => {
    if (!resizeEdge) return;

    const applyResize = (clientX: number, clientY: number) => {
      const { mouseX, mouseY, width, height, panelX, panelY } = resizeStart.current;
      const dx = clientX - mouseX;
      const dy = clientY - mouseY;

      let newWidth = width;
      let newHeight = height;
      let newX = panelX;
      let newY = panelY;

      if (resizeEdge.includes("w")) {
        newWidth = Math.max(MIN_WIDTH, width - dx);
        newX = panelX + (width - newWidth);
      } else if (resizeEdge.includes("e")) {
        newWidth = Math.max(MIN_WIDTH, width + dx);
      }

      if (resizeEdge.includes("n")) {
        newHeight = Math.max(MIN_HEIGHT, height - dy);
        newY = panelY + (height - newHeight);
      } else if (resizeEdge.includes("s")) {
        newHeight = Math.max(MIN_HEIGHT, height + dy);
      }

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    };

    const handleMouseMove = (e: MouseEvent) => applyResize(e.clientX, e.clientY);

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      applyResize(touch.clientX, touch.clientY);
    };

    const handleEnd = () => setResizeEdge(null);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [resizeEdge]);

  useEffect(() => {
    if (isInteracting || !isExpanded) return;

    const geometry: PanelGeometry = {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
    };
    try {
      localStorage.setItem(GEOMETRY_KEY, JSON.stringify(geometry));
    } catch {
      // storage full or unavailable
    }
  }, [position.x, position.y, size.width, size.height, isInteracting, isExpanded]);

  const handleTranscriptChange = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal) {
      setContent(transcript);
    }
  }, []);

  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceDictation({
    language: "en-ZA",
    onTranscript: handleTranscriptChange,
  });

  useEffect(() => {
    if (transcript) {
      setContent(transcript);
      setFeedbackSource("voice");
    }
  }, [transcript]);

  useEffect(() => {
    return () => {
      attachments.forEach((att) => URL.revokeObjectURL(att.preview));
    };
  }, []);

  const handleSubmit = async () => {
    if (!content.trim() || content.length < 10) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const userFiles = attachments.map((a) => a.file);

      await submitFeedbackWithAttachments(
        {
          content: content.trim(),
          source: feedbackSource,
          pageUrl: pathname,
          appContext: authContext,
        },
        userFiles,
        authContext,
      );

      attachments.forEach((att) => URL.revokeObjectURL(att.preview));
      setAttachments([]);
      setContent("");
      resetTranscript();
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsExpanded(false);
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit feedback";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setFeedbackSource("voice");
      startListening();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setFeedbackSource("text");
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) {
      return;
    }

    const ALLOWED_TYPES = [
      "image/",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const newAttachments = Array.from(selectedFiles)
      .filter((f) => ALLOWED_TYPES.some((t) => f.type.startsWith(t)))
      .slice(0, 5 - attachments.length)
      .map((file) => ({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
        isAutoScreenshot: false,
      }));

    setAttachments((prev) => [...prev, ...newAttachments]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleClose = () => {
    setIsExpanded(false);
    setContent("");
    attachments.forEach((att) => URL.revokeObjectURL(att.preview));
    setAttachments([]);
    resetTranscript();
    setSubmitError(null);
    if (isListening) {
      stopListening();
    }
  };

  const displayContent = isListening ? content + interimTranscript : content;

  if (flagsLoading || !isFeatureEnabled("FEEDBACK_WIDGET")) {
    return null;
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-20 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Give Feedback"
        data-feedback-widget
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      data-feedback-widget
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        userSelect: isInteracting ? "none" : undefined,
      }}
    >
      {/* Resize edges */}
      <div
        className="absolute -top-1 left-3 right-3 h-2 cursor-n-resize z-10"
        onMouseDown={handleResizeStart("n")}
        onTouchStart={handleTouchResizeStart("n")}
      />
      <div
        className="absolute -bottom-1 left-3 right-3 h-2 cursor-s-resize z-10"
        onMouseDown={handleResizeStart("s")}
        onTouchStart={handleTouchResizeStart("s")}
      />
      <div
        className="absolute -left-1 top-3 bottom-3 w-2 cursor-w-resize z-10"
        onMouseDown={handleResizeStart("w")}
        onTouchStart={handleTouchResizeStart("w")}
      />
      <div
        className="absolute -right-1 top-3 bottom-3 w-2 cursor-e-resize z-10"
        onMouseDown={handleResizeStart("e")}
        onTouchStart={handleTouchResizeStart("e")}
      />
      {/* Resize corners */}
      <div
        className="absolute -top-1 -left-1 w-3 h-3 cursor-nw-resize z-20"
        onMouseDown={handleResizeStart("nw")}
        onTouchStart={handleTouchResizeStart("nw")}
      />
      <div
        className="absolute -top-1 -right-1 w-3 h-3 cursor-ne-resize z-20"
        onMouseDown={handleResizeStart("ne")}
        onTouchStart={handleTouchResizeStart("ne")}
      />
      <div
        className="absolute -bottom-1 -left-1 w-3 h-3 cursor-sw-resize z-20"
        onMouseDown={handleResizeStart("sw")}
        onTouchStart={handleTouchResizeStart("sw")}
      />
      <div
        className="absolute -bottom-1 -right-1 w-3 h-3 cursor-se-resize z-20"
        onMouseDown={handleResizeStart("se")}
        onTouchStart={handleTouchResizeStart("se")}
      />

      {/* Header — draggable */}
      <div
        className="px-4 py-3 bg-blue-600 flex items-center justify-between cursor-grab active:cursor-grabbing shrink-0"
        onMouseDown={handleDragStart}
        onTouchStart={handleTouchDragStart}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="font-medium text-white">Send Feedback</span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="text-white/80 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 overflow-y-auto">
        {showSuccess ? (
          <div className="text-center py-4">
            <svg
              className="w-12 h-12 text-green-500 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-green-700 font-medium">Thank you for your feedback!</p>
            <p className="text-sm text-gray-500 mt-1">
              A screenshot of this page will be captured automatically.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Help us improve! Share your thoughts, report issues, or suggest features.
            </p>

            <div className="relative">
              <textarea
                value={displayContent}
                onChange={handleTextChange}
                placeholder="Type your feedback here..."
                className={`w-full h-24 p-3 border rounded-lg resize-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isListening ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
                disabled={isListening}
              />
              {isListening && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-xs text-red-600">Listening...</span>
                </div>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {attachments.map((att, idx) => (
                  <div key={att.preview || att.file.name} className="relative shrink-0 w-14 h-14">
                    {att.file.type.startsWith("image/") ? (
                      <img
                        src={att.preview}
                        alt={`Attachment ${idx + 1}`}
                        className="w-14 h-14 object-cover rounded border border-gray-200"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded border border-gray-200 bg-gray-50 flex flex-col items-center justify-center"
                        title={att.file.name}
                      >
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-[8px] text-gray-500 mt-0.5 truncate max-w-[3rem]">
                          {att.file.name.split(".").pop()?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-gray-400 italic">
                A screenshot of the page is captured automatically
              </span>
            </div>

            {voiceError && <p className="text-xs text-red-600 mt-1">{voiceError}</p>}

            {submitError && (
              <div className="flex items-center justify-between mt-1 p-2 bg-red-50 rounded border border-red-200">
                <p className="text-xs text-red-600 font-medium">{submitError}</p>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="text-xs text-red-400 hover:text-red-600 underline ml-2 shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1.5">
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={handleVoiceToggle}
                    className={`p-2 rounded-full transition-colors ${
                      isListening
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={isListening ? "Stop recording" : "Start voice dictation"}
                  >
                    {isListening ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h12v12H6z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= 5}
                  className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Attach file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <span className="text-xs text-gray-400">
                  {content.length}/5000
                  {content.length < 10 && content.length > 0 && (
                    <span className="text-yellow-600 ml-1">(min 10)</span>
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!content.trim() || content.length < 10 || isSubmitting || isListening}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    Send
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
