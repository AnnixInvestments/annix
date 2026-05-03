import type { Assignment } from "@annix/product-data/teacher-assistant";

export function renderAssignmentHtml(assignment: Assignment): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(assignment.title)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.55;
    color: #111827;
    margin: 0;
    font-size: 10.5pt;
  }
  h1 { font-size: 22pt; margin: 0 0 0.25em; color: #92400e; }
  h2 {
    font-size: 13pt;
    margin: 1.2em 0 0.5em;
    color: #92400e;
    border-bottom: 2px solid #fbbf24;
    padding-bottom: 0.15em;
  }
  h3 { font-size: 11pt; margin: 0.6em 0 0.2em; }
  .meta { color: #6b7280; font-size: 9.5pt; margin-bottom: 1em; }
  .brief { background: #fffbeb; padding: 12px 14px; border-left: 4px solid #f59e0b; border-radius: 4px; }
  ul { padding-left: 20px; margin: 0.4em 0; }
  ol { padding-left: 20px; margin: 0.4em 0; }
  li { margin: 0.15em 0; }
  .task {
    border-left: 3px solid #fbbf24;
    padding: 8px 12px;
    margin: 12px 0;
    background: #fffdf7;
    page-break-inside: avoid;
  }
  .task-head { color: #92400e; font-weight: 600; font-size: 10.5pt; margin-bottom: 4px; }
  .evidence-tag {
    display: inline-block;
    background: #f3f4f6;
    border-radius: 999px;
    padding: 1px 8px;
    margin: 2px 3px 2px 0;
    font-size: 8.5pt;
    color: #374151;
  }
  .ai-critique {
    background: #fef3c7;
    border-radius: 6px;
    padding: 8px 10px;
    margin-top: 6px;
    font-size: 10pt;
  }
  .ai-critique strong { color: #92400e; }
  .prompt-block { margin-top: 6px; font-size: 10pt; }
  .prompt-block .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
  .prompt-block .value { font-style: italic; color: #374151; }
  table.rubric { width: 100%; border-collapse: collapse; font-size: 9.5pt; page-break-inside: avoid; }
  table.rubric th { background: #fef3c7; color: #92400e; text-align: left; padding: 6px 8px; border: 1px solid #fcd34d; }
  table.rubric td { padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
  table.rubric td.criterion { font-weight: 600; }
  .notes-grid { display: grid; grid-template-columns: 130px 1fr; gap: 4px 12px; font-size: 10pt; }
  .notes-grid dt { font-weight: 600; color: #374151; }
  .notes-grid dd { margin: 0; color: #4b5563; }
  .exemplar {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 8px;
    page-break-inside: avoid;
  }
  .exemplar-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; font-size: 10pt; }
  .strong-label { color: #047857; font-weight: 600; }
  .weak-label { color: #b91c1c; font-weight: 600; }
  .workbook-page {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 8px;
    page-break-inside: avoid;
  }
  .footer-note {
    margin-top: 1.5em;
    padding-top: 0.6em;
    border-top: 1px solid #e5e7eb;
    color: #6b7280;
    font-size: 9pt;
  }
</style>
</head>
<body>
<h1>${esc(assignment.title)}</h1>
<div class="meta">
  ${esc(cap(assignment.subject))} · ${esc(assignment.topic)} · ages ${esc(assignment.ageBucket)} · ${esc(assignment.duration)} · ${esc(assignment.outputType)} · ${esc(assignment.difficulty)}
</div>

<h2>Student brief</h2>
<div class="brief">${esc(assignment.studentBrief)}</div>

${assignment.learningObjective ? `<h2>Learning objective</h2><p>${esc(assignment.learningObjective)}</p>` : ""}

${
  assignment.successCriteria.length
    ? `<h2>Success criteria</h2><ul>${assignment.successCriteria
        .map((c) => `<li>${esc(c)}</li>`)
        .join("")}</ul>`
    : ""
}

<h2>Tasks</h2>
${assignment.tasks
  .map(
    (task) => `
  <div class="task">
    <div class="task-head">Step ${task.step}: ${esc(task.title)}</div>
    <div>${esc(task.studentInstruction)}</div>
    ${
      task.requiredEvidence.length
        ? `<div style="margin-top:6px">
        <span class="prompt-block label">Evidence:</span>
        ${task.requiredEvidence.map((e) => `<span class="evidence-tag">${esc(e)}</span>`).join("")}
      </div>`
        : ""
    }
    ${
      task.reasoningPrompt
        ? `<div class="prompt-block"><span class="label">Reasoning</span><div class="value">${esc(task.reasoningPrompt)}</div></div>`
        : ""
    }
    ${
      task.aiCritique
        ? `<div class="ai-critique">
        <strong>AI critique</strong>
        <ul style="margin: 4px 0 0">
          <li><strong>Try this prompt:</strong> ${esc(task.aiCritique.promptToTry)}</li>
          <li><strong>Compare to your evidence:</strong> ${esc(task.aiCritique.compareToEvidence)}</li>
          <li><strong>Note issues:</strong> ${esc(task.aiCritique.noteIssues)}</li>
          <li><strong>Improve with personal input:</strong> ${esc(task.aiCritique.improveWithPersonalInput)}</li>
        </ul>
      </div>`
        : ""
    }
    ${
      task.reflectionPrompt
        ? `<div class="prompt-block"><span class="label">Reflection</span><div class="value">${esc(task.reflectionPrompt)}</div></div>`
        : ""
    }
  </div>`,
  )
  .join("")}

${
  assignment.aiUseRules.length
    ? `<h2>AI use rules</h2><ul>${assignment.aiUseRules.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
    : ""
}

${
  assignment.evidenceChecklist.length
    ? `<h2>Evidence checklist</h2><ul>${assignment.evidenceChecklist.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`
    : ""
}

<h2>Rubric</h2>
<table class="rubric">
  <thead>
    <tr>
      <th>Criterion</th>
      <th>Excellent</th>
      <th>Good</th>
      <th>Satisfactory</th>
      <th>Needs Work</th>
    </tr>
  </thead>
  <tbody>
    ${assignment.rubric
      .map(
        (r) => `
      <tr>
        <td class="criterion">${esc(r.criterion)}</td>
        <td>${esc(r.excellent)}</td>
        <td>${esc(r.good)}</td>
        <td>${esc(r.satisfactory)}</td>
        <td>${esc(r.needsWork)}</td>
      </tr>`,
      )
      .join("")}
  </tbody>
</table>

<h2>Teacher notes</h2>
<dl class="notes-grid">
  ${row("Setup", assignment.teacherNotes.setup)}
  ${row("Setup time", assignment.teacherNotes.setupTime)}
  ${row("Materials", assignment.teacherNotes.materialsNeeded.join(", "))}
  ${row("Common misconceptions", assignment.teacherNotes.commonMisconceptions.join("; "))}
  ${row("Marking guidance", assignment.teacherNotes.markingGuidance)}
  ${row("Support option", assignment.teacherNotes.supportOption)}
  ${row("Extension option", assignment.teacherNotes.extensionOption)}
</dl>

${assignment.parentNote ? `<h2>Parent note</h2><p>${esc(assignment.parentNote)}</p>` : ""}

${
  assignment.studentAiPromptStarters.length
    ? `<h2>Suggested student AI prompts</h2><ul>${assignment.studentAiPromptStarters
        .map((p) => `<li><code>${esc(p)}</code></li>`)
        .join("")}</ul>`
    : ""
}

${
  assignment.partialExemplars.length
    ? `<h2>Partial exemplars</h2>
    ${assignment.partialExemplars
      .map(
        (ex) => `
      <div class="exemplar">
        <div class="prompt-block label">${esc(ex.forCriterion)}</div>
        <div class="exemplar-grid">
          <div><span class="strong-label">Strong:</span> ${esc(ex.strongElement)}</div>
          <div><span class="weak-label">Weak:</span> ${esc(ex.weakElement)}</div>
        </div>
      </div>`,
      )
      .join("")}`
    : ""
}

${
  assignment.optionalWorkbookPages.length
    ? `<h2>Workbook pages</h2>
    ${assignment.optionalWorkbookPages
      .map(
        (page) => `
      <div class="workbook-page">
        <h3>${esc(page.pageTitle)}</h3>
        <p>${esc(page.content)}</p>
        ${page.imagePromptHint ? `<p class="footer-note">Suggested image: ${esc(page.imagePromptHint)}</p>` : ""}
      </div>`,
      )
      .join("")}`
    : ""
}

<div class="footer-note">Generated by Teacher Assistant · annix.co.za</div>
</body>
</html>`;
}

function esc(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cap(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function row(label: string, value: string): string {
  if (!value) return "";
  return `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`;
}
