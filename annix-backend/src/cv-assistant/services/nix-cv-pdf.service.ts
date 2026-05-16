import { Injectable, Logger } from "@nestjs/common";
import { PuppeteerPoolService } from "../../shared/services/puppeteer-pool.service";
import type { NixGeneratedCv, NixGeneratedCvExperience } from "./nix-prompts";

@Injectable()
export class NixCvPdfService {
  private readonly logger = new Logger(NixCvPdfService.name);

  constructor(private readonly puppeteerPool: PuppeteerPoolService) {}

  async renderPdf(cv: NixGeneratedCv): Promise<Buffer> {
    const html = this.buildHtml(cv);
    this.logger.log(`Rendering Nix CV PDF for ${cv.fullName || "(unnamed seeker)"}`);
    return this.puppeteerPool.generatePdfFromHtml(html, {
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
    });
  }

  private buildHtml(cv: NixGeneratedCv): string {
    const contactLine = this.buildContactLine(cv);
    const headerLocation = cv.location
      ? `<p class="header-location">${escapeHtml(cv.location)}</p>`
      : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(cv.fullName || "Curriculum Vitae")}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #1f2937;
    font-size: 11px;
    line-height: 1.5;
  }
  .cv { padding: 4px 2px; }
  .header { border-bottom: 3px solid #323288; padding-bottom: 12px; margin-bottom: 16px; }
  .header-name { font-size: 24px; font-weight: 700; color: #252560; margin: 0; letter-spacing: 0.01em; }
  .header-title { font-size: 13px; font-weight: 600; color: #323288; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.04em; }
  .header-location { font-size: 11px; color: #4b5563; margin: 4px 0 0; }
  .header-contact { font-size: 10px; color: #4b5563; margin: 6px 0 0; }
  .section { margin-bottom: 14px; }
  .section-title {
    font-size: 12px; font-weight: 700; color: #252560; text-transform: uppercase;
    letter-spacing: 0.06em; margin: 0 0 6px;
    border-bottom: 1px solid #e0e0f5; padding-bottom: 3px;
  }
  .summary { font-size: 11px; color: #1f2937; margin: 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .chip {
    font-size: 10px; background: #f0f0fc; color: #252560;
    border: 1px solid #c0c0eb; border-radius: 10px; padding: 2px 9px;
  }
  .experience-item { margin-bottom: 10px; }
  .exp-head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .exp-role { font-size: 11.5px; font-weight: 700; color: #1f2937; margin: 0; }
  .exp-employer { font-size: 11px; color: #323288; font-weight: 600; margin: 1px 0 0; }
  .exp-period { font-size: 10px; color: #6b7280; white-space: nowrap; }
  .exp-location { font-size: 10px; color: #6b7280; }
  ul.bullets { margin: 5px 0 0; padding-left: 16px; }
  ul.bullets li { font-size: 10.5px; color: #1f2937; margin-bottom: 2px; }
  ul.plain { margin: 0; padding-left: 16px; }
  ul.plain li { font-size: 10.5px; color: #1f2937; margin-bottom: 2px; }
  .closing { font-size: 10px; color: #6b7280; font-style: italic; margin: 16px 0 0; }
</style>
</head>
<body>
<div class="cv">
  <header class="header">
    <h1 class="header-name">${escapeHtml(cv.fullName || "Curriculum Vitae")}</h1>
    ${cv.headlineTitle ? `<p class="header-title">${escapeHtml(cv.headlineTitle)}</p>` : ""}
    ${headerLocation}
    ${contactLine ? `<p class="header-contact">${contactLine}</p>` : ""}
  </header>
  ${this.renderSummary(cv)}
  ${this.renderChips("Core Competencies", cv.coreCompetencies)}
  ${this.renderExperience(cv.experience)}
  ${this.renderList("Education", cv.education)}
  ${this.renderList("Certifications", cv.certifications)}
  ${this.renderList("Professional Registrations", cv.professionalRegistrations)}
  ${this.renderChips("Key Skills", cv.keySkills)}
  ${cv.closingNote ? `<p class="closing">${escapeHtml(cv.closingNote)}</p>` : ""}
</div>
</body>
</html>`;
  }

  private buildContactLine(cv: NixGeneratedCv): string {
    const parts = [cv.contact.email, cv.contact.phone, cv.contact.linkedin]
      .filter((p): p is string => Boolean(p && p.trim().length > 0))
      .map((p) => escapeHtml(p));
    return parts.join("  •  ");
  }

  private renderSummary(cv: NixGeneratedCv): string {
    const summary = cv.professionalSummary;
    if (!summary || summary.trim().length === 0) {
      return "";
    }
    return `<section class="section">
  <h2 class="section-title">Professional Summary</h2>
  <p class="summary">${escapeHtml(summary)}</p>
</section>`;
  }

  private renderChips(title: string, values: string[]): string {
    if (!values || values.length === 0) {
      return "";
    }
    const chips = values
      .filter((v) => Boolean(v && v.trim().length > 0))
      .map((v) => `<span class="chip">${escapeHtml(v)}</span>`)
      .join("");
    if (chips.length === 0) {
      return "";
    }
    return `<section class="section">
  <h2 class="section-title">${escapeHtml(title)}</h2>
  <div class="chips">${chips}</div>
</section>`;
  }

  private renderList(title: string, values: string[]): string {
    if (!values || values.length === 0) {
      return "";
    }
    const items = values
      .filter((v) => Boolean(v && v.trim().length > 0))
      .map((v) => `<li>${escapeHtml(v)}</li>`)
      .join("");
    if (items.length === 0) {
      return "";
    }
    return `<section class="section">
  <h2 class="section-title">${escapeHtml(title)}</h2>
  <ul class="plain">${items}</ul>
</section>`;
  }

  private renderExperience(experience: NixGeneratedCvExperience[]): string {
    if (!experience || experience.length === 0) {
      return "";
    }
    const items = experience
      .map((exp) => {
        const bullets = exp.bullets
          .filter((b) => Boolean(b && b.trim().length > 0))
          .map((b) => `<li>${escapeHtml(b)}</li>`)
          .join("");
        const bulletsHtml = bullets.length > 0 ? `<ul class="bullets">${bullets}</ul>` : "";
        const locationHtml = exp.location
          ? `<span class="exp-location"> · ${escapeHtml(exp.location)}</span>`
          : "";
        return `<div class="experience-item">
  <div class="exp-head">
    <div>
      <p class="exp-role">${escapeHtml(exp.role)}</p>
      <p class="exp-employer">${escapeHtml(exp.employer)}${locationHtml}</p>
    </div>
    <span class="exp-period">${escapeHtml(exp.period)}</span>
  </div>
  ${bulletsHtml}
</div>`;
      })
      .join("");
    return `<section class="section">
  <h2 class="section-title">Experience</h2>
  ${items}
</section>`;
  }
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
