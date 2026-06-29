import { Injectable, Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { CommissionPayout, PayoutStatus } from "../entities/commission-payout.entity";
import { AffiliateRepository } from "../repositories/affiliate.repository";
import { AffiliatePriceListRepository } from "../repositories/affiliate-price-list.repository";
import { AffiliatePriceListItemRepository } from "../repositories/affiliate-price-list-item.repository";
import { CommissionPayoutRepository } from "../repositories/commission-payout.repository";
import { SalesRepRepository } from "../repositories/sales-rep.repository";

@Injectable()
export class AffiliateCommissionService {
  private readonly logger = new Logger(AffiliateCommissionService.name);

  constructor(
    private readonly salesRepRepository: SalesRepRepository,
    private readonly affiliateRepository: AffiliateRepository,
    private readonly priceListRepository: AffiliatePriceListRepository,
    private readonly priceListItemRepository: AffiliatePriceListItemRepository,
    private readonly payoutRepository: CommissionPayoutRepository,
  ) {}

  async calculateRepCommission(
    companyId: number,
    salesRepId: number,
    invoiceTotal: number,
  ): Promise<number> {
    const rep = await this.salesRepRepository.findById(salesRepId);
    if (!rep || rep.status !== "ACTIVE") return 0;
    return (invoiceTotal * rep.commissionPercent) / 100;
  }

  async calculateAffiliateCommission(
    affiliateId: number,
    productCode: string,
    salePrice: number,
  ): Promise<number> {
    const priceList = await this.priceListRepository.findByAffiliateId(affiliateId);
    const processed = priceList.filter((l) => l.status === "PROCESSED");
    if (processed.length === 0) return 0;

    const latest = processed.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
    const latestItems = await this.priceListItemRepository.findByPriceListId(latest.id);
    const match = latestItems.find(
      (i) => i.productCode.toLowerCase() === productCode.toLowerCase(),
    );
    if (!match) return 0;

    const diff = salePrice - match.minPrice;
    return diff > 0 ? diff : 0;
  }

  async createPayout(data: {
    companyId: number;
    commissionType: string;
    salesRepId?: number;
    affiliateId?: number;
    invoiceId: number;
    customerId: number;
    customerName: string;
    invoiceNumber: string;
    invoiceTotal: number;
    commissionRate: number;
    commissionAmount: number;
    notes?: string;
  }): Promise<CommissionPayout> {
    const payout = this.payoutRepository.build({
      companyId: data.companyId,
      commissionType: data.commissionType,
      salesRepId: data.salesRepId ?? null,
      affiliateId: data.affiliateId ?? null,
      invoiceId: data.invoiceId,
      customerId: data.customerId,
      customerName: data.customerName,
      invoiceNumber: data.invoiceNumber,
      invoiceTotal: data.invoiceTotal,
      commissionRate: data.commissionRate,
      commissionAmount: data.commissionAmount,
      status: PayoutStatus.PENDING,
      releaseSource: "MANUAL" as string,
      notes: data.notes ?? null,
    });

    return this.payoutRepository.save(payout);
  }

  async updatePayoutStatus(
    payoutId: number,
    status: string,
    paidBy?: string,
    notes?: string,
  ): Promise<CommissionPayout | null> {
    const payout = await this.payoutRepository.findById(payoutId);
    if (!payout) return null;

    payout.status = status;
    if (status === PayoutStatus.PAID) {
      payout.paidAt = now().toJSDate();
      payout.paidBy = paidBy ?? null;
    }
    if (notes) payout.notes = notes;

    return this.payoutRepository.save(payout);
  }

  async releasePayoutsFromRecon(
    companyId: number,
    bankReconId: number,
    payoutIds: number[],
    paidBy: string,
  ): Promise<number> {
    let released = 0;
    for (const id of payoutIds) {
      const payout = await this.payoutRepository.findById(id);
      if (payout && payout.companyId === companyId && payout.status === PayoutStatus.PENDING) {
        payout.status = PayoutStatus.APPROVED;
        payout.releaseSource = "BANK_RECON";
        payout.bankReconId = bankReconId;
        payout.paidAt = now().toJSDate();
        payout.paidBy = paidBy;
        await this.payoutRepository.save(payout);
        released++;
      }
    }
    return released;
  }

  async getPendingPayouts(companyId: number): Promise<CommissionPayout[]> {
    return this.payoutRepository.findPendingByCompanyId(companyId);
  }

  async getAllPayouts(companyId: number): Promise<CommissionPayout[]> {
    return this.payoutRepository.findByCompanyId(companyId);
  }
}
