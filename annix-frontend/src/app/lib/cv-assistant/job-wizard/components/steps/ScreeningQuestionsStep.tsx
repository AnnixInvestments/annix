"use client";

import type {
  JobPosting,
  JobScreeningQuestion,
  ScreeningQuestionType,
  UpdateJobWizardPayload,
} from "@/app/lib/api/cvAssistantApi";
import { SCREENING_QUESTION_TYPE_OPTIONS } from "../../constants/skill-options";
import { arrOr } from "../../utils/value-helpers";
import { inputClass, StepShell, selectClass } from "../StepShell";

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

  return (
    <StepShell
      title="Screening Questions"
      subtitle="Filter out applicants who don't meet hard requirements. Phase 3 will let Nix auto-generate these from your outcomes + skills."
    >
      <ul className="space-y-3">
        {questions.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No screening questions yet. Add a yes/no question for any disqualifying requirement.
          </p>
        )}
        {questions.map((q, i) => (
          <li key={i} className="bg-[#f5f5fc] p-4 rounded-lg space-y-3">
            <ScreeningRow
              question={q}
              inputClass={inputClass}
              selectClass={selectClass}
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
  onUpdate: (patch: Partial<JobScreeningQuestion>) => void;
  onRemove: () => void;
}

function ScreeningRow(props: ScreeningRowProps) {
  const { question, inputClass, selectClass, onUpdate, onRemove } = props;
  const weightValue = question.weight;
  const weightDefault = weightValue === undefined || weightValue === null ? 5 : weightValue;
  const disqualifyingValue = question.disqualifyingAnswer;
  const disqualifyingDefault = disqualifyingValue ? disqualifyingValue : "";

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <input
          type="text"
          className={`${inputClass} md:col-span-7`}
          placeholder="e.g. Do you have at least 3 years external B2B sales experience?"
          defaultValue={question.question}
          onBlur={(e) => onUpdate({ question: e.target.value.trim() })}
        />
        <select
          className={`${selectClass} md:col-span-3`}
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
          className="md:col-span-1 px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
        >
          Remove
        </button>
      </div>
      <input
        type="text"
        className={inputClass}
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
