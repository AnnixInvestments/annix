import type { AssignmentInput } from "./assignment";
import type { AssignmentSection } from "./enums";
import { templateForSubject } from "./subjectTemplates";

export const SYSTEM_PROMPT = `You are an expert education designer.
Your job is to create process-based assignments for students aged 12-18.
The assignment must not rely on simple factual recall. It must require the student to show evidence, reasoning, comparison, reflection, and original thinking.
Students may use AI, but the assignment must require them to critique, verify, or improve AI output rather than copy it.
The output must be practical for a teacher to use immediately.

Always create:
1. A student-facing assignment brief (1-2 paragraphs, engaging hook)
2. Step-by-step tasks — exactly 4 to 6 distinct tasks, each with a clear evidence requirement
3. Evidence requirements (concrete artefacts: photos, measurements, sketches, interview notes)
4. Controlled AI-use instructions (a structured aiCritique sub-object on every task when AI use is allowed)
5. Reflection questions (per task)
6. A 4-level marking rubric (excellent / good / satisfactory / needsWork) with EXACTLY 4 to 5 criteria — every criterion MUST have all four levels filled with at least one full sentence each
7. Teacher notes including setupTime estimate, materialsNeeded list (3+ items), 2+ commonMisconceptions, markingGuidance, supportOption, extensionOption
8. parentNote (1-2 sentences), 3-5 studentAiPromptStarters, 1-2 partialExemplars

Quality bar:
- Prioritise tasks that cannot be fully completed by AI alone — prefer local photos, personal measurements, live observations, and interviews with people the student knows.
- Use active voice and a motivational tone appropriate for the age group.
- Keep language age-appropriate.
- Avoid these phrasings: "research the topic", "research online", "explore this topic", "use the internet", "find information about" — they invite copy-paste AI completion.
- Avoid vague tasks. Avoid generic worksheets.
- Tasks must be DISTINCT — do not repeat the same instruction with minor wording changes.
- Each task's studentInstruction must be at least 2 full sentences (60+ chars).

JSON OUTPUT RULES — these are the most important:
- Return ONE valid JSON object and nothing else. No prose before, no prose after, no markdown fences.
- All string values MUST be valid JSON strings. Use straight double quotes ("), never curly quotes (" "), never single quotes.
- ESCAPE every double quote inside a string value as \\". For example: "She said \\"hello\\" loudly."
- ESCAPE every newline inside a string value as \\n. Do not put literal line breaks inside string values.
- Do not put unescaped backslashes in strings. Escape them as \\\\.
- Do not use trailing commas after the last array element or object property.
- All arrays must close with ]. All objects must close with }.
- Do not use markdown formatting (**bold**, *italic*, [links]) inside string values — the output goes into a database, not a markdown renderer.
- Keep the response compact: prefer concise, vivid language over long-winded prose to avoid truncation.`;

export function buildUserPrompt(input: AssignmentInput): string {
  const template = templateForSubject(input.subject);
  const differentiation =
    input.differentiation.length > 0
      ? `Differentiate for: ${input.differentiation.join(", ")}.`
      : "";
  const aiUse = input.allowAiUse
    ? "Students may use AI, but every task must include a structured aiCritique sub-object."
    : "Students must NOT use AI for this assignment. Set aiCritique to null on every task and aiUseRules to a single rule stating AI is not permitted for this assignment.";

  return [
    "Create a process-based assignment using the details below.",
    "",
    `Subject: ${input.subject}`,
    `Topic: ${input.topic}`,
    `Student age bucket: ${input.ageBucket} (specific age: ${input.studentAge})`,
    `Duration: ${input.duration}`,
    `Output type: ${input.outputType}`,
    `Difficulty: ${input.difficulty}`,
    input.learningObjective ? `Learning objective: ${input.learningObjective}` : "",
    differentiation,
    "",
    `Subject-specific evidence types to draw from: ${template.evidenceTypes.join(", ")}.`,
    `Subject-specific reasoning style: ${template.reasoningStyle}.`,
    `Subject-specific AI challenge: ${template.aiChallenge}.`,
    "",
    aiUse,
    "",
    "Requirements:",
    "- The assignment must include real-world input or student-created evidence.",
    "- The student must explain their reasoning.",
    input.allowAiUse
      ? "- The student must compare their own thinking with an AI-generated answer."
      : "- The student must show their own thinking step by step without AI.",
    "- The final output must be suitable for the selected age and difficulty.",
    "- Include a clear 4-level marking rubric.",
    "- Include teacher notes with setupTime, materialsNeeded, commonMisconceptions, markingGuidance, supportOption, extensionOption.",
    "- Include a short parentNote, 3-5 studentAiPromptStarters, and at least one partialExemplar.",
    "- Return valid JSON only.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildRetryPrompt(input: AssignmentInput, failureMessages: string[]): string {
  const base = buildUserPrompt(input);
  const failureList = failureMessages.map((m) => `- ${m}`).join("\n");
  return `${base}

The previous attempt failed validation with these issues. Fix every one of them in the next response:
${failureList}`;
}

export function buildSectionRegeneratePrompt(
  input: AssignmentInput,
  section: AssignmentSection,
  existingAssignmentJson: string,
): string {
  return [
    `Regenerate ONLY the "${section}" section of the assignment below, keeping all other sections unchanged.`,
    "Match the same JSON shape but include only the regenerated section in the response.",
    "",
    `Original input: subject=${input.subject}, topic=${input.topic}, age=${input.ageBucket}, duration=${input.duration}, outputType=${input.outputType}, difficulty=${input.difficulty}.`,
    "",
    "Existing assignment for context:",
    existingAssignmentJson,
  ].join("\n");
}
