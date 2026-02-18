"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  type ChatMessage,
  useCreateNixSession,
  useNixHistory,
  useSendNixMessage,
  useValidateNixRfq,
  type ValidationIssue,
} from "@/app/lib/query/hooks";

const NIX_SESSION_STORAGE_KEY = "nix-chat-session-id";

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

const DownloadIcon = ({ className }: { className?: string }) => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
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
    <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
  </svg>
);

type PortalContext = "customer" | "supplier" | "admin" | "general";

interface ContextConfig {
  title: string;
  subtitle: string;
  welcomeMessage: string;
  quickActions: Array<{ label: string; prompt: string }>;
}

const CONTEXT_CONFIGS: Record<PortalContext, ContextConfig> = {
  customer: {
    title: "Chat with Nix",
    subtitle: "Your RFQ assistant",
    welcomeMessage:
      "I can help you create RFQs, understand piping specifications, and answer questions about your quotes.",
    quickActions: [
      { label: "Create a new RFQ item", prompt: "Help me add a new item to my RFQ" },
      {
        label: "Explain pipe specifications",
        prompt: "What do the different pipe end options mean?",
      },
      { label: "Check my RFQ status", prompt: "What's the status of my current RFQs?" },
    ],
  },
  supplier: {
    title: "Chat with Nix",
    subtitle: "Your BOQ assistant",
    welcomeMessage:
      "I can help you understand BOQ requirements, calculate pricing, and answer technical questions.",
    quickActions: [
      {
        label: "Explain BOQ item",
        prompt: "Can you explain the specifications for this BOQ item?",
      },
      {
        label: "Calculate weld meters",
        prompt: "How do I calculate weld linear meters for a fabricated pipe?",
      },
      {
        label: "Pricing guidance",
        prompt: "What factors should I consider when pricing fabricated items?",
      },
    ],
  },
  admin: {
    title: "Chat with Nix",
    subtitle: "Admin assistant",
    welcomeMessage: "I can help with RFQ management, customer inquiries, and system operations.",
    quickActions: [
      { label: "RFQ overview", prompt: "Give me an overview of pending RFQs" },
      { label: "Customer support", prompt: "How can I help a customer with their RFQ?" },
      { label: "System status", prompt: "What's the current system status?" },
    ],
  },
  general: {
    title: "Chat with Nix",
    subtitle: "Your AI piping assistant",
    welcomeMessage:
      "Ask me anything about piping specifications, or tell me to create items for your RFQ.",
    quickActions: [
      { label: "Add a bend", prompt: "Add a 200NB bend at 45 degrees with flanges both ends" },
      { label: "Validation issues", prompt: "What validation issues do I have?" },
      {
        label: "Learn about flanges",
        prompt: "What are the different types of flange connections?",
      },
    ],
  },
};

interface PanelGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageContext {
  currentPage: string;
  rfqType?: string;
  portalContext: PortalContext;
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
  portalContext?: PortalContext;
  pageContext?: PageContext;
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 300;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 500;
const EDGE_PADDING = 16;
const BOTTOM_PADDING = 80;
const GEOMETRY_STORAGE_KEY = "nix-chat-panel-geometry";

type ResizeEdge = "n" | "e" | "w" | "s" | "nw" | "ne" | "sw" | "se" | null;

const defaultPosition = (): { x: number; y: number } => {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return {
    x: window.innerWidth - DEFAULT_WIDTH - EDGE_PADDING,
    y: window.innerHeight - DEFAULT_HEIGHT - BOTTOM_PADDING,
  };
};

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

const loadPersistedSessionId = (): number | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(NIX_SESSION_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      return Number.isNaN(parsed) ? null : parsed;
    }
  } catch {
    return null;
  }
  return null;
};

const persistSessionId = (sessionId: number | null): void => {
  if (typeof window === "undefined") return;
  try {
    if (sessionId === null) {
      localStorage.removeItem(NIX_SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(NIX_SESSION_STORAGE_KEY, sessionId.toString());
    }
  } catch {
    // storage unavailable
  }
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
  portalContext = "general",
  pageContext,
}: NixChatPanelProps) {
  const [sessionId, setSessionId] = useState<number | null>(() => {
    return initialSessionId ?? loadPersistedSessionId();
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const contextConfig = CONTEXT_CONFIGS[portalContext];

  const createSessionMutation = useCreateNixSession();
  const sendMessageMutation = useSendNixMessage();
  const validateRfqMutation = useValidateNixRfq();

  const historyQuery = useNixHistory(sessionId);

  useEffect(() => {
    if (historyQuery.data?.messages) {
      setMessages(historyQuery.data.messages);
    }
  }, [historyQuery.data?.messages]);

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
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const initializeSession = () => {
    setInitError(null);
    createSessionMutation.mutate(
      { rfqId, portalContext },
      {
        onSuccess: (data) => {
          setSessionId(data.sessionId);
          persistSessionId(data.sessionId);
          onSessionCreated?.(data.sessionId);
        },
        onError: (error) => {
          console.error("Failed to create chat session:", error);
          setInitError("Could not connect to Nix. Is the backend running?");
        },
      },
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = () => {
    if (!inputValue.trim() || !sessionId || isStreaming) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsStreaming(true);
    setStreamingContent("Thinking...");

    const tempUserMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    sendMessageMutation.mutate(
      {
        sessionId,
        message: userMessage,
        context: {
          currentRfqItems,
          lastValidationIssues: validationIssues,
          pageContext: pageContext ?? { currentPage: "unknown", portalContext },
        },
        portalContext,
      },
      {
        onSuccess: (result) => {
          const assistantMessage: ChatMessage = {
            id: result.messageId,
            role: "assistant",
            content: result.content,
            metadata: result.metadata as ChatMessage["metadata"],
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingContent("");
          setIsStreaming(false);
        },
        onError: (error) => {
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
          setIsStreaming(false);
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (!currentRfqItems || currentRfqItems.length === 0) {
      setValidationIssues([]);
      return;
    }

    validateRfqMutation.mutate(currentRfqItems, {
      onSuccess: (result) => {
        setValidationIssues(result.issues);
      },
      onError: (error) => {
        console.error("Failed to validate RFQ:", error);
      },
    });
  }, [currentRfqItems]);

  const exportChatAsText = useCallback(() => {
    const lines = messages.map((msg) => {
      const role = msg.role === "user" ? "You" : "Nix";
      const timestamp = new Date(msg.createdAt).toLocaleString();
      return `[${timestamp}] ${role}:\n${msg.content}\n`;
    });
    const content = `Nix Chat Export\nExported: ${new Date().toLocaleString()}\n${"=".repeat(50)}\n\n${lines.join("\n")}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nix-chat-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [messages]);

  const exportChatAsJson = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      sessionId,
      portalContext,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
        metadata: msg.metadata,
      })),
    };
    const content = JSON.stringify(exportData, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nix-chat-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [messages, sessionId, portalContext]);

  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = () => setShowExportMenu(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showExportMenu]);

  const requestSummary = useCallback(() => {
    if (!sessionId || isStreaming || messages.length < 2) return;

    setIsStreaming(true);
    setStreamingContent("Generating summary...");

    const summaryPrompt =
      "Please provide a brief summary of our conversation so far, highlighting the key topics discussed and any important decisions or items mentioned.";

    const tempUserMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: summaryPrompt,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    sendMessageMutation.mutate(
      {
        sessionId,
        message: summaryPrompt,
        context: {
          currentRfqItems,
          lastValidationIssues: validationIssues,
          pageContext: pageContext ?? { currentPage: "unknown", portalContext },
        },
        portalContext,
      },
      {
        onSuccess: (result) => {
          const assistantMessage: ChatMessage = {
            id: result.messageId,
            role: "assistant",
            content: result.content,
            metadata: result.metadata as ChatMessage["metadata"],
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingContent("");
          setIsStreaming(false);
        },
        onError: (error) => {
          console.error("Failed to generate summary:", error);
          setStreamingContent("");

          const errorMessage: ChatMessage = {
            id: Date.now() + 1,
            role: "assistant",
            content: "Sorry, I couldn't generate a summary. Please try again.",
            metadata: { intent: "error" },
            createdAt: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, errorMessage]);
          setIsStreaming(false);
        },
      },
    );
  }, [
    sessionId,
    isStreaming,
    messages,
    currentRfqItems,
    validationIssues,
    sendMessageMutation,
    pageContext,
    portalContext,
  ]);

  const issueIcon = (severity: ValidationIssue["severity"]) => {
    if (severity === "error") return <AlertCircleIcon className="h-4 w-4 text-red-500" />;
    if (severity === "warning") return <AlertCircleIcon className="h-4 w-4 text-yellow-500" />;
    return <InfoIcon className="h-4 w-4 text-blue-500" />;
  };

  const isInteracting = isDragging || resizeEdge !== null;

  return (
    <div
      ref={panelRef}
      className={`fixed z-50 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl ${className}`}
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
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-gray-700 rounded-t-xl cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <MessageCircleIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {contextConfig.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">{contextConfig.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length >= 2 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                requestSummary();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isStreaming}
              className="p-1 hover:bg-orange-100 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Summarize conversation"
              title="Get conversation summary"
            >
              <SparklesIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
          {messages.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExportMenu(!showExportMenu);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-1 hover:bg-orange-100 dark:hover:bg-gray-600 rounded transition-colors"
                aria-label="Export chat"
              >
                <DownloadIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
              {showExportMenu && (
                <div
                  className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[140px]"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={exportChatAsText}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Export as TXT
                  </button>
                  <button
                    onClick={exportChatAsJson}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Export as JSON
                  </button>
                </div>
              )}
            </div>
          )}
          {onClose ? (
            <button
              onClick={onClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 hover:bg-orange-100 dark:hover:bg-gray-600 rounded transition-colors"
              aria-label="Close chat"
            >
              <XIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          ) : null}
        </div>
      </div>

      {validationIssues.length > 0 ? (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircleIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              {validationIssues.filter((i) => i.severity === "error").length} errors,{" "}
              {validationIssues.filter((i) => i.severity === "warning").length} warnings
            </span>
          </div>
          <p className="text-xs text-yellow-700 dark:text-yellow-400">Ask Nix about these issues</p>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {initError ? (
          <div className="text-center mt-8">
            <AlertCircleIcon className="h-10 w-10 mx-auto mb-3 text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{initError}</p>
            <button
              onClick={initializeSession}
              className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 underline"
            >
              Retry connection
            </button>
          </div>
        ) : messages.length === 0 && !streamingContent ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <MessageCircleIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm px-4">{contextConfig.welcomeMessage}</p>
            <div className="mt-4 space-y-2">
              {contextConfig.quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(action.prompt)}
                  className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 block mx-auto px-2"
                >
                  Try: "{action.label}"
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message) => {
          const isError = message.metadata?.intent === "error";
          const bubbleClass =
            message.role === "user"
              ? "bg-orange-500 text-white"
              : isError
                ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100";

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
                  <div className="text-sm prose prose-sm prose-gray dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_table]:text-xs [&_table]:border-collapse [&_th]:bg-gray-200 dark:[&_th]:bg-gray-600 [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_td]:border [&_th]:border-gray-300 dark:[&_th]:border-gray-500 [&_td]:border-gray-300 dark:[&_td]:border-gray-500 overflow-x-auto">
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
            <div className="rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <div className="text-sm prose prose-sm prose-gray dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
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

      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nix anything..."
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            rows={2}
            disabled={isStreaming || !sessionId}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || !sessionId}
            className="shrink-0 p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
