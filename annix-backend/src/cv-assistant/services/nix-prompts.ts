/**
 * Nix prompt scaffolding for the job posting wizard. Each function returns
 * a `{ system, user }` pair that AiChatService can pass straight to Gemini.
 *
 * Conventions:
 * - JSON-only outputs (no narrative, no markdown).
 * - South-African hiring terminology (ZAR, NQF, SAQA, etc.).
 * - Conservative confidence — better to flag uncertainty than hallucinate.
 */

import type { JobPosting } from "../entities/job-posting.entity";

export interface NixPrompt {
  system: string;
  user: string;
}

export interface NixTitleSuggestionsResponse {
  normalizedTitle: string;
  suggestedTitles: string[];
  seniorityLevel: string | null;
  titleQualityScore: number;
  warning: string | null;
}

export interface NixDescriptionResponse {
  candidateFacingDescription: string;
  responsibilities: string[];
  requirements: string[];
  successMetrics: string[];
  missingInformation: string[];
  improvementSuggestions: string[];
}

export interface NixSkillSuggestion {
  name: string;
  importance: "required" | "preferred";
  proficiency: "basic" | "intermediate" | "advanced" | "expert";
  yearsExperience: number | null;
  evidenceRequired: string | null;
  reasoning: string | null;
}

export interface NixSkillSuggestionsResponse {
  skills: NixSkillSuggestion[];
  notes: string[];
}

const SA_SYSTEM_PREAMBLE =
  "You are Nix, the AI hiring assistant inside the Annix CV Assistant product. " +
  "You help South African employers create high-quality job posts. " +
  "Always respond with strict JSON only — no markdown, no commentary, no code fences. " +
  "Use South African hiring terminology, salary in ZAR per month, NQF / SAQA references where appropriate.";

export function titleSuggestionsPrompt(jobTitle: string): NixPrompt {
  return {
    system: SA_SYSTEM_PREAMBLE,
    user: `Given this job title: "${jobTitle}"

Return JSON with this exact shape:
{
  "normalizedTitle": "string",
  "suggestedTitles": ["string", ...],
  "seniorityLevel": "entry" | "junior" | "mid" | "senior" | "lead" | "manager" | "executive" | null,
  "titleQualityScore": 0-100,
  "warning": "string or null"
}

Rules:
- Prefer commonly-searched South African job titles (e.g. "External Sales Representative", "Boilermaker").
- Avoid vague titles like "Sales", "Manager", "Engineer" — flag them with a warning and suggest 3-5 specific alternatives.
- Do not invent seniority if the input is unclear; return null.
- titleQualityScore: 80+ for specific roles, 30-60 for generic ones, <30 for one-word titles.
- The normalizedTitle should be the most commonly-searched canonical form.`,
  };
}

export function descriptionPrompt(input: {
  title: string;
  industry: string | null;
  city: string | null;
  province: string | null;
  seniorityLevel: string | null;
  workMode: string | null;
  employmentType: string | null;
  mainPurpose: string | null;
  companyContext: string | null;
  successIn3Months: string[];
  successIn12Months: string[];
  skills: Array<{ name: string; importance: string; proficiency: string }>;
}): NixPrompt {
  const skillsText =
    input.skills.length > 0
      ? input.skills.map((s) => `${s.name} (${s.importance}, ${s.proficiency})`).join(", ")
      : "(none provided yet)";

  return {
    system: SA_SYSTEM_PREAMBLE,
    user: `Synthesise a candidate-facing job description from this input:

Title: ${input.title}
Industry: ${input.industry || "(unspecified)"}
Location: ${input.city || "(unspecified)"}, ${input.province || "(unspecified)"}
Seniority: ${input.seniorityLevel || "(unspecified)"}
Work mode: ${input.workMode || "(unspecified)"}
Employment type: ${input.employmentType || "(unspecified)"}
Main purpose: ${input.mainPurpose || "(unspecified)"}
Company context: ${input.companyContext || "(unspecified)"}
Success in 3 months: ${input.successIn3Months.join(" | ") || "(none)"}
Success in 12 months: ${input.successIn12Months.join(" | ") || "(none)"}
Skills: ${skillsText}

Return JSON with this exact shape:
{
  "candidateFacingDescription": "string — markdown OK, 200-400 words, professional, direct, no corporate fluff",
  "responsibilities": ["string", ...],
  "requirements": ["string", ...],
  "successMetrics": ["string — concrete outcome, ideally measurable", ...],
  "missingInformation": ["string — what the user should add to make the post stronger", ...],
  "improvementSuggestions": ["string", ...]
}

Tone: professional, direct, suitable for South African job boards (Pnet, Careers24, LinkedIn). Avoid US-specific terms like "401k". Use ZAR for any salary references. Do not invent salary numbers — if not provided, omit them.`,
  };
}

export function skillSuggestionsPrompt(input: {
  title: string;
  industry: string | null;
  seniorityLevel: string | null;
  mainPurpose: string | null;
  successIn3Months: string[];
  successIn12Months: string[];
  existingSkills: Array<{ name: string }>;
}): NixPrompt {
  const existing =
    input.existingSkills.length > 0 ? input.existingSkills.map((s) => s.name).join(", ") : "(none)";

  return {
    system: SA_SYSTEM_PREAMBLE,
    user: `Suggest a structured set of required and preferred skills for this role.

Title: ${input.title}
Industry: ${input.industry || "(unspecified)"}
Seniority: ${input.seniorityLevel || "(unspecified)"}
Main purpose: ${input.mainPurpose || "(unspecified)"}
Success in 3 months: ${input.successIn3Months.join(" | ") || "(none)"}
Success in 12 months: ${input.successIn12Months.join(" | ") || "(none)"}
Already-listed skills: ${existing}

Return JSON with this exact shape:
{
  "skills": [
    {
      "name": "string",
      "importance": "required" | "preferred",
      "proficiency": "basic" | "intermediate" | "advanced" | "expert",
      "yearsExperience": number | null,
      "evidenceRequired": "string — how an applicant could demonstrate this, or null",
      "reasoning": "string — why this skill matters for THIS role"
    },
    ...
  ],
  "notes": ["string — optional caveats", ...]
}

Rules:
- Aim for 6-10 skills total. Mix of required (~60%) and preferred (~40%).
- Skip skills already listed in "Already-listed skills" — suggest complementary ones.
- For senior roles, lean towards advanced/expert proficiency.
- For entry/junior roles, basic/intermediate is appropriate.
- evidenceRequired is concrete: "Has managed their own pipeline", "Holds an ECSA registration", etc.
- If the seniority and yearsExperience combination is unrealistic (e.g. expert + 1 year), don't suggest it.
- Use SA-specific certifications where relevant (ECSA, SACPCMP, SAICA, SAIPA, etc.).`,
  };
}

/**
 * Helper: extract Gemini's JSON content even if the model wrapped it in
 * a code fence or added stray narrative. Throws if no parseable JSON
 * object can be found.
 */
export function parseNixJson<T>(content: string): T {
  const trimmed = content.trim();
  // Strip ```json … ``` fences if present
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;

  // Find first balanced JSON object/array
  const firstBrace = candidate.indexOf("{");
  const firstBracket = candidate.indexOf("[");
  const start =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
        ? firstBrace
        : Math.min(firstBrace, firstBracket);

  if (start < 0) {
    throw new Error("Nix did not return parseable JSON");
  }

  const matchingClose = (() => {
    const opener = candidate[start];
    const closer = opener === "{" ? "}" : "]";
    let depth = 0;
    for (let i = start; i < candidate.length; i++) {
      if (candidate[i] === opener) depth++;
      if (candidate[i] === closer) {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  })();

  if (matchingClose < 0) {
    throw new Error("Nix returned an incomplete JSON document");
  }

  const slice = candidate.slice(start, matchingClose + 1);
  return JSON.parse(slice) as T;
}

export function summariseSuccessMetrics(posting: JobPosting): { in3: string[]; in12: string[] } {
  const metrics = posting.successMetrics || [];
  const in3 = metrics.filter((m) => m.timeframe === "3_months").map((m) => m.metric);
  const in12 = metrics.filter((m) => m.timeframe === "12_months").map((m) => m.metric);
  return { in3, in12 };
}
