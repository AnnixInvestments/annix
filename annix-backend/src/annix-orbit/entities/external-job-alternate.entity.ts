import { ExternalJob } from "./external-job.entity";
import { JobMarketSource } from "./job-market-source.entity";

export class ExternalJobAlternate {
  id: number;

  canonicalJob: ExternalJob;

  canonicalExternalJobId: number;

  source: JobMarketSource;

  sourceId: number;

  sourceExternalId: string;

  sourceUrl: string | null;

  title: string;

  company: string | null;

  locationArea: string | null;

  createdAt: Date;
}
