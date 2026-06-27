import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { fromISO, now } from "../lib/datetime";
import type { CreatePromoCodeDto, UpdatePromoCodeDto } from "./dto/promo-code.dto";
import { PromoCode } from "./entities/promo-code.entity";
import { PromoCodeRedemption } from "./entities/promo-code-redemption.entity";
import { PromoCodeRepository } from "./repositories/promo-code.repository";
import { PromoCodeRedemptionRepository } from "./repositories/promo-code-redemption.repository";

export interface PromoEvaluationContext {
  code: string;
  moduleKey: string;
  companyId: number;
  tierKey: string;
  billingCycle: "monthly" | "annual";
  grossCents: number;
}

export interface PromoEvaluation {
  valid: boolean;
  reason: string | null;
  discountCents: number;
  promoCodeId: number | null;
  discountDuration: string | null;
  durationMonths: number | null;
}

@Injectable()
export class PromoCodeService {
  constructor(
    private readonly promoRepo: PromoCodeRepository,
    private readonly redemptionRepo: PromoCodeRedemptionRepository,
  ) {}

  list(): Promise<PromoCode[]> {
    return this.promoRepo.allOrderedByCreatedAt();
  }

  redemptions(promoCodeId: number): Promise<PromoCodeRedemption[]> {
    return this.redemptionRepo.forPromoCode(promoCodeId);
  }

  async create(dto: CreatePromoCodeDto, createdById: number | null): Promise<PromoCode> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.promoRepo.findByCode(code);
    if (existing) {
      throw new BadRequestException(`A promo code "${code}" already exists.`);
    }
    this.assertValidDiscount(dto.discountType, dto.discountValue);
    return this.promoRepo.create({
      code,
      description: dto.description ?? "",
      moduleKey: dto.moduleKey ?? null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      appliesToTiers: dto.appliesToTiers ?? [],
      assignedCompanyIds: dto.assignedCompanyIds ?? [],
      billingCycle: dto.billingCycle ?? "any",
      discountDuration: dto.discountDuration ?? "first_payment",
      durationMonths: dto.durationMonths ?? null,
      grantsTier: dto.grantsTier ?? null,
      maxRedemptions: dto.maxRedemptions ?? null,
      validFrom: dto.validFrom ? fromISO(dto.validFrom).toJSDate() : null,
      validUntil: dto.validUntil ? fromISO(dto.validUntil).toJSDate() : null,
      active: dto.active ?? true,
      createdById,
    });
  }

  async update(id: number, dto: UpdatePromoCodeDto): Promise<PromoCode> {
    const promo = await this.promoRepo.findById(id);
    if (!promo) {
      throw new NotFoundException(`Promo code ${id} not found.`);
    }
    if (typeof dto.description === "string") {
      promo.description = dto.description;
    }
    if (typeof dto.discountValue === "number") {
      promo.discountValue = dto.discountValue;
    }
    if (dto.discountType) {
      promo.discountType = dto.discountType;
    }
    this.assertValidDiscount(promo.discountType, promo.discountValue);
    if (Array.isArray(dto.appliesToTiers)) {
      promo.appliesToTiers = dto.appliesToTiers;
    }
    if (Array.isArray(dto.assignedCompanyIds)) {
      promo.assignedCompanyIds = dto.assignedCompanyIds;
    }
    if (dto.billingCycle) {
      promo.billingCycle = dto.billingCycle;
    }
    if (dto.discountDuration) {
      promo.discountDuration = dto.discountDuration;
    }
    if (dto.durationMonths !== undefined) {
      promo.durationMonths = dto.durationMonths;
    }
    if (dto.grantsTier !== undefined) {
      promo.grantsTier = dto.grantsTier ?? null;
    }
    if (dto.maxRedemptions !== undefined) {
      promo.maxRedemptions = dto.maxRedemptions;
    }
    if (dto.validFrom !== undefined) {
      promo.validFrom = dto.validFrom ? fromISO(dto.validFrom).toJSDate() : null;
    }
    if (dto.validUntil !== undefined) {
      promo.validUntil = dto.validUntil ? fromISO(dto.validUntil).toJSDate() : null;
    }
    if (typeof dto.active === "boolean") {
      promo.active = dto.active;
    }
    return this.promoRepo.save(promo);
  }

  async remove(id: number): Promise<void> {
    await this.promoRepo.deleteById(id);
  }

  async evaluate(context: PromoEvaluationContext): Promise<PromoEvaluation> {
    const code = context.code.trim().toUpperCase();
    const promo = await this.promoRepo.findByCode(code);
    const invalid = (reason: string): PromoEvaluation => ({
      valid: false,
      reason,
      discountCents: 0,
      promoCodeId: null,
      discountDuration: null,
      durationMonths: null,
    });

    if (!promo?.active) {
      return invalid("This code is not valid.");
    }
    const current = now().toJSDate();
    if (promo.validFrom && promo.validFrom > current) {
      return invalid("This code is not active yet.");
    }
    if (promo.validUntil && promo.validUntil < current) {
      return invalid("This code has expired.");
    }
    if (promo.maxRedemptions !== null && promo.timesRedeemed >= promo.maxRedemptions) {
      return invalid("This code has been fully redeemed.");
    }
    if (promo.moduleKey && promo.moduleKey !== context.moduleKey) {
      return invalid("This code does not apply here.");
    }
    if (
      promo.assignedCompanyIds.length > 0 &&
      !promo.assignedCompanyIds.includes(context.companyId)
    ) {
      return invalid("This code is not available for your account.");
    }
    if (promo.appliesToTiers.length > 0 && !promo.appliesToTiers.includes(context.tierKey)) {
      return invalid("This code does not apply to the selected plan.");
    }
    if (promo.billingCycle !== "any" && promo.billingCycle !== context.billingCycle) {
      return invalid("This code applies to a different billing cycle.");
    }
    const already = await this.redemptionRepo.findByPromoAndCompany(promo.id, context.companyId);
    if (already) {
      return invalid("You have already used this code.");
    }
    return {
      valid: true,
      reason: null,
      discountCents: this.computeDiscount(promo, context.grossCents),
      promoCodeId: promo.id,
      discountDuration: promo.discountDuration,
      durationMonths: promo.durationMonths,
    };
  }

  async redeem(
    promoCodeId: number,
    companyId: number,
    subscriptionId: number | null,
    discountCents: number,
  ): Promise<PromoCodeRedemption> {
    // Per-company redemption is enforced atomically by the unique
    // (promoCodeId, companyId) index (#406 lg-10) — create first so concurrent
    // same-company redeems can't both succeed, then claim the global slot and
    // compensate if the global cap was already reached.
    let redemption: PromoCodeRedemption;
    try {
      redemption = await this.redemptionRepo.create({
        promoCodeId,
        companyId,
        subscriptionId,
        discountAppliedCents: discountCents,
      });
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new BadRequestException("This code has already been redeemed by your company.");
      }
      throw error;
    }

    const affected = await this.promoRepo.incrementRedemptionWhenAvailable(promoCodeId);
    if (affected === 0) {
      await this.redemptionRepo.remove(redemption);
      throw new BadRequestException("This code has been fully redeemed.");
    }
    return redemption;
  }

  private assertValidDiscount(discountType: string, discountValue: number): void {
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      throw new BadRequestException("Discount value must be a non-negative number.");
    }
    if (discountType === "percentage" && discountValue > 100) {
      throw new BadRequestException("A percentage discount cannot exceed 100%.");
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === "object" && error !== null && (error as { code?: number }).code === 11000
    );
  }

  private computeDiscount(promo: PromoCode, grossCents: number): number {
    if (promo.discountType === "percentage") {
      return Math.max(
        0,
        Math.min(grossCents, Math.round((grossCents * promo.discountValue) / 100)),
      );
    }
    return Math.max(0, Math.min(promo.discountValue, grossCents));
  }
}
