"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, ValidationIssue } from "../chat-api";
import { nixChatApi } from "../chat-api";

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const MessageCircleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface PanelGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NixChatPanelProps {
  sessionId: number | null;
  rfqId?: number;
  currentRfqItems?: any[];
  onClose?: () => void;
  onSessionCreated?: (sessionId: number) => void;
  savedGeometry?: PanelGeometry | null;
  onGeometryChange?: (geometry: PanelGeometry) => void;
  className?: string;
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 300;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 500;
const EDGE_PADDING = 16;
const BOTTOM_PADDING = 80;
const GEOMETRY_STORAGE_KEY = "nix-chat-panel-geometry";

type ResizeEdge = "n" | "e" | "w" | "s" | "nw" | "ne" | "sw" | "se" | null;

const defaultPosition = (): { x: number; y: number } => ({
  x: window.innerWidth - DEFAULT_WIDTH - EDGE_PADDING,
  y: window.innerHeight - DEFAULT_HEIGHT - BOTTOM_PADDING,
});

const loadSavedGeometry = (saved?: PanelGeometry | null): PanelGeometry | null => {
  if (saved) return saved;
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(GEOMETRY_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as PanelGeometry;
  } catch {
    return null;
  }
  return null;
};

export function NixChatPanel({
  sessionId: initialSessionId,
  rfqId,
  currentRfqItems,
  onClose,
  onSessionCreated,
  savedGeometry,
  onGeometryChange,
  className = "",
}: NixChatPanelProps) {
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const geo = loadSavedGeometry(savedGeometry);
    return geo ? { x: geo.x, y: geo.y } : defaultPosition();
  });
  const [size, setSize] = useState(() => {
    const geo = loadSavedGeometry(savedGeometry);
    return geo
      ? { width: geo.width, height: geo.height }
      : { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  });

  const dragOffset = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const [resizeEdge, setResizeEdge] = useState<ResizeEdge>(null);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, panelX: 0, panelY: 0 });

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      setIsDragging(true);
    },
    [position],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = Math.max(
        0,
        Math.min(e.clientX - dragOffset.current.x, window.innerWidth - size.width),
      );
      const y = Math.max(
        0,
        Math.min(e.clientY - dragOffset.current.y, window.innerHeight - size.height),
      );
      setPosition({ x, y });
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, size]);

  const handleResizeStart = useCallback(
    (edge: ResizeEdge) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizeStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        width: size.width,
        height: size.height,
        panelX: position.x,
        panelY: position.y,
      };
      setResizeEdge(edge);
    },
    [size, position],
  );

  useEffect(() => {
    if (!resizeEdge) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { mouseX, mouseY, width, height, panelX, panelY } = resizeStart.current;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;

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

    const handleMouseUp = () => setResizeEdge(null);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeEdge]);

  useEffect(() => {
    if (isDragging || resizeEdge) return;

    const geometry: PanelGeometry = {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
    };
    onGeometryChange?.(geometry);
    try {
      localStorage.setItem(GEOMETRY_STORAGE_KEY, JSON.stringify(geometry));
    } catch {
      // storage full or unavailable
    }
  }, [position.x, position.y, size.width, size.height, isDragging, resizeEdge]);

  useEffect(() => {
    if (!sessionId && !initialSessionId) {
      initializeSession();
    } else if (sessionId) {
      loadHistory();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const initializeSession = async () => {
    setInitError(null);
    try {
      const { sessionId: newSessionId } = await nixChatApi.createSession(rfqId);
      setSessionId(newSessionId);
      onSessionCreated?.(newSessionId);
    } catch (error) {
      console.error("Failed to create chat session:", error);
      setInitError("Could not connect to Nix. Is the backend running?");
    }
  };

  const loadHistory = async () => {
    if (!sessionId) return;

    try {
      const { messages: history } = await nixChatApi.history(sessionId);
      setMessages(history);
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !sessionId || isStreaming) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsStreaming(true);
    setStreamingContent("");

    const tempUserMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      setStreamingContent("Thinking...");

      const result = await nixChatApi.sendMessage(sessionId, userMessage, {
        currentRfqItems,
        lastValidationIssues: validationIssues,
      });

      const assistantMessage: ChatMessage = {
        id: result.messageId,
        role: "assistant",
        content: result.content,
        metadata: result.metadata,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");
    } catch (error) {
      console.error("Failed to send message:", error);
      setStreamingContent("");

      const errorContent =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";

      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: errorContent,
        metadata: { intent: "error" },
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const validateCurrentItems = async () => {
    if (!currentRfqItems || currentRfqItems.length === 0) {
      setValidationIssues([]);
      return;
    }

    try {
      const { issues } = await nixChatApi.validateRfq(currentRfqItems);
      setValidationIssues(issues);
    } catch (error) {
      console.error("Failed to validate RFQ:", error);
    }
  };

  useEffect(() => {
    validateCurrentItems();
  }, [currentRfqItems]);

  const issueIcon = (severity: ValidationIssue["severity"]) => {
    if (severity === "error") return <AlertCircleIcon className="h-4 w-4 text-red-500" />;
    if (severity === "warning") return <AlertCircleIcon className="h-4 w-4 text-yellow-500" />;
    return <InfoIcon className="h-4 w-4 text-blue-500" />;
  };

  const isInteracting = isDragging || resizeEdge !== null;

  return (
    <div
      ref={panelRef}
      className={`fixed z-50 flex flex-col bg-white border border-gray-200 rounded-xl shadow-2xl ${className}`}
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
      />
      <div
        className="absolute -bottom-1 left-3 right-3 h-2 cursor-s-resize z-10"
        onMouseDown={handleResizeStart("s")}
      />
      <div
        className="absolute -left-1 top-3 bottom-3 w-2 cursor-w-resize z-10"
        onMouseDown={handleResizeStart("w")}
      />
      <div
        className="absolute -right-1 top-3 bottom-3 w-2 cursor-e-resize z-10"
        onMouseDown={handleResizeStart("e")}
      />
      {/* Resize corners */}
      <div
        className="absolute -top-1 -left-1 w-3 h-3 cursor-nw-resize z-20"
        onMouseDown={handleResizeStart("nw")}
      />
      <div
        className="absolute -top-1 -right-1 w-3 h-3 cursor-ne-resize z-20"
        onMouseDown={handleResizeStart("ne")}
      />
      <div
        className="absolute -bottom-1 -left-1 w-3 h-3 cursor-sw-resize z-20"
        onMouseDown={handleResizeStart("sw")}
      />
      <div
        className="absolute -bottom-1 -right-1 w-3 h-3 cursor-se-resize z-20"
        onMouseDown={handleResizeStart("se")}
      />

      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-orange-50 rounded-t-xl cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <MessageCircleIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Chat with Nix</h3>
            <p className="text-xs text-gray-600">Your AI piping assistant</p>
          </div>
        </div>
        {onClose ? (
          <button
            onClick={onClose}
            className="p-1 hover:bg-orange-100 rounded transition-colors"
            aria-label="Close chat"
          >
            <XIcon className="h-5 w-5 text-gray-600" />
          </button>
        ) : null}
      </div>

      {validationIssues.length > 0 ? (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircleIcon className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              {validationIssues.filter((i) => i.severity === "error").length} errors,{" "}
              {validationIssues.filter((i) => i.severity === "warning").length} warnings
            </span>
          </div>
          <p className="text-xs text-yellow-700">Ask Nix about these issues</p>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {initError ? (
          <div className="text-center mt-8">
            <AlertCircleIcon className="h-10 w-10 mx-auto mb-3 text-red-400" />
            <p className="text-sm text-red-600 mb-3">{initError}</p>
            <button
              onClick={initializeSession}
              className="text-sm text-orange-600 hover:text-orange-700 underline"
            >
              Retry connection
            </button>
          </div>
        ) : messages.length === 0 && !streamingContent ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageCircleIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Ask me anything about piping specifications,</p>
            <p className="text-sm">or tell me to create items for your RFQ</p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() =>
                  setInputValue("Add a 200NB bend at 45 degrees with flanges both ends")
                }
                className="text-xs text-orange-600 hover:text-orange-700 block mx-auto"
              >
                Try: "Add a 200NB bend at 45 degrees..."
              </button>
              <button
                onClick={() => setInputValue("What validation issues do I have?")}
                className="text-xs text-orange-600 hover:text-orange-700 block mx-auto"
              >
                Try: "What validation issues do I have?"
              </button>
            </div>
          </div>
        ) : null}

        {messages.map((message) => {
          const isError = message.metadata?.intent === "error";
          const bubbleClass =
            message.role === "user"
              ? "bg-orange-500 text-white"
              : isError
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-gray-100 text-gray-900";

          const widthClass = message.role === "user" ? "max-w-[85%]" : "";

          return (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`${widthClass} rounded-lg px-3 py-2 ${bubbleClass}`}>
                {isError ? (
                  <div className="flex items-start gap-2">
                    <AlertCircleIcon className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                ) : message.role === "assistant" ? (
                  <div className="text-sm prose prose-sm prose-gray max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_table]:text-xs [&_table]:border-collapse [&_th]:bg-gray-200 [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_td]:border [&_th]:border-gray-300 [&_td]:border-gray-300 overflow-x-auto">
                    <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                {message.metadata?.processingTimeMs ? (
                  <p className="text-xs opacity-70 mt-1">
                    {(message.metadata.processingTimeMs / 1000).toFixed(1)}s
                    {message.metadata.tokensUsed
                      ? ` · ${message.metadata.tokensUsed} tokens`
                      : null}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}

        {streamingContent ? (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 bg-gray-100 text-gray-900">
              <div className="text-sm prose prose-sm prose-gray max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <Markdown remarkPlugins={[remarkGfm]}>{streamingContent}</Markdown>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nix anything..."
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            rows={2}
            disabled={isStreaming || !sessionId}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || !sessionId}
            className="shrink-0 p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
