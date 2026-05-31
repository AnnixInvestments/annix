import { Injectable } from "@nestjs/common";
import { fromISO, fromJSDate } from "../../lib/datetime";
import { SeekerApplyClick } from "../entities/seeker-apply-click.entity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { SeekerApplyClickRepository } from "../repositories/seeker-apply-click.repository";

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
  appliedAt: string;
}

function toIsoString(value: Date | string): string {
  const dt = typeof value === "string" ? fromISO(value) : fromJSDate(value);
  return dt.isValid ? (dt.toISO() ?? "") : "";
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

    const seen = new Set<string>();
    const deduped = clicks.filter((click) => {
      const key =
        click.externalJobId !== null
          ? `job:${click.externalJobId}`
          : `url:${click.sourceUrl ?? click.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return Promise.all(deduped.map((click) => this.toApplication(click)));
  }

  private async toApplication(click: SeekerApplyClick): Promise<SeekerApplication> {
    const appliedAt = toIsoString(click.clickedAt as unknown as Date | string);
    if (click.externalJobId !== null) {
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
          appliedAt,
        };
      }
    }
    return {
      id: click.id,
      externalJobId: click.externalJobId,
      title: "Job application",
      company: null,
      location: null,
      sourceUrl: click.sourceUrl,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      appliedAt,
    };
  }
}
