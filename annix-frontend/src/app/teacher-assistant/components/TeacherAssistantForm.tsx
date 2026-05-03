"use client";

import {
  AGE_BUCKETS,
  type AgeBucket,
  type AssignmentInput,
  DIFFERENTIATION_OPTIONS,
  DIFFICULTY_LEVELS,
  type DifferentiationOption,
  type DifficultyLevel,
  DURATIONS,
  type Duration,
  OUTPUT_TYPES,
  type OutputType,
  SUBJECTS,
  type Subject,
} from "@annix/product-data/teacher-assistant";
import { Sparkles } from "lucide-react";
import { useState } from "react";

interface FormState {
  subject: Subject;
  topic: string;
  ageBucket: AgeBucket;
  studentAge: number;
  duration: Duration;
  outputType: OutputType;
  difficulty: DifficultyLevel;
  differentiation: DifferentiationOption[];
  learningObjective: string;
  allowAiUse: boolean;
}

const DEFAULT_FORM: FormState = {
  subject: "geography",
  topic: "",
  ageBucket: "12-14",
  studentAge: 13,
  duration: "1 week",
  outputType: "Poster",
  difficulty: "standard",
  differentiation: [],
  learningObjective: "",
  allowAiUse: true,
};

const AGE_FOR_BUCKET: Record<AgeBucket, number> = {
  "12-14": 13,
  "14-16": 15,
  "16-18": 17,
};

interface TeacherAssistantFormProps {
  onSubmit: (input: AssignmentInput) => void;
  isSubmitting: boolean;
}

export function TeacherAssistantForm(props: TeacherAssistantFormProps) {
  const { onSubmit, isSubmitting } = props;
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDifferentiation = (option: DifferentiationOption) => {
    setForm((prev) => {
      const exists = prev.differentiation.includes(option);
      const next = exists
        ? prev.differentiation.filter((o) => o !== option)
        : [...prev.differentiation, option];
      return { ...prev, differentiation: next };
    });
  };

  const handleAgeBucketChange = (bucket: AgeBucket) => {
    setForm((prev) => ({ ...prev, ageBucket: bucket, studentAge: AGE_FOR_BUCKET[bucket] }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.topic.trim()) return;
    const input: AssignmentInput = {
      subject: form.subject,
      topic: form.topic.trim(),
      ageBucket: form.ageBucket,
      studentAge: form.studentAge,
      duration: form.duration,
      outputType: form.outputType,
      difficulty: form.difficulty,
      differentiation: form.differentiation,
      learningObjective: form.learningObjective.trim() || null,
      allowAiUse: form.allowAiUse,
    };
    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSelect
          label="Subject"
          value={form.subject}
          onChange={(v) => setField("subject", v as Subject)}
          options={SUBJECTS}
        />
        <FormText
          label="Topic"
          value={form.topic}
          onChange={(v) => setField("topic", v)}
          placeholder="e.g. cloud types, electrical circuits, water cycle"
          required
        />
        <FormSelect
          label="Age bucket"
          value={form.ageBucket}
          onChange={(v) => handleAgeBucketChange(v as AgeBucket)}
          options={AGE_BUCKETS}
        />
        <FormNumber
          label="Specific student age"
          value={form.studentAge}
          onChange={(v) => setField("studentAge", v)}
          min={12}
          max={18}
        />
        <FormSelect
          label="Duration"
          value={form.duration}
          onChange={(v) => setField("duration", v as Duration)}
          options={DURATIONS}
        />
        <FormSelect
          label="Output type"
          value={form.outputType}
          onChange={(v) => setField("outputType", v as OutputType)}
          options={OUTPUT_TYPES}
        />
        <FormSelect
          label="Difficulty"
          value={form.difficulty}
          onChange={(v) => setField("difficulty", v as DifficultyLevel)}
          options={DIFFICULTY_LEVELS}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">AI use</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={form.allowAiUse}
                onChange={() => setField("allowAiUse", true)}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm">Yes (structured)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!form.allowAiUse}
                onChange={() => setField("allowAiUse", false)}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm">No (traditional)</span>
            </label>
          </div>
        </div>
      </div>

      <FormText
        label="Learning objective (optional)"
        value={form.learningObjective}
        onChange={(v) => setField("learningObjective", v)}
        placeholder="e.g. Identify five cloud types and link them to weather patterns."
      />

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">
          Differentiation (optional)
        </span>
        <div className="flex flex-wrap gap-3">
          {DIFFERENTIATION_OPTIONS.map((option) => {
            const checked = form.differentiation.includes(option);
            return (
              <label
                key={option}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  checked
                    ? "border-amber-500 bg-amber-50 text-amber-900"
                    : "border-gray-200 bg-white text-gray-700 hover:border-amber-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDifferentiation(option)}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm">{option}</span>
              </label>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !form.topic.trim()}
        className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        <Sparkles className="w-5 h-5" />
        {isSubmitting ? "Generating…" : "Generate assignment"}
      </button>
    </form>
  );
}

interface FormTextProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

function FormText(props: FormTextProps) {
  const { label, value, onChange, placeholder, required } = props;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      />
    </div>
  );
}

interface FormNumberProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

function FormNumber(props: FormNumberProps) {
  const { label, value, onChange, min, max } = props;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        min={min}
        max={max}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      />
    </div>
  );
}

interface FormSelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: string) => void;
  options: readonly T[];
}

function FormSelect<T extends string>(props: FormSelectProps<T>) {
  const { label, value, onChange, options } = props;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
