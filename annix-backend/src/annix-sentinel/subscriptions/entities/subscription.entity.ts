import { Company } from "../../../platform/entities/company.entity";

export class AnnixSentinelSubscription {
  id!: number;

  companyId!: number;

  tier!: string;

  status!: string;

  trialEndsAt!: Date | null;

  currentPeriodStart!: Date | null;

  currentPeriodEnd!: Date | null;

  paystackCustomerId!: string | null;

  paystackSubscriptionCode!: string | null;

  cancelledAt!: Date | null;

  createdAt!: Date;

  updatedAt!: Date;

  company!: Company;
}
