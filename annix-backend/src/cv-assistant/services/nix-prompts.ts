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
  /** 1-2 sentence pitch a candidate would see — lets the company user
   *  preview how this title reads before committing to it. */
  samplePreview: string;
  sampleResponsibilities: string[];
  /** One-sentence summary of WHY this title got the score it did. */
  scoreReason: string;
  /** 1-3 concrete suggestions for raising the score, or empty if the
   *  title is already at 95+. Helps the user decide stick-or-change. */
  improvementTips: string[];
}

export interface NixDescriptionResponse {
  candidateFacingDescription: string;
  responsibilities: string[];
  requirements: string[];
  successMetrics: string[];
  missingInformation: string[];
  improvementSuggestions: string[];
}

export interface NixOutcomesDraftResponse {
  mainPurpose: string;
  companyContext: string;
  description: string;
  successIn3Months: string[];
  successIn12Months: string[];
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
  /** Minimum years of total relevant experience for the role. */
  minExperienceYears: number | null;
  /** SA-style education line (e.g. "Matric + NQF6 in Mechanical Engineering"). */
  requiredEducation: string | null;
  /** Concrete certifications a candidate must hold (ECSA Pr Eng, SAICA, etc.). */
  requiredCertifications: string[];
}

export interface NixRequirementsSuggestionsResponse {
  minExperienceYears: number | null;
  requiredEducation: string | null;
  requiredCertifications: string[];
  reasoning: string | null;
}

export interface NixQualityScoreResponse {
  totalScore: number;
  clarity: number;
  salaryCompetitiveness: number;
  candidateAttraction: number;
  screeningStrength: number;
  matchingReadiness: number;
  inclusivity: number;
  criticalIssues: string[];
  recommendedFixes: string[];
  flaggedTerms: Array<{
    term: string;
    category: "gendered" | "age_coded" | "ableist" | "national_origin" | "other";
    replacement: string;
    explanation: string;
  }>;
  readyToPost: boolean;
}

export interface NixScreeningQuestionsResponse {
  questions: Array<{
    question: string;
    questionType: "yes_no" | "short_text" | "multiple_choice" | "numeric";
    options?: string[];
    disqualifyingAnswer?: string | null;
    weight: number;
    reasoning: string;
  }>;
  notes: string[];
}

export interface NixSalaryGuidanceResponse {
  suggestedMin: number;
  suggestedMax: number;
  marketMedian: number;
  competitiveness: "low" | "medium" | "strong";
  confidence: number;
  warnings: string[];
  explanation: string;
}

export interface NixSourcingQueriesResponse {
  linkedin: string;
  indeed: string;
  google: string;
  explanations: string[];
}

export interface NixVolumePredictionResponse {
  expectedApplicants: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  factors: string[];
  warnings: string[];
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
  "warning": "string or null",
  "samplePreview": "string — 1-2 sentence candidate-facing pitch tailored to THIS title",
  "sampleResponsibilities": ["string", ...],
  "scoreReason": "string — one sentence on WHY this score; reference the specific aspect of the title that drove it",
  "improvementTips": ["string", ...]
}

Rules:
- Prefer commonly-searched South African job titles (e.g. "External Sales Representative", "Boilermaker").
- Avoid vague titles like "Sales", "Manager", "Engineer" — flag them with a warning and suggest 3-5 specific alternatives.
- Do not invent seniority if the input is unclear; return null.
- titleQualityScore: 80+ for specific roles, 30-60 for generic ones, <30 for one-word titles.
- The normalizedTitle should be the most commonly-searched canonical form.
- samplePreview: 30-60 words, written for a candidate browsing job boards. Make the difference between a vague title (e.g. "Sales") and a sharp one (e.g. "External Sales Representative") obvious — vague titles should produce vague pitches; sharp titles should reference concrete day-to-day work.
- sampleResponsibilities: 3 short bullet points typical for THIS role. Keep them recognisable to SA candidates.
- scoreReason: a single sentence explaining why this title got the score it did. Be concrete — name the aspect (e.g. "lacks seniority cue", "doesn't say external/internal", "more searchable as 'Sales Consultant' on Pnet"). Don't restate the score.
- improvementTips: 1-3 short bullets the user could action to raise the score. Empty array if the score is already 95+. Each tip should be actionable, not abstract — "Add 'Senior' for a sharper match" not "make it more specific".`,
  };
}

export function outcomesDraftPrompt(input: {
  title: string;
  industry: string | null;
  city: string | null;
  province: string | null;
  seniorityLevel: string | null;
  workMode: string | null;
  employmentType: string | null;
  companyName: string | null;
}): NixPrompt {
  return {
    system: SA_SYSTEM_PREAMBLE,
    user: `Draft Step 2 of a job-posting wizard from these Step 1 basics:

Title: ${input.title}
Industry: ${input.industry || "(unspecified)"}
Location: ${input.city || "(unspecified)"}, ${input.province || "(unspecified)"}
Seniority: ${input.seniorityLevel || "(unspecified)"}
Work mode: ${input.workMode || "(unspecified)"}
Employment type: ${input.employmentType || "(unspecified)"}
Company name: ${input.companyName || "(unspecified)"}

Return JSON with this exact shape:
{
  "mainPurpose": "string — ONE sentence on why this role exists",
  "companyContext": "string — a SHORT paragraph (2-3 sentences) the user can edit. Reference the industry and location if known. Use [bracketed placeholders] like [team size] or [year founded] for facts you cannot infer.",
  "description": "string — 120-200 words covering day-to-day responsibilities and what the candidate would actually do. Markdown OK. No corporate fluff. Written as a draft the user will tweak.",
  "successIn3Months": ["string", "string", "string"],
  "successIn12Months": ["string", "string", "string"]
}

Rules:
- successIn3Months and successIn12Months must each have exactly 3 entries — concrete, ideally measurable outcomes (e.g. "Closed first R250k of new business", "Onboarded the existing client base and identified top 5 growth accounts"). Avoid generic phrases like "Be productive" or "Settle in".
- 3-month outcomes = ramp / proof / first deliverables. 12-month outcomes = full ownership / measurable impact.
- mainPurpose: speak in active voice. "Drive new external sales for our industrial rubber products in Gauteng." — NOT "The purpose of this role is to…".
- description: avoid bullet lists for responsibilities — prefer 2-3 short paragraphs. The wizard offers a "Help me write this" button later that does a polished candidate-facing version, so this draft can be working-level.
- companyContext: do NOT invent specifics about the company (team size, founding year, awards). Use placeholders the user fills in. Industry + location can be referenced from the input.
- South African context: ZAR, NQF, SAQA where relevant. Avoid US-isms.`,
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
    user: `Build the full Skills & Requirements section for this role. You MUST populate every field below — skills, minExperienceYears, requiredEducation and requiredCertifications are all required outputs (not optional). The user is relying on you to fill all four; do not omit any.

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
  "notes": ["string — optional caveats", ...],
  "minExperienceYears": number | null,
  "requiredEducation": "string or null",
  "requiredCertifications": ["string", ...]
}

Rules:
- Aim for 6-10 skills total. Mix of required (~60%) and preferred (~40%).
- Skip skills already listed in "Already-listed skills" — suggest complementary ones.
- For senior roles, lean towards advanced/expert proficiency.
- For entry/junior roles, basic/intermediate is appropriate.
- evidenceRequired is concrete: "Has managed their own pipeline", "Holds an ECSA registration", etc.
- If the seniority and yearsExperience combination is unrealistic (e.g. expert + 1 year), don't suggest it.
- Use SA-specific certifications where relevant (ECSA, SACPCMP, SAICA, SAIPA, etc.).
- minExperienceYears: a single integer for total relevant years expected for the role. Match the seniority — entry 0-1, junior 1-3, mid 3-6, senior 6-10, lead/manager 8-12, executive 10+. Return null only if seniority is genuinely unspecified.
- requiredEducation: ONE short line under 200 characters — e.g. "Matric (NSC)", "Matric + NQF6 in Mechanical Engineering", "BCom Accounting (NQF7)", "Trade Test (Section 13/26D)". Use NQF levels where appropriate. NO multi-sentence explanations. Return null only if no formal education is required for the role.
- requiredCertifications: 0-4 concrete certifications a candidate must HOLD (not nice-to-have — those go in skills). Each entry under 100 characters. Examples: "ECSA Pr Eng", "SAICA registered CA(SA)", "Code 10 (C1) driver's licence", "First Aid Level 1". Use empty array if none are essential.`,
  };
}

export function requirementsSuggestionsPrompt(input: {
  title: string;
  industry: string | null;
  seniorityLevel: string | null;
  mainPurpose: string | null;
  skills: Array<{ name: string; importance: string }>;
}): NixPrompt {
  const skillsText =
    input.skills.length > 0
      ? input.skills.map((s) => `${s.name} (${s.importance})`).join(", ")
      : "(none specified yet)";

  return {
    system: SA_SYSTEM_PREAMBLE,
    user: `Decide the minimum years of experience, required education and required certifications for this role.

Title: ${input.title}
Industry: ${input.industry || "(unspecified)"}
Seniority: ${input.seniorityLevel || "(unspecified)"}
Main purpose: ${input.mainPurpose || "(unspecified)"}
Skills already listed: ${skillsText}

Return JSON with this EXACT shape — every key is required:
{
  "minExperienceYears": number,
  "requiredEducation": "string",
  "requiredCertifications": ["string", ...],
  "reasoning": "string"
}

Rules:
- minExperienceYears: a single non-negative integer. Calibrate to seniority — entry 0-1, junior 1-3, mid 3-6, senior 6-10, lead 8-12, manager 7-12, executive 10+. Pick the lower end of the range unless the title or main purpose suggests deeper experience. NEVER return null — pick a sensible default if unclear.
- requiredEducation: ONE short line, max 180 characters, no multi-sentence explanations. Examples: "Matric (NSC)", "Matric + NQF6 in Mechanical Engineering", "BCom Accounting (NQF7)", "Trade Test (Section 13/26D)". Use NQF levels where appropriate. If genuinely no formal qualification is needed, return "Matric (NSC)" rather than null — entry-level SA jobs almost always assume Matric.
- requiredCertifications: array of 0-4 concrete certifications a candidate must HOLD (not nice-to-have — those belong in skills). Each entry under 100 characters. Examples: "ECSA Pr Eng", "SAICA registered CA(SA)", "Code 10 (C1) driver's licence", "First Aid Level 1". Empty array is fine if none are essential, but prefer to include any that genuinely apply.
- reasoning: ONE short sentence (under 200 chars) explaining the choices. Will not be persisted; the user reads it as a tooltip.
- South-African context: NQF / SAQA / SARS / ECSA / SACPCMP / SAICA / SAIPA where relevant. Avoid US qualifications.`,
  };
}

export function qualityScorePrompt(input: {
  title: string;
  industry: string | null;
  seniorityLevel: string | null;
  city: string | null;
  province: string | null;
  employmentType: string | null;
  workMode: string | null;
  description: string | null;
  responsibilities: string[];
  successIn3Months: string[];
  successIn12Months: string[];
  skills: Array<{
    name: string;
    importance: string;
    proficiency: string;
    yearsExperience: number | null;
  }>;
  screeningQuestions: Array<{ question: string; type: string }>;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
}): NixPrompt {
  const skillSummary =
    input.skills.length > 0
      ? input.skills
          .map(
            (s) =>
              `${s.name} (${s.importance}/${s.proficiency}${s.yearsExperience ? `/${s.yearsExperience}yr` : ""})`,
          )
          .join(", ")
      : "(none)";
  const salary =
    input.salaryMin || input.salaryMax
      ? `${input.salaryCurrency} ${input.salaryMin ?? "?"} - ${input.salaryMax ?? "?"} per month`
      : "(unset)";

  return {
    system: SA_SYSTEM_PREAMBLE,
    user: `Score this job posting 0-100 across six dimensions and flag inclusivity issues.

Title: ${input.title}
Industry: ${input.industry || "(unspecified)"}
Seniority: ${input.seniorityLevel || "(unspecified)"}
Location: ${input.city || "(unspecified)"}, ${input.province || "(unspecified)"}
Employment: ${input.employmentType || "(unspecified)"} / ${input.workMode || "(unspecified)"}
Salary: ${salary}
Description: ${input.description || "(empty)"}
Responsibilities: ${input.responsibilities.join(" | ") || "(none)"}
Success in 3 months: ${input.successIn3Months.join(" | ") || "(none)"}
Success in 12 months: ${input.successIn12Months.join(" | ") || "(none)"}
Skills: ${skillSummary}
Screening questions: ${input.screeningQuestions.length} configured

Return JSON with this exact shape:
{
  "totalScore": 0-100,
  "clarity": 0-10,
  "salaryCompetitiveness": 0-10,
  "candidateAttraction": 0-10,
  "screeningStrength": 0-10,
  "matchingReadiness": 0-10,
  "inclusivity": 0-10,
  "criticalIssues": ["string", ...],
  "recommendedFixes": ["string", ...],
  "flaggedTerms": [
    {
      "term": "the exact phrase as written",
      "category": "gendered" | "age_coded" | "ableist" | "national_origin" | "other",
      "replacement": "suggested replacement",
      "explanation": "one sentence why"
    },
    ...
  ],
  "readyToPost": boolean
}

Scoring rules:
- clarity: title specificity, description completeness (>=200 words = good), readability
- salaryCompetitiveness: ZAR + per month is good. Missing range = penalty. We'll add Adzuna data in Phase 5.
- candidateAttraction: outcomes, success metrics, benefits, work mode clarity
- screeningStrength: 4-8 questions = good; 0 = penalty
- matchingReadiness: structured skills with evidence prompts and proficiency = good
- inclusivity: scan for gendered ("salesman", "manpower", "rockstar", "ninja"), age-coded ("young", "energetic", "digital native"), ableist ("must be able-bodied" without justification), national-origin ("native English speaker"). Suggest neutral replacements.
- totalScore is the weighted sum. Cap each dimension at 10; total is roughly the sum * 10/6.
- readyToPost = true only if totalScore >= 70 AND no criticalIssues.

Be honest. Better to flag issues than pretend everything's perfect.`,
  };
}

export function screeningQuestionsPrompt(input: {
  title: string;
  seniorityLevel: string | null;
  mainPurpose: string | null;
  skills: Array<{ name: string; importance: string; yearsExperience: number | null }>;
  successIn3Months: string[];
}): NixPrompt {
  const skills =
    input.skills.length > 0
      ? input.skills
          .map(
            (s) =>
              `${s.name} (${s.importance}${s.yearsExperience ? `, ${s.yearsExperience}yr` : ""})`,
          )
          .join(", ")
      : "(none)";

  return {
    system: SA_SYSTEM_PREAMBLE,
    user: `Generate 4-8 screening questions to filter applicants for this role.

Title: ${input.title}
Seniority: ${input.seniorityLevel || "(unspecified)"}
Main purpose: ${input.mainPurpose || "(unspecified)"}
Skills: ${skills}
Success in 3 months: ${input.successIn3Months.join(" | ") || "(none)"}

Return JSON with this exact shape:
{
  "questions": [
    {
      "question": "string — answerable in <15 seconds",
      "questionType": "yes_no" | "short_text" | "multiple_choice" | "numeric",
      "options": ["string", ...] | undefined,
      "disqualifyingAnswer": "string or null",
      "weight": 1-10,
      "reasoning": "why this question matters"
    },
    ...
  ],
  "notes": ["string — caveats or framing", ...]
}

Rules:
- Cover hard requirements first (years experience, key certifications, location/right-to-work).
- Use disqualifyingAnswer conservatively — over-filtering is worse than under-filtering.
- Mix yes_no (most efficient) with short_text only where free-text is essential.
- For multiple_choice, give 3-5 plausible options.
- Weight: must-have requirements 8-10, nice-to-have 3-6.
- Use SA-relevant phrasing ("right to work in South Africa", "valid driver's licence with own vehicle", etc.).`,
  };
}

export function salaryGuidancePrompt(input: {
  title: string;
  industry: string | null;
  province: string | null;
  city: string | null;
  seniorityLevel: string | null;
  employmentType: string | null;
  workMode: string | null;
  yearsExperienceMin: number | null;
  currentMin: number | null;
  currentMax: number | null;
  currency: string;
  benefits: string[];
  commissionStructure: string | null;
  benchmark?: {
    p25: number | null;
    p50: number | null;
    p75: number | null;
    sampleSize: number;
    source: string;
    confidence: number;
  } | null;
}): NixPrompt {
  const benchmarkBlock = input.benchmark
    ? `

Live SA market benchmark (source: ${input.benchmark.source}, sample size: ${input.benchmark.sampleSize}, confidence: ${input.benchmark.confidence}):
- p25: ${input.benchmark.p25 ?? "(unknown)"} ZAR/month
- p50 (median): ${input.benchmark.p50 ?? "(unknown)"} ZAR/month
- p75: ${input.benchmark.p75 ?? "(unknown)"} ZAR/month
Use these numbers as the primary anchor for your recommendation. Your suggestedMin/suggestedMax/marketMedian should respect them. Increase confidence to 0.85+ when sampleSize >= 20.`
    : "";

  return {
    system: SA_SYSTEM_PREAMBLE,
    user: `Recommend a realistic monthly salary band for this South African role using your knowledge of the SA labour market in 2026.${benchmarkBlock}

Role:
Title: ${input.title}
Industry: ${input.industry || "(unspecified)"}
Seniority: ${input.seniorityLevel || "(unspecified)"}
Location: ${input.city || "(unspecified)"}, ${input.province || "(unspecified)"}
Employment: ${input.employmentType || "(unspecified)"} / ${input.workMode || "(unspecified)"}
Years experience required: ${input.yearsExperienceMin ?? "unspecified"}
Current proposed range: ${input.currency} ${input.currentMin ?? "?"} - ${input.currentMax ?? "?"} per month
Benefits: ${input.benefits.length > 0 ? input.benefits.join(", ") : "(none listed)"}
Commission: ${input.commissionStructure ?? "(none)"}

Return JSON with this exact shape:
{
  "suggestedMin": number,
  "suggestedMax": number,
  "marketMedian": number,
  "competitiveness": "low" | "medium" | "strong",
  "confidence": 0-1,
  "warnings": ["string", ...],
  "explanation": "1-2 sentence rationale"
}

Rules:
- All amounts in ZAR per month, gross of tax.
- competitiveness compares the user's currentMin/currentMax against your suggested range and SA market median.
  - "low" if currentMin < suggested 25th percentile
  - "medium" if currentMin is between p25 and p50
  - "strong" if currentMin >= suggested median
- confidence: 0.8+ for very common SA roles, 0.5-0.7 for niche, <0.5 for highly specialised. Be honest if you have low data.
- warnings: include "below market median" if applicable; flag if commission structure is unrealistic, etc.
- Don't pretend certainty. Phase 5b will replace this with Adzuna SA cache data.`,
  };
}

export function sourcingQueriesPrompt(input: {
  title: string;
  normalizedTitle: string | null;
  city: string | null;
  province: string | null;
  industry: string | null;
  seniorityLevel: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
}): NixPrompt {
  return {
    system: SA_SYSTEM_PREAMBLE,
    user: `Generate Boolean search strings for sourcing passive candidates outside our application funnel.

Role:
Title: ${input.title}
Normalised: ${input.normalizedTitle ?? "(none)"}
Industry: ${input.industry ?? "(unspecified)"}
Seniority: ${input.seniorityLevel ?? "(unspecified)"}
Location: ${input.city ?? "(unspecified)"}, ${input.province ?? "(unspecified)"}
Required skills: ${input.requiredSkills.join(", ") || "(none)"}
Preferred skills: ${input.preferredSkills.join(", ") || "(none)"}

Return JSON with this exact shape:
{
  "linkedin": "string — paste-ready LinkedIn boolean string",
  "indeed": "string — paste-ready Indeed boolean string",
  "google": "string — paste-ready Google search string with site: operators",
  "explanations": ["string — short notes on what each query does", ...]
}

Rules:
- LinkedIn: combine title variants with OR; required skills with AND; province/city as a separate location filter (NOT in the boolean string itself, but mention it in explanations).
- Indeed: similar but Indeed supports more relaxed boolean syntax.
- Google: use site:linkedin.com/in/ OR site:github.com/ OR site:twitter.com/ as appropriate; combine with quoted skills. Include "South Africa" or the province for geo-targeting.
- Don't exceed 200 chars for any single string.
- explanations[] is 1-2 short notes per query that the user can show alongside.`,
  };
}

export function volumePredictionPrompt(input: {
  title: string;
  industry: string | null;
  city: string | null;
  province: string | null;
  seniorityLevel: string | null;
  employmentType: string | null;
  workMode: string | null;
  responseTimelineDays: number;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  requiredSkillCount: number;
  preferredSkillCount: number;
}): NixPrompt {
  const window = input.responseTimelineDays;
  return {
    system: SA_SYSTEM_PREAMBLE,
    user: `Predict how many applicants this job posting will likely attract on the South African market within its response window.

Role:
Title: ${input.title}
Industry: ${input.industry || "(unspecified)"}
Location: ${input.city || "(unspecified)"}, ${input.province || "(unspecified)"}
Seniority: ${input.seniorityLevel || "(unspecified)"}
Employment: ${input.employmentType || "(unspecified)"} / ${input.workMode || "(unspecified)"}
Salary: ${input.salaryCurrency} ${input.salaryMin ?? "?"} – ${input.salaryMax ?? "?"} per month
Required skills: ${input.requiredSkillCount}
Preferred skills: ${input.preferredSkillCount}
Response window: ${window} days

Return JSON with this exact shape:
{
  "expectedApplicants": number,
  "lowerBound": number,
  "upperBound": number,
  "confidence": 0-1,
  "factors": ["string — what raises or lowers volume", ...],
  "warnings": ["string — caveats", ...]
}

Rules:
- Numbers are realistic SA market predictions for the ${window}-day window across job boards (Pnet, Careers24, LinkedIn, Indeed, plus our internal funnel).
- Heavily volume-skewed roles (entry-level retail, sales) typically draw 50-300 applicants. Senior specialised roles (senior engineering, regulated finance) typically 5-30.
- Below-market salary, vague title, or many required skills lowers the count; remote work and competitive pay raises it.
- confidence: 0.7+ for very common SA roles, 0.4-0.6 for niche, <0.4 if you genuinely don't have enough signal.
- factors[] should be specific: e.g. "Senior B2B sales in Johannesburg typically draws 20-40 candidates", not generic boilerplate.`,
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

export interface NixSeekerCvImprovement {
  area:
    | "summary"
    | "skills"
    | "experience"
    | "education"
    | "certifications"
    | "formatting"
    | "keywords"
    | "references"
    | "other";
  priority: "high" | "medium" | "low";
  finding: string;
  suggestion: string;
  example: string | null;
  rankingImpact: "high" | "medium" | "low";
}

export interface NixSeekerCvAssessmentResponse {
  overallScore: number;
  rankingPotential: "low" | "medium" | "strong";
  headline: string;
  strengths: string[];
  improvements: NixSeekerCvImprovement[];
  missingDocumentSuggestions: string[];
  keywordGaps: string[];
  rewriteSummary: string | null;
}

export function seekerCvImprovementPrompt(input: {
  cvText: string | null;
  extractedCv: {
    candidateName: string | null;
    summary: string | null;
    skills: string[];
    experienceYears: number | null;
    education: string[];
    certifications: string[];
    professionalRegistrations: string[];
    saQualifications: string[];
    location: string | null;
  } | null;
  supportingDocuments: Array<{
    kind: "qualification" | "certificate";
    originalFilename: string;
    label: string | null;
  }>;
}): NixPrompt {
  const supporting =
    input.supportingDocuments.length > 0
      ? input.supportingDocuments
          .map((d) => `- ${d.kind}: ${d.originalFilename}${d.label ? ` (${d.label})` : ""}`)
          .join("\n")
      : "(none uploaded)";

  const extracted = input.extractedCv;
  const skillSummary =
    extracted && extracted.skills.length > 0 ? extracted.skills.join(", ") : "(none extracted)";
  const educationSummary =
    extracted && extracted.education.length > 0
      ? extracted.education.join(" | ")
      : "(none extracted)";
  const certificationSummary =
    extracted && extracted.certifications.length > 0
      ? extracted.certifications.join(" | ")
      : "(none extracted)";
  const registrationSummary =
    extracted && extracted.professionalRegistrations.length > 0
      ? extracted.professionalRegistrations.join(", ")
      : "(none)";
  const saQualSummary =
    extracted && extracted.saQualifications.length > 0
      ? extracted.saQualifications.join(", ")
      : "(none)";

  const cvBody = input.cvText
    ? input.cvText.length > 8000
      ? `${input.cvText.slice(0, 8000)}\n\n[CV truncated for prompt — first 8 000 chars shown]`
      : input.cvText
    : "(CV text not available — work from extracted fields and supporting documents)";

  return {
    system: `${SA_SYSTEM_PREAMBLE} You are reviewing an individual job seeker's CV and supporting documents to help them rank higher in candidate listings on the Annix CV Assistant. Be specific, kind, and actionable. Focus on changes that materially improve match scores against South African employer postings.`,
    user: `Review this CV and the seeker's supporting documents. Identify concrete improvements that would lift their candidate ranking.

Candidate name: ${extracted?.candidateName ?? "(unknown)"}
Location: ${extracted?.location ?? "(unspecified)"}
Years of experience (extracted): ${extracted?.experienceYears ?? "(unknown)"}
Summary (extracted): ${extracted?.summary ?? "(none)"}
Skills (extracted): ${skillSummary}
Education (extracted): ${educationSummary}
Certifications (extracted): ${certificationSummary}
Professional registrations (extracted): ${registrationSummary}
SA qualifications (extracted): ${saQualSummary}

Supporting documents the seeker has uploaded:
${supporting}

Raw CV text:
"""
${cvBody}
"""

Return JSON with this exact shape:
{
  "overallScore": 0-100,
  "rankingPotential": "low" | "medium" | "strong",
  "headline": "string — 1 sentence verdict the seeker will read first",
  "strengths": ["string — what is already working", ...],
  "improvements": [
    {
      "area": "summary" | "skills" | "experience" | "education" | "certifications" | "formatting" | "keywords" | "references" | "other",
      "priority": "high" | "medium" | "low",
      "finding": "string — what's wrong / weak",
      "suggestion": "string — what to do about it",
      "example": "string or null — a concrete rewrite or addition the seeker could paste in",
      "rankingImpact": "high" | "medium" | "low"
    },
    ...
  ],
  "missingDocumentSuggestions": ["string — qualifications / certificates that would strengthen this profile (e.g. 'Upload your matric certificate', 'Add your driver's licence')", ...],
  "keywordGaps": ["string — SA-recruiter-friendly keywords likely missing from the CV that would lift match scores", ...],
  "rewriteSummary": "string or null — a stronger 3-5 sentence professional summary the seeker can paste in"
}

Rules:
- Be honest. If the CV is weak, say so. Don't invent qualifications the seeker doesn't have.
- Prefer high-leverage changes that affect ranking: clearer summary, quantified achievements, missing high-value keywords, missing certifications, formatting that breaks ATS parsers.
- Use SA hiring context (Pnet, Careers24, LinkedIn). Reference NQF levels, SAQA, ECSA, SACPCMP, SAICA, SAIPA, valid driver's licence + own vehicle, right-to-work in South Africa, B-BBEE designations only when the seeker has legitimately indicated them.
- For missingDocumentSuggestions, only suggest documents that genuinely help match the seeker's apparent field. Don't suggest a "boilermaker red ticket" to an accountant.
- Improvements list: 4 to 8 items, ordered with the highest-impact first.
- rewriteSummary: only fill it in if the existing summary is weak or missing. 60-120 words, written in first-person, professional, SA-appropriate.
- All amounts (if mentioned) in ZAR.`,
  };
}
