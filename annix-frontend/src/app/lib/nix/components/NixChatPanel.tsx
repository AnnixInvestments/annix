"use client";

import { equals } from "es-toolkit/compat";
import { AlertCircle, CheckCircle, Info, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { nixChatApi, ChatMessage, StreamChunk, ValidationIssue } from "../chat-api";

interface NixChatPanelProps {
  sessionId: number | null;
  rfqId?: number;
  currentRfqItems?: any[];
  onClose?: () => void;
  onSessionCreated?: (sessionId: number) => void;
  className?: string;
}

export function NixChatPanel({
  sessionId: initialSessionId,
  rfqId,
  currentRfqItems,
  onClose,
  onSessionCreated,
  className = "",
}: NixChatPanelProps) {
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    try {
      const { sessionId: newSessionId } = await nixChatApi.createSession(rfqId);
      setSessionId(newSessionId);
      onSessionCreated?.(newSessionId);
    } catch (error) {
      console.error("Failed to create chat session:", error);
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

    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const chunks: string[] = [];
      let metadata = {};

      for await (const chunk of nixChatApi.streamMessage(sessionId, userMessage, {
        currentRfqItems,
        lastValidationIssues: validationIssues,
      })) {
        if (chunk.type === "content_delta" && chunk.delta) {
          chunks.push(chunk.delta);
          setStreamingContent(chunks.join(""));
        } else if (chunk.type === "message_stop" && chunk.metadata) {
          metadata = chunk.metadata;
        } else if (chunk.type === "error") {
          console.error("Streaming error:", chunk.error);
          setStreamingContent(`Error: ${chunk.error}`);
        }
      }

      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: chunks.join(""),
        metadata,
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent("");
    } catch (error) {
      console.error("Failed to send message:", error);
      setStreamingContent("");
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
    if (equals(severity, "error")) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (equals(severity, "warning")) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div
      className={`flex flex-col h-full bg-white border-l border-gray-200 ${className}`}
      style={{ width: "400px" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-orange-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-white" />
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
            <X className="h-5 w-5 text-gray-600" />
          </button>
        ) : null}
      </div>

      {validationIssues.length > 0 ? (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              {validationIssues.filter(i => equals(i.severity, "error")).length} errors,{" "}
              {validationIssues.filter(i => equals(i.severity, "warning")).length} warnings
            </span>
          </div>
          <p className="text-xs text-yellow-700">Ask Nix about these issues</p>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !streamingContent ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
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

        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${equals(message.role, "user") ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                equals(message.role, "user")
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.metadata?.processingTimeMs ? (
                <p className="text-xs opacity-70 mt-1">
                  {(message.metadata.processingTimeMs / 1000).toFixed(1)}s
                  {message.metadata.tokensUsed ? ` · ${message.metadata.tokensUsed} tokens` : null}
                </p>
              ) : null}
            </div>
          </div>
        ))}

        {streamingContent ? (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-3 py-2 bg-gray-100 text-gray-900">
              <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
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
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nix anything..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            rows={2}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors self-end"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
