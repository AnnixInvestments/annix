import type { Assignment } from "@annix/product-data/teacher-assistant";
import { ANNIX_BRAND } from "./branding";

export function renderAssignmentHtml(assignment: Assignment): string {
  const c = ANNIX_BRAND.colors;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(assignment.title)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.55;
    color: ${c.text};
    margin: 0;
    font-size: 10.5pt;
  }
  .page { padding: 18mm; }
  .brand-bar {
    background: ${c.primaryNavy};
    color: ${c.white};
    padding: 14px 18mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand-bar .brand-left { display: flex; align-items: center; gap: 10px; }
  .brand-mark {
    width: 32px; height: 32px;
    background: ${c.accentOrange};
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; color: ${c.white}; font-size: 16pt;
  }
  .brand-name { font-weight: 700; font-size: 13pt; letter-spacing: 0.02em; }
  .brand-tagline { font-size: 9.5pt; opacity: 0.85; margin-left: 2px; }
  .brand-app { font-size: 9.5pt; opacity: 0.85; }
  h1 {
    font-size: 22pt; margin: 0 0 4px;
    color: ${c.primaryNavy};
    font-weight: 700;
  }
  h2 {
    font-size: 13pt;
    margin: 1.2em 0 0.5em;
    color: ${c.primaryNavy};
    border-bottom: 2px solid ${c.accentOrange};
    padding-bottom: 0.2em;
    font-weight: 700;
  }
  h3 { font-size: 11pt; margin: 0.6em 0 0.2em; color: ${c.text}; }
  .meta { color: ${c.gray}; font-size: 9.5pt; margin-bottom: 1em; }
  .brief {
    background: #f5f6ff;
    padding: 12px 14px;
    border-left: 4px solid ${c.accentOrange};
    border-radius: 4px;
  }
  ul, ol { padding-left: 20px; margin: 0.4em 0; }
  li { margin: 0.15em 0; }
  .task {
    border-left: 3px solid ${c.primaryNavy};
    padding: 8px 12px;
    margin: 12px 0;
    background: #fafbff;
    page-break-inside: avoid;
  }
  .task-head { color: ${c.primaryNavy}; font-weight: 700; font-size: 10.5pt; margin-bottom: 4px; }
  .task-step { color: ${c.accentOrange}; font-weight: 700; }
  .evidence-tag {
    display: inline-block;
    background: ${c.primaryNavy};
    color: ${c.white};
    border-radius: 999px;
    padding: 2px 9px;
    margin: 2px 3px 2px 0;
    font-size: 8.5pt;
  }
  .ai-critique {
    background: #fff6e5;
    border-left: 3px solid ${c.accentOrange};
    border-radius: 4px;
    padding: 8px 10px;
    margin-top: 6px;
    font-size: 10pt;
  }
  .ai-critique strong { color: ${c.primaryNavy}; }
  .prompt-block { margin-top: 6px; font-size: 10pt; }
  .prompt-block .label {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${c.gray};
    font-weight: 600;
  }
  .prompt-block .value { font-style: italic; color: ${c.grayDark}; }
  table.rubric {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  table.rubric th {
    background: ${c.primaryNavy};
    color: ${c.white};
    text-align: left;
    padding: 6px 8px;
    border: 1px solid ${c.primaryNavyDark};
    font-weight: 600;
  }
  table.rubric td {
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    vertical-align: top;
  }
  table.rubric td.criterion {
    font-weight: 700;
    color: ${c.primaryNavy};
    background: #f5f6ff;
  }
  .notes-grid {
    display: grid;
    grid-template-columns: 130px 1fr;
    gap: 4px 12px;
    font-size: 10pt;
  }
  .notes-grid dt { font-weight: 700; color: ${c.primaryNavy}; }
  .notes-grid dd { margin: 0; color: ${c.grayDark}; }
  .exemplar {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 8px;
    page-break-inside: avoid;
  }
  .exemplar-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 4px;
    font-size: 10pt;
  }
  .strong-label { color: #047857; font-weight: 700; }
  .weak-label { color: #b91c1c; font-weight: 700; }
  .workbook-page {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 8px;
    page-break-inside: avoid;
  }
  .footer-bar {
    margin-top: 1.5em;
    padding: 10px 18mm;
    border-top: 2px solid ${c.accentOrange};
    background: ${c.primaryNavy};
    color: ${c.white};
    font-size: 9pt;
    display: flex;
    justify-content: space-between;
  }
  .footer-bar .right { opacity: 0.85; }
  code {
    font-family: "Consolas", "Monaco", monospace;
    background: #f5f6ff;
    padding: 1px 5px;
    border-radius: 3px;
    color: ${c.primaryNavy};
    font-size: 9.5pt;
  }
</style>
</head>
<body>

<div class="brand-bar">
  <div class="brand-left">
    <div class="brand-mark">A</div>
    <div>
      <div class="brand-name">${ANNIX_BRAND.name}</div>
      <div class="brand-tagline">${esc(ANNIX_BRAND.appName)}</div>
    </div>
  </div>
  <div class="brand-app">${esc(ANNIX_BRAND.domain)}</div>
</div>

<div class="page">

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
        .map((c2) => `<li>${esc(c2)}</li>`)
        .join("")}</ul>`
    : ""
}

<h2>Tasks</h2>
${assignment.tasks
  .map(
    (task) => `
  <div class="task">
    <div class="task-head"><span class="task-step">Step ${task.step}:</span> ${esc(task.title)}</div>
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
    ? `<h2>Evidence checklist</h2><ul>${assignment.evidenceChecklist.map((c2) => `<li>${esc(c2)}</li>`).join("")}</ul>`
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
        ${page.imagePromptHint ? `<p style="color:${c.gray};font-size:9pt;margin-top:4px;font-style:italic">Suggested image: ${esc(page.imagePromptHint)}</p>` : ""}
      </div>`,
      )
      .join("")}`
    : ""
}

</div>

<div class="footer-bar">
  <div>Generated by ${ANNIX_BRAND.name} ${esc(ANNIX_BRAND.appName)}</div>
  <div class="right">${esc(ANNIX_BRAND.domain)}</div>
</div>

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
