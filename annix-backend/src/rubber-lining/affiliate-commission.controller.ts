import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { now } from "../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import {
  CreateAffiliateDto,
  CreateCommissionPayoutDto,
  CreateSalesRepDto,
  UpdateAffiliateDto,
  UpdatePayoutStatusDto,
  UpdateSalesRepDto,
} from "./dto/affiliate-commission.dto";
import { Affiliate, AffiliateStatus } from "./entities/affiliate.entity";
import { CommissionPayout, PayoutStatus } from "./entities/commission-payout.entity";
import { CompanyType } from "./entities/rubber-company.entity";
import { TaxInvoiceType } from "./entities/rubber-tax-invoice.entity";
import { SalesRep, SalesRepStatus } from "./entities/sales-rep.entity";
import { AffiliateRepository } from "./repositories/affiliate.repository";
import { AffiliatePriceListRepository } from "./repositories/affiliate-price-list.repository";
import { CommissionPayoutRepository } from "./repositories/commission-payout.repository";
import { RubberCompanyRepository } from "./repositories/rubber-company.repository";
import { RubberTaxInvoiceRepository } from "./repositories/rubber-tax-invoice.repository";
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
    private readonly taxInvoiceRepository: RubberTaxInvoiceRepository,
    private readonly companyRepository: RubberCompanyRepository,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
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
      commissionPercent: dto.commissionPercent ?? 0,
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
    if (dto.commissionPercent !== undefined) affiliate.commissionPercent = dto.commissionPercent;
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
  @ApiOperation({ summary: "Upload a base price list PDF" })
  async uploadPriceList(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const result = await this.priceListService.uploadPriceList(file, req.user?.email || "unknown");
    return {
      id: result.id,
      originalFilename: result.originalFilename,
      status: result.status,
      itemCount: result.itemCount,
    };
  }

  @Get("price-lists")
  @ApiOperation({ summary: "List all base price lists" })
  async listPriceLists() {
    return this.priceListRepository.findAll();
  }

  @Get("price-lists/latest/download")
  @ApiOperation({ summary: "Download the latest processed base price list PDF" })
  async downloadLatestPriceList(@Res() res: any) {
    const latest = await this.priceListService.getLatestPriceList();
    if (!latest) {
      return res.status(404).json({ message: "No processed price list found" });
    }
    const buffer = await this.storageService.download(latest.storagePath);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${latest.originalFilename}"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Get("price-lists/latest/items")
  @ApiOperation({ summary: "Get items from the latest processed base price list" })
  async getLatestPriceListItems() {
    return this.priceListService.getLatestPriceListItems();
  }

  @Get("price-lists/:id/items")
  @ApiOperation({ summary: "Get items for a specific price list" })
  async getPriceListItems(@Param("id") id: number) {
    return this.priceListService.getPriceListItems(Number(id));
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

  @Get("cti-list")
  @ApiOperation({ summary: "List all customer tax invoices with commission payout info" })
  async ctiList(@Req() req: any): Promise<
    Array<{
      invoiceId: number;
      invoiceNumber: string;
      invoiceDate: string | null;
      customerName: string;
      totalExVat: number;
      totalAmount: number;
      status: string;
      salesRepName: string | null;
      affiliateName: string | null;
      commissionAmount: number;
      payoutStatus: string | null;
    }>
  > {
    const invoices = await this.taxInvoiceRepository.findFilteredWithRelations({
      invoiceType: TaxInvoiceType.CUSTOMER,
    });

    const result: Array<{
      invoiceId: number;
      invoiceNumber: string;
      invoiceDate: string | null;
      customerName: string;
      totalExVat: number;
      totalAmount: number;
      status: string;
      salesRepName: string | null;
      affiliateName: string | null;
      commissionAmount: number;
      payoutStatus: string | null;
    }> = [];

    for (const inv of invoices) {
      const payouts = await this.payoutRepository.findByInvoiceId(inv.id);
      const payout = payouts.length > 0 ? payouts[0] : null;

      let salesRepName: string | null = null;
      let affiliateName: string | null = null;
      if (payout) {
        if (payout.salesRepId) {
          const rep = await this.salesRepRepository.findById(payout.salesRepId);
          salesRepName = rep?.name ?? null;
        }
        if (payout.affiliateId) {
          const aff = await this.affiliateRepository.findById(payout.affiliateId);
          affiliateName = aff?.name ?? null;
        }
      }

      const total = Number(inv.totalAmount) || 0;
      const vat = Number(inv.vatAmount) || 0;
      result.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate ? inv.invoiceDate.toISOString() : null,
        customerName: inv.company?.name ?? `Company #${inv.companyId}`,
        totalExVat: total - vat,
        totalAmount: total,
        status: inv.status,
        salesRepName,
        affiliateName,
        commissionAmount: payout?.commissionAmount ?? 0,
        payoutStatus: payout?.status ?? null,
      });
    }

    result.sort((a, b) => (b.invoiceDate ?? "").localeCompare(a.invoiceDate ?? ""));
    return result;
  }

  @Post("fix-company-links")
  @ApiOperation({
    summary: "One-time fix: relink CTIs from AU Industries to Polymer Lining System",
  })
  async fixCompanyLinks(): Promise<{ moved: number }> {
    const badCompany = await this.companyRepository.findOneByNameLike("AU Industries");
    const goodCompany = await this.companyRepository.findOneByNameLike("Polymer Lining System");
    if (!badCompany) throw new NotFoundException("Could not find 'AU Industries' company");
    if (!goodCompany) throw new NotFoundException("Could not find 'Polymer Lining System' company");

    const invoices = await this.taxInvoiceRepository.findFilteredWithRelations({
      invoiceType: TaxInvoiceType.CUSTOMER,
    });

    let moved = 0;
    for (const inv of invoices) {
      if (inv.companyId === badCompany.id) {
        await this.taxInvoiceRepository.updateById(inv.id, { companyId: goodCompany.id });
        moved++;
      }
    }

    this.logger.log(
      `Fixed company links: moved ${moved} CTI(s) from "${badCompany.name}" (#${badCompany.id}) to "${goodCompany.name}" (#${goodCompany.id})`,
    );
    return { moved };
  }

  @Post("fix-invoice-customer")
  @ApiOperation({
    summary:
      "Fix specific invoices: look up extracted customer name, find or create company, re-allocate",
  })
  async fixInvoiceCustomer(
    @Body() body: { invoiceNumbers: string[] },
  ): Promise<{ fixed: Record<string, string>; errors: Record<string, string> }> {
    const invoices = await this.taxInvoiceRepository.findFilteredWithRelations({
      invoiceType: TaxInvoiceType.CUSTOMER,
    });

    const fixed: Record<string, string> = {};
    const errors: Record<string, string> = {};

    for (const num of body.invoiceNumbers) {
      const inv = invoices.find((i) => i.invoiceNumber.trim() === num.trim());
      if (!inv) {
        errors[num] = "Invoice not found";
        continue;
      }

      const extractedName = inv.extractedData?.companyName?.trim();
      if (!extractedName) {
        errors[num] = "No extracted company name on invoice";
        continue;
      }

      let company = await this.companyRepository.findOneByNameLike(extractedName);
      if (!company) {
        company = this.companyRepository.build({
          name: extractedName,
          companyType: CompanyType.CUSTOMER,
        });
        company = await this.companyRepository.create(company as any);
        this.logger.log(`Created new company "${extractedName}" (#${company.id}) from CTI #${num}`);
      }

      if (inv.companyId !== company.id) {
        await this.taxInvoiceRepository.updateById(inv.id, { companyId: company.id });
        fixed[num] = extractedName;
        this.logger.log(
          `Re-allocated invoice #${num} (${inv.id}) to "${extractedName}" (#${company.id})`,
        );
      } else {
        fixed[num] = `${extractedName} (already correct)`;
      }
    }

    return { fixed, errors };
  }

  @Post("auto-assign")
  @ApiOperation({
    summary: "Auto-assign all customer invoices to a sales rep as commission payouts",
  })
  async autoAssign(
    @Req() req: any,
    @Body() body: { salesRepId: number },
  ): Promise<{ assigned: number; skipped: number }> {
    const salesRep = await this.salesRepRepository.findById(body.salesRepId);
    if (!salesRep) {
      throw new NotFoundException("Sales rep not found");
    }

    const invoices = await this.taxInvoiceRepository.findFilteredWithRelations({
      invoiceType: TaxInvoiceType.CUSTOMER,
    });

    const companyId = this.companyId(req);
    let assigned = 0;
    let skipped = 0;

    for (const inv of invoices) {
      const existing = await this.payoutRepository.findByInvoiceId(inv.id);
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      const total = Number(inv.totalAmount) || 0;
      const companyName = inv.company?.name ?? `Company #${inv.companyId}`;
      const payout = this.payoutRepository.build({
        companyId,
        commissionType: "SALES_REP",
        salesRepId: body.salesRepId,
        affiliateId: null,
        invoiceId: inv.id,
        customerId: inv.companyId,
        customerName: companyName,
        invoiceNumber: inv.invoiceNumber,
        invoiceTotal: total,
        commissionRate: salesRep.commissionPercent,
        commissionAmount: (total * salesRep.commissionPercent) / 100,
        status: PayoutStatus.PENDING,
        releaseSource: "MANUAL",
        notes: null,
      });
      await this.payoutRepository.save(payout);
      assigned++;
    }

    this.logger.log(
      `Auto-assigned ${assigned} invoices to sales rep #${body.salesRepId} (${salesRep.name}), ${skipped} skipped`,
    );
    return { assigned, skipped };
  }
}
