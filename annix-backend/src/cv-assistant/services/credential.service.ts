import {
  CREDENTIAL_LABELS,
  CREDENTIAL_TYPES,
  type CredentialType,
} from "@annix/product-data/sa-market";
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { DateTime } from "../../lib/datetime";
import { isCvAssistantCronEnabled } from "../cv-assistant-cron.config";
import { Candidate } from "../entities/candidate.entity";
import { CvCredential } from "../entities/cv-credential.entity";

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
    @InjectRepository(CvCredential)
    private readonly credentialRepo: Repository<CvCredential>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    private readonly emailService: EmailService,
  ) {}

  async listForSeeker(email: string | null): Promise<CvCredential[]> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) return [];
    return this.credentialRepo
      .createQueryBuilder("c")
      .where("c.candidate_id IN (:...ids)", { ids: candidates.map((cand) => cand.id) })
      .orderBy("c.expires_at", "ASC", "NULLS LAST")
      .getMany();
  }

  async createForSeeker(
    email: string | null,
    input: UpsertCredentialInput,
  ): Promise<CvCredential | null> {
    if (!CREDENTIAL_TYPES.includes(input.credentialType)) return null;
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) return null;
    const target = candidates[0];
    const created = this.credentialRepo.create({
      candidateId: target.id,
      credentialType: input.credentialType,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      issuingAuthority: input.issuingAuthority ? input.issuingAuthority.trim() : null,
      documentPath: input.documentPath,
      notes: input.notes ? input.notes.trim() : null,
    });
    return this.credentialRepo.save(created);
  }

  async updateForSeeker(
    email: string | null,
    credentialId: number,
    input: Partial<UpsertCredentialInput>,
  ): Promise<CvCredential | null> {
    const candidates = await this.candidatesForEmail(email);
    if (candidates.length === 0) return null;
    const candidateIds = new Set(candidates.map((c) => c.id));

    const existing = await this.credentialRepo.findOne({ where: { id: credentialId } });
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
    const existing = await this.credentialRepo.findOne({ where: { id: credentialId } });
    if (!existing || !candidateIds.has(existing.candidateId)) return false;
    await this.credentialRepo.delete(existing.id);
    return true;
  }

  @Cron("0 7 * * *", { name: "cv-assistant:credential-expiry-reminders" })
  async sendExpiryReminders(): Promise<{ sent: number }> {
    if (!isCvAssistantCronEnabled()) return { sent: 0 };
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

      const expiring = await this.credentialRepo.find({
        where: { expiresAt: Between(dayStart, dayEnd) },
      });
      if (expiring.length === 0) continue;

      const byCandidate = new Map<number, CvCredential[]>();
      for (const cred of expiring) {
        const list = byCandidate.get(cred.candidateId);
        if (list) list.push(cred);
        else byCandidate.set(cred.candidateId, [cred]);
      }

      const candidateIds = [...byCandidate.keys()];
      const candidates = await this.candidateRepo.find({ where: { id: In(candidateIds) } });

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
      "Update the new expiry date in CV Assistant once renewed.",
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

  private async candidatesForEmail(email: string | null): Promise<Candidate[]> {
    if (!email) return [];
    return this.candidateRepo.find({ where: { email } });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
