"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActionItem,
  MeetingAnalysis,
  Sentiment,
  Transcript,
  TranscriptSegment,
} from "@/app/lib/api/annixRepApi";
import { annixRepApi } from "@/app/lib/api/annixRepApi";
import {
  useMeeting,
  useMeetingRecording,
  useMeetingTranscript,
  useRetranscribeRecording,
  useTranscribeRecording,
  useUpdateTranscript,
} from "@/app/lib/query/hooks";

const speakerColors: Record<string, string> = {
  "Speaker 1": "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  "Speaker 2": "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  "Speaker 3": "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
  "Speaker 4": "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700",
  "Speaker 5": "bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700",
};

const speakerTextColors: Record<string, string> = {
  "Speaker 1": "text-blue-700 dark:text-blue-300",
  "Speaker 2": "text-green-700 dark:text-green-300",
  "Speaker 3": "text-purple-700 dark:text-purple-300",
  "Speaker 4": "text-orange-700 dark:text-orange-300",
  "Speaker 5": "text-pink-700 dark:text-pink-300",
};

function speakerColor(label: string): string {
  return (
    speakerColors[label] ?? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
  );
}

function speakerTextColor(label: string): string {
  return speakerTextColors[label] ?? "text-gray-700 dark:text-gray-300";
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function sentimentBadge(sentiment: Sentiment | null, score: number | null) {
  if (!sentiment) return null;

  const colors: Record<Sentiment, string> = {
    positive: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    neutral: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
    negative: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  };

  const icons: Record<Sentiment, string> = {
    positive:
      "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    neutral: "M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    negative: "M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${colors[sentiment]}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[sentiment]} />
      </svg>
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
      {score !== null && ` (${score > 0 ? "+" : ""}${score})`}
    </span>
  );
}

function AnalysisSection({ analysis }: { analysis: MeetingAnalysis }) {
  return (
    <div className="space-y-6">
      {analysis.topics.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            Topics Discussed
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.topics.map((topic, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-md"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.questions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
            Questions Asked ({analysis.questions.length})
          </h4>
          <ul className="space-y-1">
            {analysis.questions.slice(0, 10).map((question, i) => (
              <li
                key={i}
                className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
              >
                <span className="text-blue-500 mt-0.5">?</span>
                {question}
              </li>
            ))}
            {analysis.questions.length > 10 && (
              <li className="text-sm text-gray-500 italic">
                +{analysis.questions.length - 10} more questions
              </li>
            )}
          </ul>
        </div>
      )}

      {analysis.objections.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            Concerns & Objections ({analysis.objections.length})
          </h4>
          <ul className="space-y-1">
            {analysis.objections.slice(0, 5).map((objection, i) => (
              <li
                key={i}
                className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
              >
                <span className="text-amber-500 mt-0.5">!</span>
                {objection}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.actionItems.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Action Items ({analysis.actionItems.length})
          </h4>
          <ul className="space-y-2">
            {analysis.actionItems.map((item, i) => (
              <li key={i} className="text-sm bg-gray-50 dark:bg-slate-700/50 p-2 rounded-md">
                <div className="text-gray-700 dark:text-gray-300">{item.task}</div>
                {item.assignee && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Assigned to: {item.assignee}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.keyPoints.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
            Key Points
          </h4>
          <ul className="space-y-1">
            {analysis.keyPoints.slice(0, 5).map((point, i) => (
              <li
                key={i}
                className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
              >
                <span className="text-yellow-500 mt-0.5">*</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface EditingState {
  index: number;
  field: "speaker" | "text";
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function TranscriptSegmentView({
  segment,
  index,
  isPlaying,
  searchQuery,
  isMatch,
  editing,
  onSeek,
  onEditStart,
  onEditSave,
  onEditCancel,
}: {
  segment: TranscriptSegment;
  index: number;
  isPlaying: boolean;
  searchQuery: string;
  isMatch: boolean;
  editing: EditingState | null;
  onSeek: (time: number) => void;
  onEditStart: (index: number, field: "speaker" | "text") => void;
  onEditSave: (index: number, field: "speaker" | "text", value: string) => void;
  onEditCancel: () => void;
}) {
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEditingSpeaker = editing?.index === index && editing?.field === "speaker";
  const isEditingText = editing?.index === index && editing?.field === "text";

  useEffect(() => {
    if (isEditingSpeaker) {
      setEditValue(segment.speakerLabel);
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (isEditingText) {
      setEditValue(segment.text);
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditingSpeaker, isEditingText, segment.speakerLabel, segment.text]);

  const handleKeyDown = (e: React.KeyboardEvent, field: "speaker" | "text") => {
    if (e.key === "Escape") {
      onEditCancel();
    } else if (e.key === "Enter" && (field === "speaker" || !e.shiftKey)) {
      e.preventDefault();
      onEditSave(index, field, editValue);
    }
  };

  const playingClass = isPlaying ? "ring-2 ring-blue-500 dark:ring-blue-400" : "";
  const matchClass = isMatch && searchQuery ? "ring-2 ring-yellow-400" : "";

  return (
    <div
      className={`p-3 rounded-lg border ${speakerColor(segment.speakerLabel)} ${playingClass} ${matchClass} transition-all`}
      data-segment-index={index}
    >
      <div className="flex items-center justify-between mb-1">
        {isEditingSpeaker ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => onEditSave(index, "speaker", editValue)}
            onKeyDown={(e) => handleKeyDown(e, "speaker")}
            className="text-sm font-medium px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <button
            onClick={() => onEditStart(index, "speaker")}
            className={`text-sm font-medium ${speakerTextColor(segment.speakerLabel)} hover:underline cursor-pointer`}
            title="Click to edit speaker"
          >
            {segment.speakerLabel}
          </button>
        )}
        <button
          onClick={() => onSeek(segment.startTime)}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
          title="Click to jump to this timestamp"
        >
          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
        </button>
      </div>
      {isEditingText ? (
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => onEditSave(index, "text", editValue)}
          onKeyDown={(e) => handleKeyDown(e, "text")}
          className="w-full text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
        />
      ) : (
        <p
          onClick={() => onEditStart(index, "text")}
          className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 -mx-1"
          title="Click to edit text"
        >
          {highlightText(segment.text, searchQuery)}
        </p>
      )}
    </div>
  );
}

function formatTranscriptAsTxt(transcript: Transcript, meetingTitle: string): string {
  const lines: string[] = [];

  lines.push(`MEETING TRANSCRIPT: ${meetingTitle}`);
  lines.push(`${"=".repeat(50)}`);
  lines.push(`Language: ${transcript.language.toUpperCase()}`);
  lines.push(`Words: ${transcript.wordCount}`);
  lines.push(`Segments: ${transcript.segments.length}`);
  if (transcript.analysis?.sentiment) {
    lines.push(`Sentiment: ${transcript.analysis.sentiment}`);
  }
  lines.push("");
  lines.push("TRANSCRIPT");
  lines.push(`${"-".repeat(50)}`);
  lines.push("");

  transcript.segments.forEach((segment: TranscriptSegment) => {
    const timeRange = `[${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}]`;
    lines.push(`${segment.speakerLabel} ${timeRange}`);
    lines.push(segment.text);
    lines.push("");
  });

  if (transcript.analysis) {
    lines.push("");
    lines.push("ANALYSIS");
    lines.push(`${"-".repeat(50)}`);

    if (transcript.analysis.topics.length > 0) {
      lines.push("");
      lines.push("Topics:");
      transcript.analysis.topics.forEach((topic: string) => lines.push(`  - ${topic}`));
    }

    if (transcript.analysis.keyPoints.length > 0) {
      lines.push("");
      lines.push("Key Points:");
      transcript.analysis.keyPoints.forEach((point: string) => lines.push(`  - ${point}`));
    }

    if (transcript.analysis.actionItems.length > 0) {
      lines.push("");
      lines.push("Action Items:");
      transcript.analysis.actionItems.forEach((item: ActionItem) => {
        const assignee = item.assignee ? ` (${item.assignee})` : "";
        lines.push(`  - ${item.task}${assignee}`);
      });
    }

    if (transcript.analysis.questions.length > 0) {
      lines.push("");
      lines.push("Questions:");
      transcript.analysis.questions.forEach((q: string) => lines.push(`  ? ${q}`));
    }
  }

  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ExportDropdown({
  transcript,
  meetingTitle,
}: {
  transcript: Transcript;
  meetingTitle: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleExportTxt = () => {
    const content = formatTranscriptAsTxt(transcript, meetingTitle);
    const safeName = meetingTitle.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
    downloadFile(content, `transcript_${safeName}.txt`, "text/plain");
    setIsOpen(false);
  };

  const handleExportJson = () => {
    const content = JSON.stringify(transcript, null, 2);
    const safeName = meetingTitle.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
    downloadFile(content, `transcript_${safeName}.json`, "application/json");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
        Export
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 z-20">
            <button
              onClick={handleExportTxt}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              Text (.txt)
            </button>
            <button
              onClick={handleExportJson}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                />
              </svg>
              JSON (.json)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  matchCount,
  currentMatch,
  onPrevious,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
  matchCount: number;
  currentMatch: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
      <svg
        className="w-4 h-4 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search transcript..."
        className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400"
      />
      {value && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {matchCount > 0 ? `${currentMatch + 1}/${matchCount}` : "0 matches"}
          </span>
          <button
            onClick={onPrevious}
            disabled={matchCount === 0}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
            title="Previous match"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </button>
          <button
            onClick={onNext}
            disabled={matchCount === 0}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
            title="Next match"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => onChange("")}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600"
            title="Clear search"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function TranscriptPage() {
  const params = useParams();
  const meetingId = Number(params.id);
  const [activeTab, setActiveTab] = useState<"transcript" | "analysis">("transcript");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentContainerRef = useRef<HTMLDivElement>(null);

  const { data: meeting, isLoading: meetingLoading } = useMeeting(meetingId);
  const { data: recording, isLoading: recordingLoading } = useMeetingRecording(meetingId);
  const {
    data: transcript,
    isLoading: transcriptLoading,
    refetch: refetchTranscript,
  } = useMeetingTranscript(meetingId);
  const transcribe = useTranscribeRecording();
  const retranscribe = useRetranscribeRecording();
  const updateTranscript = useUpdateTranscript();

  const audioUrl = useMemo(() => {
    if (!recording) return null;
    return annixRepApi.recordings.streamUrl(recording.id);
  }, [recording]);

  const matchingIndices = useMemo(() => {
    if (!searchQuery.trim() || !transcript) return [];
    const query = searchQuery.toLowerCase();
    return transcript.segments
      .map((segment, index) => (segment.text.toLowerCase().includes(query) ? index : -1))
      .filter((index) => index !== -1);
  }, [searchQuery, transcript]);

  const currentPlayingIndex = useMemo(() => {
    if (!transcript) return -1;
    return transcript.segments.findIndex(
      (segment) => currentTime >= segment.startTime && currentTime < segment.endTime,
    );
  }, [transcript, currentTime]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play();
    }
  }, []);

  const scrollToSegment = useCallback((index: number) => {
    const container = segmentContainerRef.current;
    if (!container) return;
    const element = container.querySelector(`[data-segment-index="${index}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handlePreviousMatch = useCallback(() => {
    if (matchingIndices.length === 0) return;
    const newIndex = currentMatchIndex === 0 ? matchingIndices.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    scrollToSegment(matchingIndices[newIndex]);
  }, [matchingIndices, currentMatchIndex, scrollToSegment]);

  const handleNextMatch = useCallback(() => {
    if (matchingIndices.length === 0) return;
    const newIndex = (currentMatchIndex + 1) % matchingIndices.length;
    setCurrentMatchIndex(newIndex);
    scrollToSegment(matchingIndices[newIndex]);
  }, [matchingIndices, currentMatchIndex, scrollToSegment]);

  useEffect(() => {
    setCurrentMatchIndex(0);
    if (matchingIndices.length > 0) {
      scrollToSegment(matchingIndices[0]);
    }
  }, [searchQuery, matchingIndices, scrollToSegment]);

  const handleEditStart = useCallback((index: number, field: "speaker" | "text") => {
    setEditing({ index, field });
  }, []);

  const handleEditSave = useCallback(
    async (index: number, field: "speaker" | "text", value: string) => {
      if (!transcript) return;

      const original =
        field === "speaker"
          ? transcript.segments[index].speakerLabel
          : transcript.segments[index].text;
      if (value === original) {
        setEditing(null);
        return;
      }

      try {
        await updateTranscript.mutateAsync({
          transcriptId: transcript.id,
          dto: {
            segments: [
              {
                index,
                ...(field === "speaker" ? { speakerLabel: value } : { text: value }),
              },
            ],
          },
        });
        refetchTranscript();
      } catch {
        // Error handled by mutation
      }
      setEditing(null);
    },
    [transcript, updateTranscript, refetchTranscript],
  );

  const handleEditCancel = useCallback(() => {
    setEditing(null);
  }, []);

  const isLoading = meetingLoading || recordingLoading || transcriptLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Meeting not found</p>
        <Link href="/annix-rep/meetings" className="mt-4 text-blue-600 hover:underline">
          Back to meetings
        </Link>
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/annix-rep/meetings/${meetingId}`}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transcript</h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Recording Available
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This meeting does not have a recording yet. Record the meeting to generate a transcript.
          </p>
          <Link
            href={`/annix-rep/meetings/${meetingId}/record`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
            Record Meeting
          </Link>
        </div>
      </div>
    );
  }

  const handleTranscribe = async () => {
    await transcribe.mutateAsync(recording.id);
    refetchTranscript();
  };

  const handleRetranscribe = async () => {
    if (confirm("This will delete the existing transcript and create a new one. Continue?")) {
      await retranscribe.mutateAsync(recording.id);
      refetchTranscript();
    }
  };

  const isTranscribing =
    recording.processingStatus === "transcribing" || transcribe.isPending || retranscribe.isPending;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/annix-rep/meetings/${meetingId}`}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transcript</h1>
          <p className="text-gray-500 dark:text-gray-400">{meeting.title}</p>
        </div>
      </div>

      {!transcript ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {isTranscribing ? "Transcribing..." : "No Transcript Yet"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {isTranscribing
              ? "Please wait while the recording is being transcribed. This may take a few minutes."
              : "Click the button below to transcribe this recording using AI."}
          </p>
          {isTranscribing ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <button
              onClick={handleTranscribe}
              disabled={transcribe.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
              Transcribe Recording
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {audioUrl && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-10"
                style={{
                  filter: "invert(0)",
                }}
              />
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {transcript.wordCount}
                  </span>{" "}
                  words
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {transcript.segments.length}
                  </span>{" "}
                  segments
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Language:{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {transcript.language.toUpperCase()}
                  </span>
                </div>
                {transcript.analysis &&
                  sentimentBadge(transcript.analysis.sentiment, transcript.analysis.sentimentScore)}
              </div>
              <div className="flex items-center gap-3">
                <ExportDropdown transcript={transcript} meetingTitle={meeting.title} />
                <button
                  onClick={handleRetranscribe}
                  disabled={retranscribe.isPending}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  Re-transcribe
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="border-b border-gray-200 dark:border-slate-700">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab("transcript")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === "transcript"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  Transcript
                </button>
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === "analysis"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  Analysis
                  {transcript.analysis && transcript.analysis.actionItems.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                      {transcript.analysis.actionItems.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === "transcript" ? (
                <div className="space-y-4">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    matchCount={matchingIndices.length}
                    currentMatch={currentMatchIndex}
                    onPrevious={handlePreviousMatch}
                    onNext={handleNextMatch}
                  />
                  <div
                    ref={segmentContainerRef}
                    className="space-y-3 max-h-[600px] overflow-y-auto"
                  >
                    {transcript.segments.map((segment, i) => (
                      <TranscriptSegmentView
                        key={i}
                        segment={segment}
                        index={i}
                        isPlaying={currentPlayingIndex === i}
                        searchQuery={searchQuery}
                        isMatch={matchingIndices.includes(i)}
                        editing={editing}
                        onSeek={handleSeek}
                        onEditStart={handleEditStart}
                        onEditSave={handleEditSave}
                        onEditCancel={handleEditCancel}
                      />
                    ))}
                  </div>
                </div>
              ) : transcript.analysis ? (
                <AnalysisSection analysis={transcript.analysis} />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No analysis available for this transcript.
                </p>
              )}
            </div>
          </div>

          {transcript.processingTimeMs && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Processed in {(transcript.processingTimeMs / 1000).toFixed(1)}s using{" "}
              {transcript.whisperModel ?? "Whisper"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
