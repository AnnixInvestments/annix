import type { Assignment } from "@annix/product-data/teacher-assistant";

export function exportAssignmentAsClipboardText(assignment: Assignment): string {
  const lines: string[] = [];
  lines.push(assignment.title);
  lines.push("=".repeat(assignment.title.length));
  lines.push("");
  lines.push(
    `${assignment.subject} · ${assignment.topic} · ages ${assignment.ageBucket} · ${assignment.duration} · ${assignment.outputType} · ${assignment.difficulty}`,
  );
  lines.push("");
  lines.push("STUDENT BRIEF");
  lines.push("-------------");
  lines.push(assignment.studentBrief);
  lines.push("");

  if (assignment.learningObjective) {
    lines.push("LEARNING OBJECTIVE");
    lines.push("------------------");
    lines.push(assignment.learningObjective);
    lines.push("");
  }

  if (assignment.successCriteria.length > 0) {
    lines.push("SUCCESS CRITERIA");
    lines.push("----------------");
    assignment.successCriteria.forEach((c) => lines.push(`- ${c}`));
    lines.push("");
  }

  lines.push("TASKS");
  lines.push("-----");
  assignment.tasks.forEach((task) => {
    lines.push(`Step ${task.step}: ${task.title}`);
    lines.push(task.studentInstruction);
    if (task.requiredEvidence.length > 0) {
      lines.push(`Evidence: ${task.requiredEvidence.join(", ")}`);
    }
    if (task.reasoningPrompt) lines.push(`Reasoning: ${task.reasoningPrompt}`);
    if (task.aiCritique) {
      lines.push("AI critique:");
      lines.push(`  - Try this prompt: ${task.aiCritique.promptToTry}`);
      lines.push(`  - Compare to evidence: ${task.aiCritique.compareToEvidence}`);
      lines.push(`  - Note issues: ${task.aiCritique.noteIssues}`);
      lines.push(`  - Improve with personal input: ${task.aiCritique.improveWithPersonalInput}`);
    }
    if (task.reflectionPrompt) lines.push(`Reflection: ${task.reflectionPrompt}`);
    lines.push("");
  });

  if (assignment.aiUseRules.length > 0) {
    lines.push("AI USE RULES");
    lines.push("------------");
    assignment.aiUseRules.forEach((r) => lines.push(`- ${r}`));
    lines.push("");
  }

  if (assignment.evidenceChecklist.length > 0) {
    lines.push("EVIDENCE CHECKLIST");
    lines.push("------------------");
    assignment.evidenceChecklist.forEach((c) => lines.push(`- ${c}`));
    lines.push("");
  }

  lines.push("RUBRIC (4-level)");
  lines.push("----------------");
  assignment.rubric.forEach((r) => {
    lines.push(`${r.criterion}:`);
    lines.push(`  Excellent: ${r.excellent}`);
    lines.push(`  Good: ${r.good}`);
    lines.push(`  Satisfactory: ${r.satisfactory}`);
    lines.push(`  Needs Work: ${r.needsWork}`);
  });
  lines.push("");

  lines.push("TEACHER NOTES");
  lines.push("-------------");
  const tn = assignment.teacherNotes;
  if (tn.setup) lines.push(`Setup: ${tn.setup}`);
  if (tn.setupTime) lines.push(`Setup time: ${tn.setupTime}`);
  if (tn.materialsNeeded.length > 0) {
    lines.push(`Materials: ${tn.materialsNeeded.join(", ")}`);
  }
  if (tn.commonMisconceptions.length > 0) {
    lines.push("Common misconceptions:");
    tn.commonMisconceptions.forEach((m) => lines.push(`  - ${m}`));
  }
  if (tn.markingGuidance) lines.push(`Marking guidance: ${tn.markingGuidance}`);
  if (tn.supportOption) lines.push(`Support option: ${tn.supportOption}`);
  if (tn.extensionOption) lines.push(`Extension option: ${tn.extensionOption}`);
  lines.push("");

  if (assignment.parentNote) {
    lines.push("PARENT NOTE");
    lines.push("-----------");
    lines.push(assignment.parentNote);
    lines.push("");
  }

  if (assignment.studentAiPromptStarters.length > 0) {
    lines.push("SUGGESTED STUDENT AI PROMPTS");
    lines.push("----------------------------");
    assignment.studentAiPromptStarters.forEach((p) => lines.push(`- ${p}`));
  }

  return lines.join("\n");
}
