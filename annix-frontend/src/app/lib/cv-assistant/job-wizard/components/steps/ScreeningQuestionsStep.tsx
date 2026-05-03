"use client";

import { useToast } from "@/app/components/Toast";
import {
  cvAssistantApiClient,
  type JobPosting,
  type JobScreeningQuestion,
  type ScreeningQuestionType,
  type UpdateJobWizardPayload,
} from "@/app/lib/api/cvAssistantApi";
import { SCREENING_QUESTION_TYPE_OPTIONS } from "../../constants/skill-options";
import { useNixCall } from "../../hooks/useNixCall";
import { arrOr } from "../../utils/value-helpers";
import { inputClass, StepShell, selectClass, textareaClass } from "../StepShell";

export interface ScreeningQuestionsStepProps {
  draft: JobPosting;
  onChange: (patch: UpdateJobWizardPayload) => void;
}

const blankQuestion = (): JobScreeningQuestion => ({
  question: "",
  questionType: "yes_no",
});

export function ScreeningQuestionsStep({ draft, onChange }: ScreeningQuestionsStepProps) {
  const questions = arrOr(draft.screeningQuestions);

  const updateQuestion = (index: number, patch: Partial<JobScreeningQuestion>) => {
    const updated = questions.map((q, i) => (i === index ? { ...q, ...patch } : q));
    onChange({ screeningQuestions: updated });
  };

  const addQuestion = () => onChange({ screeningQuestions: [...questions, blankQuestion()] });

  const removeQuestion = (index: number) =>
    onChange({ screeningQuestions: questions.filter((_, i) => i !== index) });

  const { showToast } = useToast();
  const screeningSuggest = useNixCall({
    operation: "screening-questions",
    label: "Nix is generating screening questions…",
    fn: (id: number) => cvAssistantApiClient.nixScreeningQuestionsSuggest(id),
  });
  const isSuggesting = screeningSuggest.isPending;
  const handleSuggest = () => {
    screeningSuggest.mutate(draft.id, {
      onSuccess: (data) => {
        const suggested: JobScreeningQuestion[] = data.questions.map((q) => {
          const opts = q.options;
          const disq = q.disqualifyingAnswer;
          return {
            question: q.question,
            questionType: q.questionType,
            options: opts ? opts : null,
            disqualifyingAnswer: disq ? disq : null,
            weight: q.weight,
          };
        });
        const merged: JobScreeningQuestion[] = [...questions];
        for (const s of suggested) {
          const lower = s.question.toLowerCase();
          const dupe = merged.some((existing) => existing.question.toLowerCase() === lower);
          if (!dupe) merged.push(s);
        }
        onChange({ screeningQuestions: merged });
        showToast(`Nix added ${suggested.length} screening questions.`, "success");
      },
      onError: () => showToast("Nix couldn't suggest questions. Try again.", "error"),
    });
  };

  return (
    <StepShell
      title="Screening Questions"
      subtitle="Filter out applicants who don't meet hard requirements. Click Suggest to have Nix generate a starter set from your outcomes and skills."
    >
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSuggest}
          disabled={isSuggesting}
          className="text-xs px-3 py-1.5 bg-[#FFA500] text-[#1a1a40] font-semibold rounded-lg hover:bg-[#FFB733] transition-all disabled:opacity-50"
        >
          {isSuggesting ? "Nix thinking…" : "Suggest screening questions"}
        </button>
      </div>
      <ul className="space-y-3">
        {questions.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No screening questions yet. Click <strong>Suggest screening questions</strong> or add
            one manually.
          </p>
        )}
        {questions.map((q, i) => (
          <li key={`${i}-${q.question}`} className="bg-[#f5f5fc] p-4 rounded-lg space-y-3">
            <ScreeningRow
              question={q}
              inputClass={inputClass}
              selectClass={selectClass}
              textareaClass={textareaClass}
              onUpdate={(patch) => updateQuestion(i, patch)}
              onRemove={() => removeQuestion(i)}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addQuestion}
        className="text-sm font-semibold text-[#252560] hover:text-[#1a1a40]"
      >
        + Add screening question
      </button>
    </StepShell>
  );
}

interface ScreeningRowProps {
  question: JobScreeningQuestion;
  inputClass: string;
  selectClass: string;
  textareaClass: string;
  onUpdate: (patch: Partial<JobScreeningQuestion>) => void;
  onRemove: () => void;
}

function ScreeningRow(props: ScreeningRowProps) {
  const { question, inputClass, selectClass, textareaClass, onUpdate, onRemove } = props;
  const weightValue = question.weight;
  const weightDefault = weightValue === undefined || weightValue === null ? 5 : weightValue;
  const disqualifyingValue = question.disqualifyingAnswer;
  const disqualifyingDefault = disqualifyingValue ? disqualifyingValue : "";

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        <textarea
          rows={2}
          className={`${textareaClass} md:col-span-8 !min-h-[60px] resize-y whitespace-pre-wrap`}
          placeholder="e.g. Do you have at least 3 years external B2B sales experience?"
          defaultValue={question.question}
          onBlur={(e) => onUpdate({ question: e.target.value.trim() })}
        />
        <select
          className={`${selectClass} md:col-span-2`}
          defaultValue={question.questionType}
          onChange={(e) => onUpdate({ questionType: e.target.value as ScreeningQuestionType })}
        >
          {SCREENING_QUESTION_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={10}
          className={`${inputClass} md:col-span-1`}
          placeholder="Wt"
          defaultValue={weightDefault}
          onBlur={(e) => {
            const raw = e.target.value;
            onUpdate({ weight: raw ? Number(raw) : 5 });
          }}
        />
        <button
          type="button"
          onClick={onRemove}
          className="md:col-span-1 px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg shrink-0"
        >
          Remove
        </button>
      </div>
      <input
        type="text"
        className={`${inputClass} max-w-md`}
        placeholder="Disqualifying answer (optional). e.g. 'no'"
        defaultValue={disqualifyingDefault}
        onBlur={(e) => {
          const trimmed = e.target.value.trim();
          onUpdate({ disqualifyingAnswer: trimmed ? trimmed : null });
        }}
      />
    </>
  );
}
