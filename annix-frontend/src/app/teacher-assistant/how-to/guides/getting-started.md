---
title: Getting started with Teacher Assistant
slug: teacher-assistant-getting-started
category: Workflow
roles: [admin]
order: 1
tags: [teacher-assistant, ai, assignments, geography, science]
lastUpdated: 2026-05-03
summary: Generate, edit, and export a process-based AI-aware assignment for high-school students.
readingMinutes: 3
relatedPaths:
  - annix-frontend/src/app/teacher-assistant/page.tsx
  - annix-frontend/src/app/teacher-assistant/components/TeacherAssistantForm.tsx
  - annix-frontend/src/app/teacher-assistant/components/AssignmentPreview.tsx
  - annix-backend/src/teacher-assistant/teacher-assistant.controller.ts
---

## What is it

Teacher Assistant generates ready-to-use, **process-based** assignments for high-school students aged 12–18. The assignment grades thinking, evidence, and AI critique — not recall. Students may use AI but must compare AI's answer with their own evidence.

MVP subjects: **Geography** and **Science**.

## How it works

1. **Open** `/teacher-assistant` (admin login required for v1).
2. **Fill the form**: subject, topic, age bucket (12–14 / 14–16 / 16–18), duration, output type (poster / workbook page / report / lab worksheet / presentation), difficulty, optional differentiation (ESL / Advanced / IEP), AI use yes/no.
3. **Click Generate**. The backend calls Gemini, validates the response, and retries (up to 2 retries) if the AI returns a vague or banned-phrase output.
4. **Edit any section inline**. Each section shows a "Restore original" button if you change it.
5. **Regenerate one section** (brief, tasks, rubric) without re-rolling the whole assignment.
6. **Copy** the assignment to your clipboard for Google Classroom / Moodle, or **Export PDF** for handouts.

## Rules

- **Gemini-only**: all AI calls go through `AiChatService` per CLAUDE.md.
- **Validation gate**: every assignment must have ≥4 tasks, ≥4 rubric criteria with all 4 levels (Excellent / Good / Satisfactory / Needs Work), ≥3 evidence checklist items, and avoid banned lazy phrases.
- **Caching**: identical generations within 5 minutes return the cached result to avoid re-billing the AI.
- **Subjects**: only Geography and Science are fully supported in v1. Other subjects can be added later by extending `subjectTemplates` in `@annix/product-data/teacher-assistant`.

## Tips

- Start with a specific topic ("cumulus cloud formation in Johannesburg summer") rather than a generic one ("clouds"). Specificity drives better generation.
- For mixed-ability classes, set difficulty to "standard" and tick the "Advanced" or "IEP" differentiation options — the generator includes scaffolding accordingly.
- The "Suggested student AI prompts" section is for the **student**, not the teacher — print it as part of the handout so students have starter prompts to try.
- If the rubric feels off, click "Regenerate" on just the rubric section. Your edits to other sections are preserved.
