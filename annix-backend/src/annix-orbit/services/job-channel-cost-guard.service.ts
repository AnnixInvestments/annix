import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { now } from "../../lib/datetime";
import { JobPostingPortalPostingRepository } from "../repositories/job-posting-portal-posting.repository";

interface ChannelBudget {
  /** Monthly ceiling in the channel's currency. 0 = must be configured explicitly. */
  monthlyCeiling: number;
  /** Estimated cost of one post — used to project spend before dispatch. */
  estimatedCostPerPost: number;
}

// Paid channels default to a ZERO ceiling: nothing is spent until an admin sets
// an explicit ceiling (env JOB_CHANNEL_CEILING_<CODE>). Fail-safe by design.
const DEFAULT_BUDGETS: Record<string, ChannelBudget> = {
  indeed: { monthlyCeiling: 0, estimatedCostPerPost: 7 },
  linkedin: { monthlyCeiling: 0, estimatedCostPerPost: 15 },
  pnet: { monthlyCeiling: 0, estimatedCostPerPost: 0 },
};

/**
 * Hard, restart-safe budget cap for paid job channels. Spend is the sum of the
 * `cost` recorded on this month's distribution rows for a (company, channel),
 * so it survives restarts (unlike the in-memory rate limiter). A paid channel
 * with no configured ceiling is refused outright — we never spend without an
 * explicit budget.
 */
@Injectable()
export class JobChannelCostGuard {
  private readonly logger = new Logger(JobChannelCostGuard.name);

  constructor(
    private readonly config: ConfigService,
    private readonly portalPostingRepo: JobPostingPortalPostingRepository,
  ) {}

  ceilingFor(channelCode: string): number {
    const envKey = `JOB_CHANNEL_CEILING_${channelCode.replace(/-/g, "_").toUpperCase()}`;
    const raw = this.config.get<string>(envKey);
    if (raw !== undefined && raw.trim() !== "") {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return DEFAULT_BUDGETS[channelCode]?.monthlyCeiling ?? 0;
  }

  estimatedCost(channelCode: string): number {
    return DEFAULT_BUDGETS[channelCode]?.estimatedCostPerPost ?? 0;
  }

  /** True if dispatching one more paid post would push this month's spend over the ceiling. */
  async wouldExceedBudget(companyId: number, channelCode: string): Promise<boolean> {
    const ceiling = this.ceilingFor(channelCode);
    if (ceiling <= 0) {
      this.logger.warn(
        `Budget guard: no ceiling configured for paid channel "${channelCode}" — refusing to spend.`,
      );
      return true;
    }
    const monthStart = now().startOf("month").toJSDate();
    const spent = await this.portalPostingRepo.sumCostSince(companyId, channelCode, monthStart);
    const projected = spent + this.estimatedCost(channelCode);
    if (projected > ceiling) {
      this.logger.warn(
        `Budget guard: "${channelCode}" for company ${companyId} would spend ${projected} > ceiling ${ceiling}.`,
      );
      return true;
    }
    return false;
  }
}
