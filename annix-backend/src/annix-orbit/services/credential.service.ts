import {
  CREDENTIAL_DESCRIPTIONS,
  CREDENTIAL_LABELS,
  CREDENTIAL_TYPES,
  type CredentialType,
} from "@annix/product-data/sa-market";
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EmailService } from "../../email/email.service";
import { DateTime } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import { Candidate } from "../entities/candidate.entity";
import { CvCredential } from "../entities/cv-credential.entity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CvCredentialRepository } from "../repositories/cv-credential.repository";

export interface UpsertCredentialInput {
  credentialType: CredentialType;
  issuedAt: string | null;
  expiresAt: string | null;
  issuingAuthority: string | null;
  documentPath: string | null;
  notes: string | null;
}

const EXPIRY_REMINDER_DAYS = [30, 14, 1] as const;

@Injectable()
export class CredentialService {
  private readonly logger = new Logger(CredentialService.name);

  constructor(
    private readonly credentialRepo: CvCredentialRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly emailService: EmailService,
    private readonly aiChatService: AiChatService,
  ) {}

  async listForSeeker(email: string | null): Promise<CvCredential[]> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) return [];
    return this.credentialRepo.listForCandidates(candidates.map((cand) => cand.id));
  }

  async createForSeeker(
    email: string | null,
    input: UpsertCredentialInput,
  ): Promise<CvCredential | null> {
    if (!CREDENTIAL_TYPES.includes(input.credentialType)) return null;
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) return null;
    const target = candidates[0];
    return this.credentialRepo.create({
      candidateId: target.id,
      credentialType: input.credentialType,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      issuingAuthority: input.issuingAuthority ? input.issuingAuthority.trim() : null,
      documentPath: input.documentPath,
      notes: input.notes ? input.notes.trim() : null,
    });
  }

  async updateForSeeker(
    email: string | null,
    credentialId: number,
    input: Partial<UpsertCredentialInput>,
  ): Promise<CvCredential | null> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) return null;
    const candidateIds = new Set(candidates.map((c) => c.id));

    const existing = await this.credentialRepo.findById(credentialId);
    if (!existing || !candidateIds.has(existing.candidateId)) return null;

    if (input.credentialType && CREDENTIAL_TYPES.includes(input.credentialType)) {
      existing.credentialType = input.credentialType;
    }
    if (input.issuedAt !== undefined) existing.issuedAt = input.issuedAt;
    if (input.expiresAt !== undefined) existing.expiresAt = input.expiresAt;
    if (input.issuingAuthority !== undefined) {
      existing.issuingAuthority = input.issuingAuthority ? input.issuingAuthority.trim() : null;
    }
    if (input.documentPath !== undefined) existing.documentPath = input.documentPath;
    if (input.notes !== undefined) existing.notes = input.notes ? input.notes.trim() : null;

    return this.credentialRepo.save(existing);
  }

  async deleteForSeeker(email: string | null, credentialId: number): Promise<boolean> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) return false;
    const candidateIds = new Set(candidates.map((c) => c.id));
    const existing = await this.credentialRepo.findById(credentialId);
    if (!existing || !candidateIds.has(existing.candidateId)) return false;
    await this.credentialRepo.deleteById(existing.id);
    return true;
  }

  @Cron("0 7 * * *", { name: "annix-orbit:credential-expiry-reminders" })
  async sendExpiryReminders(): Promise<{ sent: number }> {
    if (!isAnnixOrbitCronEnabled()) return { sent: 0 };
    return this.dispatchExpiryReminders();
  }

  async dispatchExpiryReminders(): Promise<{ sent: number }> {
    const today = DateTime.now().startOf("day");
    let totalSent = 0;
    for (const daysOut of EXPIRY_REMINDER_DAYS) {
      const target = today.plus({ days: daysOut });
      const dayStart = target.toISODate();
      const dayEnd = target.toISODate();
      if (!dayStart || !dayEnd) continue;

      const expiring = await this.credentialRepo.expiringBetween(dayStart, dayEnd);
      if (expiring.length === 0) continue;

      const byCandidate = new Map<number, CvCredential[]>();
      for (const cred of expiring) {
        const list = byCandidate.get(cred.candidateId);
        if (list) list.push(cred);
        else byCandidate.set(cred.candidateId, [cred]);
      }

      const candidateIds = [...byCandidate.keys()];
      const candidates = await Promise.all(
        candidateIds.map((id) => this.candidateRepo.findById(id)),
      ).then((rows) => rows.filter((c): c is Candidate => c !== null));

      for (const candidate of candidates) {
        if (!candidate.email) continue;
        const creds = byCandidate.get(candidate.id) ?? [];
        if (creds.length === 0) continue;
        const sent = await this.notifyCandidate(candidate, creds, daysOut);
        if (sent) totalSent++;
      }
    }
    if (totalSent > 0) {
      this.logger.log(`Sent ${totalSent} credential expiry reminders`);
    }
    return { sent: totalSent };
  }

  private async notifyCandidate(
    candidate: Candidate,
    credentials: CvCredential[],
    daysOut: number,
  ): Promise<boolean> {
    const candidateEmail = candidate.email;
    if (!candidateEmail) return false;

    const recipient = candidateEmail;
    const lines = [
      `Hi ${candidate.name ?? "there"},`,
      "",
      daysOut === 1
        ? "The following credential expires TOMORROW:"
        : `The following credential${credentials.length === 1 ? "" : "s"} expire${credentials.length === 1 ? "s" : ""} in ${daysOut} days:`,
      "",
      ...credentials.map(
        (c) => `  • ${CREDENTIAL_LABELS[c.credentialType]} — expires ${c.expiresAt}`,
      ),
      "",
      "Renew before the expiry date so you don't lose deployment eligibility.",
      "Update the new expiry date in Annix Orbit once renewed.",
    ];
    const text = lines.join("\n");
    const html = `<p>${lines.map((l) => escapeHtml(l)).join("</p><p>")}</p>`;
    const subject =
      daysOut === 1
        ? "Credential expires tomorrow — renew now"
        : `Credential expires in ${daysOut} days — renew soon`;

    try {
      await this.emailService.sendEmail({ to: recipient, subject, text, html });
    } catch (err) {
      this.logger.warn(
        `Email send failed for candidate ${candidate.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }

    return true;
  }

  async autofillFromCvForSeeker(email: string | null): Promise<{
    created: number;
    credentials: CvCredential[];
    reason?: "no-candidate" | "no-cv-text" | "no-credential-keywords" | "ai-failed";
  }> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) {
      return { created: 0, credentials: [], reason: "no-candidate" };
    }
    const target = candidates[0];
    const rawCvText = target.rawCvText;
    if (!rawCvText || rawCvText.trim().length === 0) {
      return { created: 0, credentials: [], reason: "no-cv-text" };
    }
    if (!containsCredentialKeywords(rawCvText)) {
      return { created: 0, credentials: [], reason: "no-credential-keywords" };
    }

    const extracted = await this.extractCredentialsFromCv(rawCvText);
    if (extracted.length === 0) {
      return { created: 0, credentials: [], reason: "ai-failed" };
    }

    const existing = await this.credentialRepo.findByCandidate(target.id);
    const fresh = extracted.filter(
      (e) =>
        !existing.some(
          (x) =>
            x.credentialType === e.credentialType &&
            (x.issuingAuthority ?? "").toLowerCase() === (e.issuingAuthority ?? "").toLowerCase(),
        ),
    );
    if (fresh.length === 0) {
      return { created: 0, credentials: existing };
    }

    const saved = await Promise.all(
      fresh.map((entry) =>
        this.credentialRepo.create({
          candidateId: target.id,
          credentialType: entry.credentialType,
          issuedAt: entry.issuedAt,
          expiresAt: entry.expiresAt,
          issuingAuthority: entry.issuingAuthority,
          documentPath: null,
          notes: "Auto-filled from CV",
        }),
      ),
    );

    return { created: saved.length, credentials: [...existing, ...saved] };
  }

  private async extractCredentialsFromCv(cvText: string): Promise<
    Array<{
      credentialType: CredentialType;
      issuedAt: string | null;
      expiresAt: string | null;
      issuingAuthority: string | null;
    }>
  > {
    const trimmed = cvText.length > 60_000 ? cvText.slice(0, 60_000) : cvText;
    try {
      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: buildCredentialExtractionPrompt(trimmed) }],
        buildCredentialExtractionSystemPrompt(),
        "gemini",
      );
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]) as {
        credentials?: Array<{
          credentialType?: string;
          issuedAt?: string | null;
          expiresAt?: string | null;
          issuingAuthority?: string | null;
        }>;
      };
      const raw = Array.isArray(parsed?.credentials) ? parsed.credentials : [];
      return raw
        .filter(
          (c): c is { credentialType: string } & typeof c =>
            typeof c?.credentialType === "string" &&
            CREDENTIAL_TYPES.includes(c.credentialType as CredentialType),
        )
        .map((c) => ({
          credentialType: c.credentialType as CredentialType,
          issuedAt: typeof c.issuedAt === "string" ? c.issuedAt : null,
          expiresAt: typeof c.expiresAt === "string" ? c.expiresAt : null,
          issuingAuthority:
            typeof c.issuingAuthority === "string" ? c.issuingAuthority.trim() : null,
        }));
    } catch (err) {
      this.logger.warn(
        `Credential extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  private async candidatesForEmail(email: string | null): Promise<Candidate[]> {
    if (!email) return [];
    return this.candidateRepo.findByEmail(email);
  }
}

function buildCredentialExtractionSystemPrompt(): string {
  const typeUnion = CREDENTIAL_TYPES.map((t) => `"${t}"`).join(" | ");
  const typeGuide = CREDENTIAL_TYPES.filter((t) => t !== "other")
    .map((t) => `  - ${t}: ${CREDENTIAL_LABELS[t]} — ${CREDENTIAL_DESCRIPTIONS[t]}`)
    .join("\n");
  return `You are extracting workplace credentials and tickets from a South African industrial worker's CV. Look for medicals, mine inductions, blasting tickets, eye tests, forklift / plant / TMM / crane operator licences, rigging, driver's licences and PrDPs, working-at-heights, confined space, scaffolding, H2S awareness, gas testing, first aid, fire fighting, dangerous-goods / Hazchem, coded welding, and similar safety/competency documents.

Credential types and what they mean:
${typeGuide}

Return STRICT JSON with this shape (no markdown, no prose):

{
  "credentials": [
    {
      "credentialType": ${typeUnion},
      "issuedAt": "YYYY-MM-DD" | null,
      "expiresAt": "YYYY-MM-DD" | null,
      "issuingAuthority": string | null
    }
  ]
}

Rules:
- Only include credentials explicitly mentioned in the CV. Do NOT invent.
- Use null for issued/expires dates if the CV doesn't give a date.
- Use "other" for credentials that don't fit the listed types — DO NOT skip them.
- issuingAuthority is the body that issued the credential (e.g. "Kathu Mine HSE", "Dr Bones", "Anglo American Platinum").
- Return {"credentials": []} if nothing applies. Never invent entries.`;
}

function buildCredentialExtractionPrompt(cvText: string): string {
  return `Extract any workplace credentials/tickets from this CV. Return ONLY JSON.\n\n${cvText}`;
}

const CREDENTIAL_KEYWORDS = [
  "medical",
  "medical certificate",
  "certificate of fitness",
  "red ticket",
  "mine induction",
  "induction",
  "blasting",
  "blast ticket",
  "eye test",
  "lift driver",
  "forklift",
  "lift truck",
  "plant operator",
  "excavator",
  "front end loader",
  "tlb",
  "dozer",
  "tmm",
  "trackless mobile machinery",
  "crane",
  "rigging",
  "rigger",
  "slinger",
  "driver's licence",
  "drivers licence",
  "drivers license",
  "code 10",
  "code 14",
  "code ec",
  "prdp",
  "professional driving permit",
  "working at heights",
  "heights cert",
  "confined space",
  "scaffold",
  "scaffolding",
  "h2s",
  "gas test",
  "gas testing",
  "first aid",
  "fire fighting",
  "firefighting",
  "dangerous goods",
  "hazchem",
  "hazmat",
  "welding",
  "welder",
];

function containsCredentialKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return CREDENTIAL_KEYWORDS.some((kw) => lower.includes(kw));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
