import { Injectable } from "@nestjs/common";
import { fromISO, fromJSDate } from "../../lib/datetime";
import { SeekerApplyClick } from "../entities/seeker-apply-click.entity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { SeekerApplyClickRepository } from "../repositories/seeker-apply-click.repository";

export const APPLICATION_STATUSES = [
  "applied",
  "interviewing",
  "rejected",
  "offer",
  "accepted",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface SeekerApplication {
  id: number;
  externalJobId: number | null;
  title: string;
  company: string | null;
  location: string | null;
  sourceUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  status: ApplicationStatus;
  notes: string | null;
  appliedAt: string;
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus;
  notes?: string | null;
}

function toIsoString(value: Date | string): string {
  const dt = typeof value === "string" ? fromISO(value) : fromJSDate(value);
  return dt.isValid ? (dt.toISO() ?? "") : "";
}

function jobKey(click: SeekerApplyClick): string {
  return click.externalJobId != null
    ? `job:${click.externalJobId}`
    : `url:${click.sourceUrl ?? click.id}`;
}

function isTracked(click: SeekerApplyClick): boolean {
  return click.status != null || click.notes != null || click.dismissed === true;
}

function resolveStatus(raw: string | null): ApplicationStatus {
  return raw != null && APPLICATION_STATUSES.includes(raw as ApplicationStatus)
    ? (raw as ApplicationStatus)
    : "applied";
}

@Injectable()
export class SeekerApplicationsService {
  constructor(
    private readonly candidateRepo: CandidateRepository,
    private readonly applyClickRepo: SeekerApplyClickRepository,
    private readonly externalJobRepo: ExternalJobRepository,
  ) {}

  async listForSeeker(email: string | null): Promise<SeekerApplication[]> {
    if (!email) return [];
    const candidates = await this.candidateRepo.findByEmail(email);
    if (candidates.length === 0) return [];

    const clicks = await this.applyClickRepo.listForCandidates(candidates.map((c) => c.id));

    // clicks arrive newest-first; keep one representative per job, preferring a
    // click that carries the seeker's own status/notes/dismissal over a bare
    // newer re-apply so edits survive subsequent clicks.
    const repByKey = new Map<string, SeekerApplyClick>();
    clicks.forEach((click) => {
      const key = jobKey(click);
      const existing = repByKey.get(key);
      if (!existing) {
        repByKey.set(key, click);
        return;
      }
      if (!isTracked(existing) && isTracked(click)) {
        repByKey.set(key, click);
      }
    });

    const visible = [...repByKey.values()].filter((click) => click.dismissed !== true);
    const applications = await Promise.all(visible.map((click) => this.toApplication(click)));
    return applications.sort((a, b) => {
      if (a.appliedAt > b.appliedAt) return -1;
      if (a.appliedAt < b.appliedAt) return 1;
      return 0;
    });
  }

  async setStatus(
    email: string | null,
    id: number,
    input: UpdateApplicationInput,
  ): Promise<boolean> {
    const click = await this.ownedClick(email, id);
    if (!click) return false;
    if (input.status !== undefined) click.status = input.status;
    if (input.notes !== undefined) click.notes = input.notes ? input.notes.trim() : null;
    await this.applyClickRepo.save(click);
    return true;
  }

  async remove(email: string | null, id: number): Promise<boolean> {
    const click = await this.ownedClick(email, id);
    if (!click) return false;
    click.dismissed = true;
    await this.applyClickRepo.save(click);
    return true;
  }

  private async ownedClick(email: string | null, id: number): Promise<SeekerApplyClick | null> {
    if (!email) return null;
    const candidates = await this.candidateRepo.findByEmail(email);
    if (candidates.length === 0) return null;
    const candidateIds = new Set(candidates.map((c) => c.id));
    const click = await this.applyClickRepo.findById(id);
    if (!click || !candidateIds.has(click.candidateId)) return null;
    return click;
  }

  private async toApplication(click: SeekerApplyClick): Promise<SeekerApplication> {
    const appliedAt = toIsoString(click.clickedAt as unknown as Date | string);
    const status = resolveStatus(click.status);
    const notes = click.notes ?? null;
    if (click.externalJobId != null) {
      const job = await this.externalJobRepo.findById(click.externalJobId);
      if (job) {
        const location = job.locationArea ?? job.locationRaw ?? null;
        const sourceUrl = click.sourceUrl ?? job.sourceUrl;
        return {
          id: click.id,
          externalJobId: click.externalJobId,
          title: job.title,
          company: job.company,
          location,
          sourceUrl,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          status,
          notes,
          appliedAt,
        };
      }
    }
    // The live job is gone (pruned / re-ingested / delisted) — fall back to the
    // snapshot captured at apply time so the application still shows what was
    // applied to, rather than a blank "Job application".
    return {
      id: click.id,
      externalJobId: click.externalJobId,
      title: click.jobTitle ?? "Job application",
      company: click.jobCompany ?? null,
      location: click.jobLocation ?? null,
      sourceUrl: click.sourceUrl,
      salaryMin: click.jobSalaryMin ?? null,
      salaryMax: click.jobSalaryMax ?? null,
      salaryCurrency: click.jobSalaryCurrency ?? null,
      status,
      notes,
      appliedAt,
    };
  }
}
