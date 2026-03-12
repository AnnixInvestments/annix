"use client";

import { Bot, ExternalLink, Loader2, MessageSquare, Send, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { aiChat } from "@/app/comply-sa/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
  relatedRequirements: Array<{ id: string; name: string }>;
};

const SUGGESTED_QUESTIONS = [
  "What is POPIA?",
  "Am I VAT registered correctly?",
  "How do I file CIPC annual returns?",
  "What is my B-BBEE level?",
  "What are OHS requirements?",
];

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? "bg-teal-500/20" : "bg-slate-700"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-teal-400" />
        ) : (
          <Bot className="h-4 w-4 text-slate-300" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? "bg-teal-500 text-white" : "bg-slate-700 text-slate-200"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.relatedRequirements.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-600/50">
            <p className="text-xs font-medium text-slate-400 mb-2">Related Requirements:</p>
            <div className="flex flex-wrap gap-2">
              {message.relatedRequirements.map((req) => (
                <Link
                  key={req.id}
                  href={`/dashboard#req-${req.id}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-colors"
                >
                  {req.name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-700">
        <Bot className="h-4 w-4 text-slate-300" />
      </div>
      <div className="bg-slate-700 rounded-2xl px-4 py-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
          <div
            className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: "0.15s" }}
          />
          <div
            className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(question?: string) {
    const text = question ?? input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      relatedRequirements: [],
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await aiChat(text);
      const assistantMessage: Message = {
        role: "assistant",
        content: response.answer,
        relatedRequirements: response.relatedRequirements,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        role: "assistant",
        content:
          err instanceof Error ? err.message : "Sorry, something went wrong. Please try again.",
        relatedRequirements: [],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-teal-400" />
          AI Compliance Assistant
        </h1>
        <p className="text-slate-400 mt-1">
          Ask questions about South African compliance requirements
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-16 w-16 text-slate-600 mb-4" />
            <h2 className="text-lg font-semibold text-slate-300">How can I help?</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              Ask me anything about South African business compliance, tax regulations, or legal
              requirements.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {loading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-full text-sm text-slate-300 hover:text-white hover:border-teal-500/50 hover:bg-slate-700 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-slate-700 pt-4">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a compliance question..."
            disabled={loading}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:hover:bg-teal-500 text-white rounded-xl transition-colors"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
