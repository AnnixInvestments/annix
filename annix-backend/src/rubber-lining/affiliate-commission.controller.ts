import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { now } from "../lib/datetime";
import {
  CreateAffiliateDto,
  CreateCommissionPayoutDto,
  CreateSalesRepDto,
  UpdateAffiliateDto,
  UpdatePayoutStatusDto,
  UpdateSalesRepDto,
  UploadPriceListDto,
} from "./dto/affiliate-commission.dto";
import { Affiliate, AffiliateStatus } from "./entities/affiliate.entity";
import { CommissionPayout, PayoutStatus } from "./entities/commission-payout.entity";
import { SalesRep, SalesRepStatus } from "./entities/sales-rep.entity";
import { AffiliateRepository } from "./repositories/affiliate.repository";
import { AffiliatePriceListRepository } from "./repositories/affiliate-price-list.repository";
import { CommissionPayoutRepository } from "./repositories/commission-payout.repository";
import { SalesRepRepository } from "./repositories/sales-rep.repository";
import { AffiliatePriceListService } from "./services/affiliate-price-list.service";

@ApiTags("Affiliate & Commission")
@ApiBearerAuth()
@Controller("rubber-lining/portal/affiliate-commission")
@UseGuards(AdminAuthGuard)
export class AffiliateCommissionController {
  private readonly logger = new Logger(AffiliateCommissionController.name);

  constructor(
    private readonly salesRepRepository: SalesRepRepository,
    private readonly affiliateRepository: AffiliateRepository,
    private readonly priceListRepository: AffiliatePriceListRepository,
    private readonly payoutRepository: CommissionPayoutRepository,
    private readonly priceListService: AffiliatePriceListService,
  ) {}

  private companyId(req: any): number {
    return Number(req.user.companyId);
  }

  /* ───── Sales Reps ───── */

  @Get("sales-reps")
  @ApiOperation({ summary: "List sales reps for the company" })
  async listSalesReps(@Req() req: any): Promise<SalesRep[]> {
    return this.salesRepRepository.findByCompanyId(this.companyId(req));
  }

  @Post("sales-reps")
  @ApiOperation({ summary: "Create a sales rep" })
  async createSalesRep(@Req() req: any, @Body() dto: CreateSalesRepDto): Promise<SalesRep> {
    const entity = this.salesRepRepository.build({
      companyId: this.companyId(req),
      name: dto.name,
      email: dto.email,
      phone: dto.phone || "",
      commissionPercent: dto.commissionPercent,
      status: SalesRepStatus.ACTIVE,
      notes: dto.notes || "",
    });
    return this.salesRepRepository.save(entity);
  }

  @Patch("sales-reps/:id")
  @ApiOperation({ summary: "Update a sales rep" })
  async updateSalesRep(
    @Param("id") id: number,
    @Body() dto: UpdateSalesRepDto,
  ): Promise<SalesRep | null> {
    const rep = await this.salesRepRepository.findById(Number(id));
    if (!rep) return null;
    if (dto.name !== undefined) rep.name = dto.name;
    if (dto.email !== undefined) rep.email = dto.email;
    if (dto.phone !== undefined) rep.phone = dto.phone;
    if (dto.commissionPercent !== undefined) rep.commissionPercent = dto.commissionPercent;
    if (dto.status !== undefined) rep.status = dto.status as SalesRepStatus;
    if (dto.notes !== undefined) rep.notes = dto.notes;
    return this.salesRepRepository.save(rep);
  }

  @Delete("sales-reps/:id")
  @ApiOperation({ summary: "Delete a sales rep" })
  async deleteSalesRep(@Param("id") id: number): Promise<{ deleted: boolean }> {
    const rep = await this.salesRepRepository.findById(Number(id));
    if (rep) {
      await this.salesRepRepository.remove(rep);
    }
    return { deleted: true };
  }

  /* ───── Affiliates ───── */

  @Get("affiliates")
  @ApiOperation({ summary: "List affiliates for the company" })
  async listAffiliates(@Req() req: any): Promise<Affiliate[]> {
    return this.affiliateRepository.findByCompanyId(this.companyId(req));
  }

  @Post("affiliates")
  @ApiOperation({ summary: "Create an affiliate" })
  async createAffiliate(@Req() req: any, @Body() dto: CreateAffiliateDto): Promise<Affiliate> {
    const entity = this.affiliateRepository.build({
      companyId: this.companyId(req),
      name: dto.name,
      contactName: dto.contactName,
      email: dto.email,
      phone: dto.phone || "",
      status: AffiliateStatus.ACTIVE,
      notes: dto.notes || "",
    });
    return this.affiliateRepository.save(entity);
  }

  @Patch("affiliates/:id")
  @ApiOperation({ summary: "Update an affiliate" })
  async updateAffiliate(
    @Param("id") id: number,
    @Body() dto: UpdateAffiliateDto,
  ): Promise<Affiliate | null> {
    const affiliate = await this.affiliateRepository.findById(Number(id));
    if (!affiliate) return null;
    if (dto.name !== undefined) affiliate.name = dto.name;
    if (dto.contactName !== undefined) affiliate.contactName = dto.contactName;
    if (dto.email !== undefined) affiliate.email = dto.email;
    if (dto.phone !== undefined) affiliate.phone = dto.phone;
    if (dto.status !== undefined) affiliate.status = dto.status as AffiliateStatus;
    if (dto.notes !== undefined) affiliate.notes = dto.notes;
    return this.affiliateRepository.save(affiliate);
  }

  @Delete("affiliates/:id")
  @ApiOperation({ summary: "Delete an affiliate" })
  async deleteAffiliate(@Param("id") id: number): Promise<{ deleted: boolean }> {
    const affiliate = await this.affiliateRepository.findById(Number(id));
    if (affiliate) {
      await this.affiliateRepository.remove(affiliate);
    }
    return { deleted: true };
  }

  /* ───── Price Lists (PDF upload) ───── */

  @Post("price-lists/upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload an affiliate price list PDF" })
  async uploadPriceList(
    @Req() req: any,
    @Body() dto: UploadPriceListDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.priceListService.uploadPriceList(
      dto.affiliateId,
      file,
      req.user?.email || "unknown",
    );
    return {
      id: result.id,
      affiliateId: result.affiliateId,
      originalFilename: result.originalFilename,
      status: result.status,
      itemCount: result.itemCount,
    };
  }

  @Get("price-lists/:affiliateId")
  @ApiOperation({ summary: "List price lists for an affiliate" })
  async listPriceLists(@Param("affiliateId") affiliateId: number) {
    return this.priceListRepository.findByAffiliateId(Number(affiliateId));
  }

  @Get("price-lists/:affiliateId/latest")
  @ApiOperation({ summary: "Get latest processed price list items for affiliate" })
  async getLatestPriceListItems(@Param("affiliateId") affiliateId: number) {
    return this.priceListService.getLatestPriceListItems(Number(affiliateId));
  }

  @Get("price-lists/:affiliateId/items/:priceListId")
  @ApiOperation({ summary: "Get items for a specific price list" })
  async getPriceListItems(@Param("priceListId") priceListId: number) {
    return this.priceListService.getPriceListItems(Number(priceListId));
  }

  /* ───── Commission Payouts ───── */

  @Get("payouts")
  @ApiOperation({ summary: "List commission payouts for the company" })
  async listPayouts(
    @Req() req: any,
    @Query("status") status?: string,
  ): Promise<CommissionPayout[]> {
    const companyId = this.companyId(req);
    if (status === "PENDING") {
      return this.payoutRepository.findPendingByCompanyId(companyId);
    }
    return this.payoutRepository.findByCompanyId(companyId);
  }

  @Post("payouts")
  @ApiOperation({ summary: "Create a commission payout record" })
  async createPayout(
    @Req() req: any,
    @Body() dto: CreateCommissionPayoutDto,
  ): Promise<CommissionPayout> {
    const entity = this.payoutRepository.build({
      companyId: this.companyId(req),
      commissionType: dto.commissionType,
      salesRepId: dto.salesRepId ?? null,
      affiliateId: dto.affiliateId ?? null,
      invoiceId: dto.invoiceId,
      customerId: dto.customerId,
      customerName: dto.customerName,
      invoiceNumber: dto.invoiceNumber,
      invoiceTotal: dto.invoiceTotal,
      commissionRate: dto.commissionRate,
      commissionAmount: dto.commissionAmount,
      status: PayoutStatus.PENDING,
      releaseSource: "MANUAL",
      notes: dto.notes ?? null,
    });
    return this.payoutRepository.save(entity);
  }

  @Patch("payouts/:id/status")
  @ApiOperation({ summary: "Update payout status (approve/pay/cancel)" })
  async updatePayoutStatus(
    @Param("id") id: number,
    @Body() dto: UpdatePayoutStatusDto,
  ): Promise<CommissionPayout | null> {
    const payout = await this.payoutRepository.findById(Number(id));
    if (!payout) return null;

    payout.status = dto.status;
    if (dto.status === PayoutStatus.PAID) {
      payout.paidAt = now().toJSDate();
      payout.paidBy = dto.paidBy ?? null;
    }
    if (dto.notes !== undefined) payout.notes = dto.notes ?? null;
    return this.payoutRepository.save(payout);
  }

  @Post("payouts/release-from-recon")
  @ApiOperation({ summary: "Release multiple payouts from a bank reconciliation" })
  async releaseFromRecon(
    @Req() req: any,
    @Body() body: { bankReconId: number; payoutIds: number[]; paidBy: string },
  ): Promise<{ released: number }> {
    let released = 0;
    for (const id of body.payoutIds) {
      const payout = await this.payoutRepository.findById(id);
      if (
        payout &&
        payout.companyId === this.companyId(req) &&
        payout.status === PayoutStatus.PENDING
      ) {
        payout.status = PayoutStatus.APPROVED;
        payout.releaseSource = "BANK_RECON";
        payout.bankReconId = body.bankReconId;
        payout.paidAt = now().toJSDate();
        payout.paidBy = body.paidBy;
        await this.payoutRepository.save(payout);
        released++;
      }
    }
    return { released };
  }
}
