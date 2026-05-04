import type {
  Assignment,
  AssignmentInput,
  RubricCriterion,
  TeacherNotes,
} from "@annix/product-data/teacher-assistant";
import { Injectable, Logger } from "@nestjs/common";
import { parseJsonFromAi } from "../../lib/json-from-ai";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

const FILLER_SYSTEM_PROMPT = `You are an expert education designer filling in a missing section of an assignment.
Return STRICT JSON only — no prose, no markdown fences, no commentary.
Every string value must use straight double quotes, escape internal quotes as \\".
Match the requested shape EXACTLY. Do not add extra fields.`;

interface RubricResponse {
  rubric: RubricCriterion[];
}

interface TeacherNotesResponse {
  teacherNotes: TeacherNotes;
}

interface StringListResponse {
  items: string[];
}

@Injectable()
export class SectionFillerService {
  private readonly logger = new Logger(SectionFillerService.name);

  constructor(private readonly aiChat: AiChatService) {}

  async fillMissingSections(
    assignment: Assignment,
    input: AssignmentInput,
  ): Promise<{ assignment: Assignment; filled: string[] }> {
    const filled: string[] = [];
    let next = assignment;

    if (this.needsRubric(next)) {
      const rubric = await this.tryFillRubric(input).catch((error) => {
        this.logger.warn(`Rubric refill failed: ${this.errMsg(error)}`);
        return null;
      });
      if (rubric && rubric.length >= 4) {
        next = { ...next, rubric };
        filled.push("rubric");
      }
    }

    if (this.needsTeacherNotes(next)) {
      const notes = await this.tryFillTeacherNotes(input).catch((error) => {
        this.logger.warn(`Teacher notes refill failed: ${this.errMsg(error)}`);
        return null;
      });
      if (notes) {
        next = { ...next, teacherNotes: notes };
        filled.push("teacherNotes");
      }
    }

    if (this.needsSuccessCriteria(next)) {
      const items = await this.tryFillStringList("successCriteria", input).catch((error) => {
        this.logger.warn(`Success criteria refill failed: ${this.errMsg(error)}`);
        return null;
      });
      if (items && items.length > 0) {
        next = { ...next, successCriteria: items };
        filled.push("successCriteria");
      }
    }

    if (this.needsEvidenceChecklist(next)) {
      const items = await this.tryFillStringList("evidenceChecklist", input).catch((error) => {
        this.logger.warn(`Evidence checklist refill failed: ${this.errMsg(error)}`);
        return null;
      });
      if (items && items.length >= 3) {
        next = { ...next, evidenceChecklist: items };
        filled.push("evidenceChecklist");
      }
    }

    if (this.needsParentNote(next)) {
      const note = await this.tryFillParentNote(input).catch((error) => {
        this.logger.warn(`Parent note refill failed: ${this.errMsg(error)}`);
        return null;
      });
      if (note) {
        next = { ...next, parentNote: note };
        filled.push("parentNote");
      }
    }

    if (this.needsStudentAiPrompts(next) && input.allowAiUse) {
      const prompts = await this.tryFillStringList("studentAiPromptStarters", input).catch(
        (error) => {
          this.logger.warn(`Student AI prompts refill failed: ${this.errMsg(error)}`);
          return null;
        },
      );
      if (prompts && prompts.length > 0) {
        next = { ...next, studentAiPromptStarters: prompts };
        filled.push("studentAiPromptStarters");
      }
    }

    if (filled.length > 0) {
      this.logger.log(
        `Filled missing sections for ${input.subject}/${input.topic}: ${filled.join(", ")}`,
      );
    }
    return { assignment: next, filled };
  }

  private needsRubric(a: Assignment): boolean {
    if (!Array.isArray(a.rubric) || a.rubric.length < 4) return true;
    return a.rubric.some(
      (r) =>
        !r?.excellent?.trim() ||
        !r?.good?.trim() ||
        !r?.satisfactory?.trim() ||
        !r?.needsWork?.trim() ||
        r.excellent.trim() === "—" ||
        r.good.trim() === "—" ||
        r.satisfactory.trim() === "—" ||
        r.needsWork.trim() === "—",
    );
  }

  private needsTeacherNotes(a: Assignment): boolean {
    const tn = a.teacherNotes;
    if (!tn) return true;
    const fillable =
      (tn.setup?.trim().length ?? 0) > 10 ||
      (tn.markingGuidance?.trim().length ?? 0) > 10 ||
      (tn.supportOption?.trim().length ?? 0) > 10;
    return !fillable;
  }

  private needsSuccessCriteria(a: Assignment): boolean {
    if (!Array.isArray(a.successCriteria) || a.successCriteria.length === 0) return true;
    return a.successCriteria.every((s) => /replace this/i.test(s));
  }

  private needsEvidenceChecklist(a: Assignment): boolean {
    if (!Array.isArray(a.evidenceChecklist) || a.evidenceChecklist.length < 3) return true;
    return a.evidenceChecklist.every((s) => /replace with/i.test(s));
  }

  private needsParentNote(a: Assignment): boolean {
    return !a.parentNote || a.parentNote.trim().length < 20;
  }

  private needsStudentAiPrompts(a: Assignment): boolean {
    return !Array.isArray(a.studentAiPromptStarters) || a.studentAiPromptStarters.length === 0;
  }

  private async tryFillRubric(input: AssignmentInput): Promise<RubricCriterion[] | null> {
    const prompt = [
      `Write a 4-criterion rubric for a ${input.subject} assignment on "${input.topic}" for ages ${input.ageBucket} (${input.difficulty} difficulty).`,
      "Criteria suggestions: Observation, Reasoning, AI critique, Presentation (you can adjust).",
      "Each criterion needs all four levels: excellent, good, satisfactory, needsWork — each level must be ONE complete sentence describing what work at that level looks like.",
      "",
      `Return JSON: { "rubric": [{ "criterion": "...", "excellent": "...", "good": "...", "satisfactory": "...", "needsWork": "..." }, ...4 entries] }`,
    ].join("\n");
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      FILLER_SYSTEM_PROMPT,
      "gemini",
    );
    const parsed = parseJsonFromAi<RubricResponse>(response.content);
    return Array.isArray(parsed.rubric) ? parsed.rubric : null;
  }

  private async tryFillTeacherNotes(input: AssignmentInput): Promise<TeacherNotes | null> {
    const prompt = [
      `Write the teacher notes for a ${input.subject} assignment on "${input.topic}" for ages ${input.ageBucket} (${input.difficulty} difficulty, ${input.duration}, output: ${input.outputType}).`,
      "",
      `Return JSON: { "teacherNotes": { "setup": "1-2 sentences on how to introduce", "setupTime": "e.g. 15 minutes prep + materials gathered overnight", "materialsNeeded": ["3+ specific items"], "commonMisconceptions": ["2+ specific misconceptions students typically have on this topic"], "markingGuidance": "1-2 sentences on what to weight most heavily", "supportOption": "1 sentence on a scaffold for struggling learners", "extensionOption": "1 sentence on a stretch task for advanced learners" } }`,
    ].join("\n");
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      FILLER_SYSTEM_PROMPT,
      "gemini",
    );
    const parsed = parseJsonFromAi<TeacherNotesResponse>(response.content);
    return parsed.teacherNotes ?? null;
  }

  private async tryFillStringList(
    field: "successCriteria" | "evidenceChecklist" | "studentAiPromptStarters",
    input: AssignmentInput,
  ): Promise<string[] | null> {
    const ask: Record<typeof field, string> = {
      successCriteria: `Write 4 success criteria — short statements describing what a student must show to succeed on a ${input.subject} assignment about "${input.topic}".`,
      evidenceChecklist: `Write 4 concrete evidence items the student must produce — specific artefacts (e.g. photos with metadata, comparison table, sketch) for a ${input.subject} assignment on "${input.topic}".`,
      studentAiPromptStarters: `Write 4 starter AI prompts a student could try when working on a ${input.subject} assignment about "${input.topic}". Each is one sentence the student would type into an AI tool.`,
    };
    const prompt = [
      ask[field],
      `Match the age (${input.ageBucket}) and difficulty (${input.difficulty}).`,
      "",
      `Return JSON: { "items": ["...", "...", "...", "..."] }`,
    ].join("\n");
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      FILLER_SYSTEM_PROMPT,
      "gemini",
    );
    const parsed = parseJsonFromAi<StringListResponse>(response.content);
    return Array.isArray(parsed.items) ? parsed.items.filter((s) => s.trim().length > 0) : null;
  }

  private async tryFillParentNote(input: AssignmentInput): Promise<string | null> {
    const prompt = [
      `Write a 2-sentence parent note for a ${input.subject} assignment on "${input.topic}" for ages ${input.ageBucket} (${input.duration}).`,
      `Plain language. Tell the parent what their child will be doing and what evidence they'll gather at home.`,
      "",
      `Return JSON: { "items": ["the two-sentence parent note as a single string"] }`,
    ].join("\n");
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      FILLER_SYSTEM_PROMPT,
      "gemini",
    );
    const parsed = parseJsonFromAi<StringListResponse>(response.content);
    if (Array.isArray(parsed.items) && parsed.items.length > 0) {
      return parsed.items[0]?.trim() || null;
    }
    return null;
  }

  private errMsg(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
