import type { Assignment } from "@annix/product-data/teacher-assistant";
import { exportAssignmentAsClipboardText } from "./clipboard-export";

export function downloadAssignmentAsPdf(assignment: Assignment): void {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    return;
  }
  const html = renderPrintableHtml(assignment);
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}

function renderPrintableHtml(assignment: Assignment): string {
  const text = exportAssignmentAsClipboardText(assignment);
  const escaped = escapeHtml(text);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(assignment.title)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #111; }
  pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 11pt; }
  h1 { font-size: 18pt; margin-bottom: 0.25em; }
  .meta { color: #555; font-size: 10pt; margin-bottom: 1.5em; }
</style>
</head>
<body>
<h1>${escapeHtml(assignment.title)}</h1>
<div class="meta">${escapeHtml(assignment.subject)} · ${escapeHtml(assignment.topic)} · ages ${escapeHtml(assignment.ageBucket)} · ${escapeHtml(assignment.duration)} · ${escapeHtml(assignment.outputType)} · ${escapeHtml(assignment.difficulty)}</div>
<pre>${escaped}</pre>
</body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
