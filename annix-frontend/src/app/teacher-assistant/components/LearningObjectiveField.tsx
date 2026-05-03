"use client";

import type { AgeBucket, DifficultyLevel, Subject } from "@annix/product-data/teacher-assistant";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { extractErrorMessage } from "@/app/lib/api/apiError";
import { useSuggestObjectives } from "@/app/lib/query/hooks";

interface LearningObjectiveFieldProps {
  value: string;
  onChange: (value: string) => void;
  subject: Subject;
  topic: string;
  ageBucket: AgeBucket;
  difficulty: DifficultyLevel;
}

export function LearningObjectiveField(props: LearningObjectiveFieldProps) {
  const { value, onChange, subject, topic, ageBucket, difficulty } = props;
  const { showToast } = useToast();
  const suggest = useSuggestObjectives();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const trimmedTopic = topic.trim();
  const canSuggest = trimmedTopic.length >= 2 && !suggest.isPending;

  const handleSuggest = () => {
    if (!canSuggest) return;
    setSuggestions([]);
    suggest.mutate(
      { subject, topic: trimmedTopic, ageBucket, difficulty },
      {
        onSuccess: (result) => {
          if (result.suggestions.length === 0) {
            showToast("Nix could not generate suggestions for that topic.", "warning");
            return;
          }
          setSuggestions(result.suggestions);
        },
        onError: (error) => {
          showToast(extractErrorMessage(error, "Couldn't get suggestions right now."), "error");
        },
      },
    );
  };

  const pickSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setSuggestions([]);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <label htmlFor="learningObjective" className="block text-sm font-medium text-gray-700">
          Learning objective (optional)
        </label>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={!canSuggest}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-[#323288] hover:bg-[#f5f6ff] disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          aria-label="Suggest learning objectives with Nix AI"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {suggest.isPending ? "Asking Nix…" : "Suggest with Nix"}
        </button>
      </div>
      <input
        id="learningObjective"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. Identify five cloud types and link them to weather patterns."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#323288] focus:border-transparent"
      />
      {!canSuggest && trimmedTopic.length < 2 ? (
        <p className="mt-1.5 text-xs text-gray-500">Enter a topic above to get Nix suggestions.</p>
      ) : null}
      {suggestions.length > 0 ? (
        <div className="mt-3 rounded-lg border border-[#FFA500]/40 bg-[#fffbf2] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#92400e] uppercase tracking-wide">
              Nix suggests — click to use
            </span>
            <button
              type="button"
              onClick={() => setSuggestions([])}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Dismiss suggestions"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-1.5">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => pickSuggestion(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-800 bg-white rounded-md border border-gray-200 hover:border-[#FFA500] hover:bg-[#fff6e5] transition-colors"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
