"use client";

import type {
  Assignment,
  AssignmentInput,
  AssignmentSection,
} from "@annix/product-data/teacher-assistant";
import { AlertTriangle, Copy, Download, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useRegenerateSection } from "@/app/lib/query/hooks";
import { exportAssignmentAsClipboardText } from "../lib/clipboard-export";
import { downloadAssignmentAsDocx } from "../lib/docx-export";
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
  const { confirm, ConfirmDialog } = useConfirm();

  const handleDeleteTask = async (index: number) => {
    const task = editor.current.tasks[index];
    const ok = await confirm({
      title: "Delete this task?",
      message: `"${task.title}" will be removed and the remaining tasks renumbered.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (ok) {
      editor.deleteTask(index);
    }
  };

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

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const handlePdf = async () => {
    setIsExportingPdf(true);
    try {
      await downloadAssignmentAsPdf(editor.current);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "PDF export failed.", "error");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDocx = async () => {
    setIsExportingDocx(true);
    try {
      await downloadAssignmentAsDocx(editor.current);
      showToast("Word document downloaded.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Word export failed.", "error");
    } finally {
      setIsExportingDocx(false);
    }
  };

  const editedSections = useMemo(() => editor.editedSections, [editor.editedSections]);
  const rawQualityWarnings = editor.current.qualityWarnings;
  const qualityWarnings = rawQualityWarnings ?? [];

  const isEdited = (section: AssignmentSection) => editedSections.has(section);

  return (
    <div className="max-w-4xl mx-auto">
      {qualityWarnings.length > 0 ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-900">
            <p className="font-semibold mb-1">Generated with caveats — please review</p>
            <p className="mb-2">
              Nix didn't fully meet our quality bar this time. The assignment is still usable but
              you should review and edit the items below before sharing it with students.
            </p>
            <details>
              <summary className="cursor-pointer font-medium hover:text-amber-950">
                What to check ({qualityWarnings.length})
              </summary>
              <ul className="mt-2 ml-2 space-y-1 list-disc list-inside">
                {qualityWarnings.slice(0, 8).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
                {qualityWarnings.length > 8 ? (
                  <li className="opacity-70">…and {qualityWarnings.length - 8} more.</li>
                ) : null}
              </ul>
            </details>
          </div>
        </div>
      ) : null}
      <header className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{editor.current.title}</h1>
            <p className="text-sm text-gray-500">
              {editor.current.subject} · {editor.current.topic} · ages {editor.current.ageBucket} ·{" "}
              {editor.current.duration} · {editor.current.outputType} · {editor.current.difficulty}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
              onClick={handleDocx}
              disabled={isExportingDocx}
              className="inline-flex items-center gap-1 px-3 py-2 border border-[#323288] text-[#323288] rounded-lg text-sm hover:bg-[#f5f6ff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-4 h-4" />
              {isExportingDocx ? "Exporting…" : "Export Word"}
            </button>
            <button
              type="button"
              onClick={handlePdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1 px-3 py-2 bg-[#323288] hover:bg-[#252560] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              {isExportingPdf ? "Exporting…" : "Export PDF"}
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#323288] min-h-[120px]"
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
        <TaskList
          tasks={editor.current.tasks}
          onMoveUp={editor.moveTaskUp}
          onMoveDown={editor.moveTaskDown}
          onDelete={handleDeleteTask}
        />
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

      {editor.current.partialExemplars.length > 0 ? (
        <EditableSection
          title="Partial exemplars"
          isEdited={isEdited("partialExemplars")}
          onRestore={() => editor.restoreSection("partialExemplars")}
        >
          <ul className="space-y-3">
            {editor.current.partialExemplars.map((ex) => (
              <li
                key={`${ex.forCriterion}-${ex.strongElement.slice(0, 16)}`}
                className="border border-gray-200 rounded-lg p-3"
              >
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {ex.forCriterion}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold text-emerald-700">Strong:</span>
                    <p className="text-gray-700 mt-0.5">{ex.strongElement}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-red-700">Weak:</span>
                    <p className="text-gray-700 mt-0.5">{ex.weakElement}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </EditableSection>
      ) : null}

      {editor.current.optionalWorkbookPages.length > 0 ? (
        <EditableSection
          title="Workbook pages"
          isEdited={isEdited("optionalWorkbookPages")}
          onRestore={() => editor.restoreSection("optionalWorkbookPages")}
        >
          <ul className="space-y-3">
            {editor.current.optionalWorkbookPages.map((page) => (
              <li key={page.pageTitle} className="border border-gray-200 rounded-lg p-3">
                <h4 className="font-semibold text-gray-900 mb-1">{page.pageTitle}</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{page.content}</p>
                {page.imagePromptHint ? (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Suggested image: {page.imagePromptHint}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </EditableSection>
      ) : null}

      {ConfirmDialog}
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
