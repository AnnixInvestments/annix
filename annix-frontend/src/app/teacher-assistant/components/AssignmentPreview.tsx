"use client";

import type {
  Assignment,
  AssignmentInput,
  AssignmentSection,
} from "@annix/product-data/teacher-assistant";
import { Copy, Download } from "lucide-react";
import { useMemo } from "react";
import { useToast } from "@/app/components/Toast";
import { useRegenerateSection } from "@/app/lib/query/hooks";
import { exportAssignmentAsClipboardText } from "../lib/clipboard-export";
import { downloadAssignmentAsPdf } from "../lib/pdf-export";
import { useAssignmentEditor } from "../lib/useAssignmentEditor";
import { EditableSection } from "./EditableSection";
import { RubricTable } from "./RubricTable";
import { TaskList } from "./TaskList";

interface AssignmentPreviewProps {
  initialAssignment: Assignment;
  generatedFrom: AssignmentInput;
}

export function AssignmentPreview(props: AssignmentPreviewProps) {
  const { initialAssignment, generatedFrom } = props;
  const editor = useAssignmentEditor(initialAssignment);
  const regenerate = useRegenerateSection();
  const { showToast } = useToast();

  const isRegenerating = regenerate.isPending;

  const handleRegenerateSection = (section: AssignmentSection) => {
    regenerate.mutate(
      {
        input: generatedFrom,
        section,
        existingAssignment: editor.current,
      },
      {
        onSuccess: (next) => {
          editor.replace(next);
          showToast(`Regenerated ${section}.`, "success");
        },
        onError: (error) => {
          showToast(
            error instanceof Error ? error.message : "Section regeneration failed.",
            "error",
          );
        },
      },
    );
  };

  const handleCopy = async () => {
    const text = exportAssignmentAsClipboardText(editor.current);
    await navigator.clipboard.writeText(text);
    showToast("Assignment copied to clipboard.", "success");
  };

  const handlePdf = () => {
    downloadAssignmentAsPdf(editor.current);
  };

  const editedSections = useMemo(() => editor.editedSections, [editor.editedSections]);

  const isEdited = (section: AssignmentSection) => editedSections.has(section);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{editor.current.title}</h1>
            <p className="text-sm text-gray-500">
              {editor.current.subject} · {editor.current.topic} · ages {editor.current.ageBucket} ·{" "}
              {editor.current.duration} · {editor.current.outputType} · {editor.current.difficulty}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button
              type="button"
              onClick={handlePdf}
              className="inline-flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      </header>

      <EditableSection
        title="Student brief"
        isEdited={isEdited("studentBrief")}
        onRestore={() => editor.restoreSection("studentBrief")}
        onRegenerate={() => handleRegenerateSection("studentBrief")}
        isRegenerating={isRegenerating}
      >
        <textarea
          value={editor.current.studentBrief}
          onChange={(event) => editor.updateField("studentBrief", event.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[120px]"
        />
      </EditableSection>

      <EditableSection
        title="Success criteria"
        isEdited={isEdited("successCriteria")}
        onRestore={() => editor.restoreSection("successCriteria")}
      >
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {editor.current.successCriteria.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </EditableSection>

      <EditableSection
        title="Tasks"
        isEdited={isEdited("tasks")}
        onRestore={() => editor.restoreSection("tasks")}
        onRegenerate={() => handleRegenerateSection("tasks")}
        isRegenerating={isRegenerating}
      >
        <TaskList tasks={editor.current.tasks} />
      </EditableSection>

      <EditableSection
        title="AI use rules"
        isEdited={isEdited("aiUseRules")}
        onRestore={() => editor.restoreSection("aiUseRules")}
      >
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {editor.current.aiUseRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </EditableSection>

      <EditableSection
        title="Evidence checklist"
        isEdited={isEdited("evidenceChecklist")}
        onRestore={() => editor.restoreSection("evidenceChecklist")}
      >
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {editor.current.evidenceChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </EditableSection>

      <EditableSection
        title="Rubric"
        isEdited={isEdited("rubric")}
        onRestore={() => editor.restoreSection("rubric")}
        onRegenerate={() => handleRegenerateSection("rubric")}
        isRegenerating={isRegenerating}
      >
        <RubricTable rubric={editor.current.rubric} />
      </EditableSection>

      <EditableSection
        title="Teacher notes"
        isEdited={isEdited("teacherNotes")}
        onRestore={() => editor.restoreSection("teacherNotes")}
      >
        <TeacherNotesView notes={editor.current.teacherNotes} />
      </EditableSection>

      <EditableSection
        title="Parent note"
        isEdited={isEdited("parentNote")}
        onRestore={() => editor.restoreSection("parentNote")}
      >
        <p className="text-gray-700">{editor.current.parentNote}</p>
      </EditableSection>

      <EditableSection
        title="Suggested student AI prompts"
        isEdited={isEdited("studentAiPromptStarters")}
        onRestore={() => editor.restoreSection("studentAiPromptStarters")}
      >
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {editor.current.studentAiPromptStarters.map((p) => (
            <li key={p} className="font-mono text-sm">
              {p}
            </li>
          ))}
        </ul>
      </EditableSection>
    </div>
  );
}

interface TeacherNotesViewProps {
  notes: Assignment["teacherNotes"];
}

function TeacherNotesView(props: TeacherNotesViewProps) {
  const { notes } = props;
  return (
    <dl className="space-y-3 text-sm">
      <NoteRow label="Setup" value={notes.setup} />
      <NoteRow label="Setup time" value={notes.setupTime} />
      <NoteRow label="Materials needed" value={notes.materialsNeeded.join(", ")} />
      <NoteRow label="Common misconceptions" value={notes.commonMisconceptions.join("; ")} />
      <NoteRow label="Marking guidance" value={notes.markingGuidance} />
      <NoteRow label="Support option" value={notes.supportOption} />
      <NoteRow label="Extension option" value={notes.extensionOption} />
    </dl>
  );
}

interface NoteRowProps {
  label: string;
  value: string;
}

function NoteRow(props: NoteRowProps) {
  const { label, value } = props;
  if (!value) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <dt className="font-semibold text-gray-700">{label}</dt>
      <dd className="md:col-span-2 text-gray-700">{value}</dd>
    </div>
  );
}
