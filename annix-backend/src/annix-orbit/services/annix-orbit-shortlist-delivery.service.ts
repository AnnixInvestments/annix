import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import { PuppeteerPoolService } from "../../shared/services/puppeteer-pool.service";
import type { AnnixOrbitShortlist } from "../entities/annix-orbit-shortlist.entity";
import type { AnnixOrbitTalentCandidate } from "../entities/annix-orbit-talent-candidate.entity";
import { AnnixOrbitClientRepository } from "../repositories/annix-orbit-client.repository";
import { AnnixOrbitCompanyRepository } from "../repositories/annix-orbit-company.repository";
import { AnnixOrbitShortlistRepository } from "../repositories/annix-orbit-shortlist.repository";
import { AnnixOrbitTalentCandidateRepository } from "../repositories/annix-orbit-talent-candidate.repository";
import { type AnnixOrbitAuditActor, AnnixOrbitAuditService } from "./annix-orbit-audit.service";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Client delivery for shortlists (issue #337): branded PDF download, email
// with the PDF attached, and a tokenised read-only share link. Only candidates
// with consentToShare are ever included in client-facing output.
@Injectable()
export class AnnixOrbitShortlistDeliveryService {
  private readonly logger = new Logger(AnnixOrbitShortlistDeliveryService.name);

  constructor(
    private readonly shortlistRepo: AnnixOrbitShortlistRepository,
    private readonly candidateRepo: AnnixOrbitTalentCandidateRepository,
    private readonly clientRepo: AnnixOrbitClientRepository,
    private readonly companyRepo: AnnixOrbitCompanyRepository,
    private readonly emailService: EmailService,
    private readonly auditService: AnnixOrbitAuditService,
    private readonly puppeteerPool: PuppeteerPoolService,
  ) {}

  private async shortlistForCompany(id: number, companyId: number): Promise<AnnixOrbitShortlist> {
    const shortlist = await this.shortlistRepo.findByIdForCompany(id, companyId);
    if (!shortlist) {
      throw new NotFoundException("Shortlist not found");
    }
    return shortlist;
  }

  private async consentedCandidates(
    shortlist: AnnixOrbitShortlist,
  ): Promise<AnnixOrbitTalentCandidate[]> {
    const ids = new Set(shortlist.candidateIds ?? []);
    if (ids.size === 0) return [];
    // 0 = no personal visibility context: only agency-visible candidates are
    // eligible for client-facing output.
    const all = await this.candidateRepo.findVisibleForCompany(shortlist.companyId, 0);
    return all.filter((candidate) => ids.has(candidate.id) && candidate.consentToShare);
  }

  private async buildHtml(shortlist: AnnixOrbitShortlist): Promise<string> {
    const candidates = await this.consentedCandidates(shortlist);
    const agency = await this.companyRepo.findById(shortlist.companyId);
    const agencyName = agency?.name ?? "Recruitment agency";
    const client = shortlist.clientId ? await this.clientRepo.findById(shortlist.clientId) : null;

    const cards = candidates
      .map((candidate) => {
        const skills = (candidate.skills ?? [])
          .map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`)
          .join("");
        const meta = [
          candidate.currentRole,
          candidate.yearsExperience != null ? `${candidate.yearsExperience} yrs experience` : null,
          [candidate.city, candidate.province].filter(Boolean).join(", ") || null,
          candidate.noticePeriod ? `Notice: ${candidate.noticePeriod}` : null,
        ]
          .filter((part): part is string => Boolean(part))
          .map((part) => escapeHtml(part))
          .join(" · ");
        return `<div class="card">
  <h3>${escapeHtml(candidate.fullName)}</h3>
  <p class="meta">${meta}</p>
  ${skills ? `<div class="skills">${skills}</div>` : ""}
</div>`;
      })
      .join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a40; margin: 0; padding: 32px; }
  header { border-bottom: 3px solid #323288; padding-bottom: 16px; margin-bottom: 24px; }
  h1 { margin: 0; color: #323288; font-size: 24px; }
  .sub { color: #555; margin-top: 6px; font-size: 14px; }
  .card { border: 1px solid #ddd; border-radius: 10px; padding: 16px 20px; margin-bottom: 14px; page-break-inside: avoid; }
  .card h3 { margin: 0 0 4px; font-size: 17px; color: #252560; }
  .meta { margin: 0; color: #555; font-size: 13px; }
  .skills { margin-top: 10px; }
  .skill { display: inline-block; background: #eef; color: #323288; border-radius: 999px; padding: 3px 10px; font-size: 12px; margin: 0 6px 6px 0; }
  footer { margin-top: 28px; color: #888; font-size: 11px; border-top: 1px solid #eee; padding-top: 10px; }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(shortlist.name)}</h1>
  <p class="sub">
    ${shortlist.jobTitle ? `Role: ${escapeHtml(shortlist.jobTitle)} · ` : ""}
    ${client ? `Prepared for ${escapeHtml(client.name)} · ` : ""}
    Prepared by ${escapeHtml(agencyName)} · ${now().toFormat("d LLLL yyyy")}
  </p>
</header>
${cards || "<p>No candidates with sharing consent are on this shortlist yet.</p>"}
<footer>
  Candidate information shared with consent (POPIA). Contact ${escapeHtml(agencyName)} for full CVs, references and interview availability.
</footer>
</body>
</html>`;
  }

  async renderPdf(id: number, companyId: number): Promise<{ filename: string; buffer: Buffer }> {
    const shortlist = await this.shortlistForCompany(id, companyId);
    const html = await this.buildHtml(shortlist);
    const buffer = await this.puppeteerPool.generatePdfFromHtml(html, {
      format: "A4" as const,
      printBackground: true,
      margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" },
    });
    const safeName = shortlist.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "shortlist";
    return { filename: `${safeName}.pdf`, buffer };
  }

  async emailToClient(
    id: number,
    companyId: number,
    actor: AnnixOrbitAuditActor,
    recipientEmail: string,
    message: string | null,
  ): Promise<{ sent: boolean }> {
    if (!recipientEmail?.includes("@")) {
      throw new BadRequestException("A valid recipient email is required");
    }
    const shortlist = await this.shortlistForCompany(id, companyId);
    const { filename, buffer } = await this.renderPdf(id, companyId);
    const agency = await this.companyRepo.findById(companyId);
    const agencyName = agency?.name ?? "your recruitment partner";

    const sent = await this.emailService.sendEmail({
      to: recipientEmail,
      subject: `Candidate shortlist: ${shortlist.name}`,
      html: `<p>Good day,</p>
<p>${message ? escapeHtml(message) : `Please find attached the candidate shortlist "${escapeHtml(shortlist.name)}" prepared by ${escapeHtml(agencyName)}.`}</p>
<p>The attached PDF contains the shortlisted candidates who have consented to their details being shared. Contact us for full CVs and interview availability.</p>
<p>Kind regards,<br/>${escapeHtml(agencyName)}</p>`,
      attachments: [{ filename, content: buffer }],
    });

    if (sent) {
      shortlist.status = "sent";
      await this.shortlistRepo.save(shortlist);
      for (const candidateId of shortlist.candidateIds ?? []) {
        await this.auditService.record(companyId, actor, {
          action: "shortlist_sent",
          candidateId,
          shortlistId: shortlist.id,
          clientId: shortlist.clientId,
          detail: `Included in shortlist "${shortlist.name}" emailed to ${recipientEmail}`,
        });
      }
    }
    return { sent };
  }

  async createShareLink(
    id: number,
    companyId: number,
    actor: AnnixOrbitAuditActor,
  ): Promise<{ token: string }> {
    const shortlist = await this.shortlistForCompany(id, companyId);
    if (!shortlist.shareToken) {
      shortlist.shareToken = uuidv4();
      await this.shortlistRepo.save(shortlist);
      await this.auditService.record(companyId, actor, {
        action: "shortlist_sent",
        candidateId: null,
        shortlistId: shortlist.id,
        clientId: shortlist.clientId,
        detail: `Share link created for shortlist "${shortlist.name}"`,
      });
    }
    return { token: shortlist.shareToken };
  }

  async revokeShareLink(id: number, companyId: number): Promise<{ revoked: boolean }> {
    const shortlist = await this.shortlistForCompany(id, companyId);
    shortlist.shareToken = null;
    await this.shortlistRepo.save(shortlist);
    return { revoked: true };
  }

  // Public, tokenised read-only view - same branded HTML as the PDF.
  async publicHtmlByToken(token: string): Promise<string> {
    const shortlist = await this.shortlistRepo.findByShareToken(token);
    if (!shortlist) {
      throw new NotFoundException("This shortlist link is no longer available");
    }
    return this.buildHtml(shortlist);
  }
}
