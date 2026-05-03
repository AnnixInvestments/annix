"use client";

import type { AssignmentTask } from "@annix/product-data/teacher-assistant";

interface TaskListProps {
  tasks: AssignmentTask[];
}

export function TaskList(props: TaskListProps) {
  const { tasks } = props;
  return (
    <ol className="space-y-4">
      {tasks.map((task) => (
        <li key={task.step} className="border-l-4 border-amber-400 pl-4 py-2">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-amber-700">Step {task.step}</span>
            <h3 className="text-base font-bold text-gray-900">{task.title}</h3>
          </div>
          <p className="text-gray-700 mb-3">{task.studentInstruction}</p>

          {task.requiredEvidence.length > 0 ? (
            <div className="mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Evidence
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {task.requiredEvidence.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <PromptBlock label="Reasoning" value={task.reasoningPrompt} />
          {task.aiCritique ? <AiCritiqueBlock critique={task.aiCritique} /> : null}
          <PromptBlock label="Reflection" value={task.reflectionPrompt} />
        </li>
      ))}
    </ol>
  );
}

interface PromptBlockProps {
  label: string;
  value: string;
}

function PromptBlock(props: PromptBlockProps) {
  const { label, value } = props;
  if (!value) return null;
  return (
    <div className="mt-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <p className="text-sm text-gray-700 mt-0.5 italic">{value}</p>
    </div>
  );
}

interface AiCritiqueBlockProps {
  critique: NonNullable<AssignmentTask["aiCritique"]>;
}

function AiCritiqueBlock(props: AiCritiqueBlockProps) {
  const { critique } = props;
  return (
    <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
      <span className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
        AI critique
      </span>
      <ul className="mt-1 space-y-1 text-sm text-amber-900">
        <li>
          <strong>Try this prompt:</strong> {critique.promptToTry}
        </li>
        <li>
          <strong>Compare to your evidence:</strong> {critique.compareToEvidence}
        </li>
        <li>
          <strong>Note issues:</strong> {critique.noteIssues}
        </li>
        <li>
          <strong>Improve with personal input:</strong> {critique.improveWithPersonalInput}
        </li>
      </ul>
    </div>
  );
}
