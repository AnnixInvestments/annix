import { randomBytes } from "node:crypto";
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "../email/email.service";
import { uploadDocument } from "../lib/app-storage-helper";
import { now } from "../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../storage/storage.interface";
import { RubberAccountSignOff, SignOffStatus } from "./entities/rubber-account-sign-off.entity";
import { RubberCompany } from "./entities/rubber-company.entity";
import {
  MonthlyAccountStatus,
  MonthlyAccountType,
  RubberMonthlyAccount,
} from "./entities/rubber-monthly-account.entity";
import {
  ExtractedTaxInvoiceData,
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "./entities/rubber-tax-invoice.entity";
import { RubberAccountingPdfService } from "./rubber-accounting-pdf.service";
import { RubberCompanyDirectorService } from "./rubber-company-director.service";

export interface InvoiceLineDto {
  id: number;
  invoiceNumber: string;
  invoiceDate: string | null;
  totalAmount: number;
  vatAmount: number;
  isCreditNote: boolean;
  extractedData: ExtractedTaxInvoiceData | null;
}

export interface CompanyAccountDto {
  companyId: number;
  companyName: string;
  discountPercent: number;
  invoices: InvoiceLineDto[];
  subtotal: number;
  creditTotal: number;
  balance: number;
  discountAmount: number;
  vatTotal: number;
  amountPayable: number;
}

export interface MonthlyAccountDataDto {
  year: number;
  month: number;
  accountType: MonthlyAccountType;
  companies: CompanyAccountDto[];
  grandTotal: number;
  grandVat: number;
  grandPayable: number;
}

export interface MonthlyAccountDto {
  id: number;
  firebaseUid: string;
  periodYear: number;
  periodMonth: number;
  accountType: string;
  status: string;
  pdfPath: string | null;
  generatedAt: string | null;
  generatedBy: string | null;
  signOffs: SignOffDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SignOffDto {
  id: number;
  directorName: string;
  directorEmail: string;
  status: string;
  signedAt: string | null;
  notes: string | null;
}

@Injectable()
export class RubberAccountingService {
  private readonly logger = new Logger(RubberAccountingService.name);

  constructor(
    @InjectRepository(RubberTaxInvoice)
    private readonly taxInvoiceRepository: Repository<RubberTaxInvoice>,
    @InjectRepository(RubberCompany)
    private readonly companyRepository: Repository<RubberCompany>,
    @InjectRepository(RubberMonthlyAccount)
    private readonly monthlyAccountRepository: Repository<RubberMonthlyAccount>,
    @InjectRepository(RubberAccountSignOff)
    private readonly signOffRepository: Repository<RubberAccountSignOff>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly pdfService: RubberAccountingPdfService,
    private readonly directorService: RubberCompanyDirectorService,
    private readonly emailService: EmailService,
  ) {}

  async monthlyPayable(
    year: number,
    month: number,
    companyId?: number,
  ): Promise<MonthlyAccountDataDto> {
    return this.monthlyAccountData(
      year,
      month,
      TaxInvoiceType.SUPPLIER,
      MonthlyAccountType.PAYABLE,
      companyId,
    );
  }

  async monthlyReceivable(
    year: number,
    month: number,
    companyId?: number,
  ): Promise<MonthlyAccountDataDto> {
    return this.monthlyAccountData(
      year,
      month,
      TaxInvoiceType.CUSTOMER,
      MonthlyAccountType.RECEIVABLE,
      companyId,
    );
  }

  async allMonthlyAccounts(filters?: {
    accountType?: MonthlyAccountType;
    status?: MonthlyAccountStatus;
    year?: number;
  }): Promise<MonthlyAccountDto[]> {
    const query = this.monthlyAccountRepository
      .createQueryBuilder("ma")
      .leftJoinAndSelect("ma.signOffs", "so", "1=1")
      .orderBy("ma.periodYear", "DESC")
      .addOrderBy("ma.periodMonth", "DESC");

    if (filters?.accountType) {
      query.andWhere("ma.account_type = :accountType", {
        accountType: filters.accountType,
      });
    }
    if (filters?.status) {
      query.andWhere("ma.status = :status", { status: filters.status });
    }
    if (filters?.year) {
      query.andWhere("ma.period_year = :year", { year: filters.year });
    }

    const accounts = await query.getMany();

    const signOffs = await this.signOffRepository.find();
    const signOffsByAccount = signOffs.reduce(
      (acc, so) => {
        const list = acc[so.monthlyAccountId] || [];
        return { ...acc, [so.monthlyAccountId]: [...list, so] };
      },
      {} as Record<number, RubberAccountSignOff[]>,
    );

    return accounts.map((a) => this.mapAccountToDto(a, signOffsByAccount[a.id] || []));
  }

  async monthlyAccountById(id: number): Promise<MonthlyAccountDto | null> {
    const account = await this.monthlyAccountRepository.findOne({
      where: { id },
    });
    if (!account) return null;

    const signOffs = await this.signOffRepository.find({
      where: { monthlyAccountId: id },
    });
    return this.mapAccountToDto(account, signOffs);
  }

  async generateMonthlyAccountPdf(
    year: number,
    month: number,
    type: MonthlyAccountType,
    generatedBy: string,
  ): Promise<MonthlyAccountDto> {
    const invoiceType =
      type === MonthlyAccountType.PAYABLE ? TaxInvoiceType.SUPPLIER : TaxInvoiceType.CUSTOMER;

    const data = await this.monthlyAccountData(year, month, invoiceType, type);

    const buffer = await this.pdfService.generateAccountsPdf(data);
    const timestamp = now().toFormat("yyyyMMdd-HHmmss");
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const filename = `${type.toLowerCase()}-${period}-${timestamp}.pdf`;

    const uploadResult = await uploadDocument(
      this.storageService,
      buffer,
      filename,
      "application/pdf",
      StorageArea.AU_RUBBER,
      "accounts",
      period,
      filename,
    );

    const firebaseUid = randomBytes(16).toString("hex");
    const account = this.monthlyAccountRepository.create({
      firebaseUid,
      periodYear: year,
      periodMonth: month,
      accountType: type,
      status: MonthlyAccountStatus.GENERATED,
      pdfPath: uploadResult.path,
      generatedAt: now().toJSDate(),
      generatedBy,
      snapshotData: data as unknown as Record<string, unknown>,
    });

    const saved = await this.monthlyAccountRepository.save(account);
    this.logger.log(`Generated ${type} account PDF for ${year}-${month}: ${uploadResult.path}`);
    return this.mapAccountToDto(saved, []);
  }

  async downloadAccountPdf(id: number): Promise<Buffer> {
    const account = await this.monthlyAccountRepository.findOne({
      where: { id },
    });
    if (!account?.pdfPath) {
      throw new NotFoundException("Monthly account PDF not found");
    }
    return this.storageService.download(account.pdfPath);
  }

  async requestDirectorSignOff(monthlyAccountId: number): Promise<MonthlyAccountDto> {
    const account = await this.monthlyAccountRepository.findOne({
      where: { id: monthlyAccountId },
    });
    if (!account) {
      throw new NotFoundException("Monthly account not found");
    }

    const directors = await this.directorService.activeDirectors();
    if (directors.length === 0) {
      throw new NotFoundException("No active directors configured");
    }

    account.status = MonthlyAccountStatus.PENDING_SIGNOFF;
    await this.monthlyAccountRepository.save(account);

    let pdfBuffer: Buffer | null = null;
    if (account.pdfPath) {
      pdfBuffer = await this.storageService.download(account.pdfPath);
    }

    const signOffs = await Promise.all(
      directors.map(async (director) => {
        const token = randomBytes(32).toString("hex");
        const expiresAt = now().plus({ days: 7 }).toJSDate();

        const signOff = this.signOffRepository.create({
          monthlyAccountId,
          directorName: director.name,
          directorEmail: director.email,
          signOffToken: token,
          tokenExpiresAt: expiresAt,
        });
        const saved = await this.signOffRepository.save(signOff);

        const typeLabel =
          account.accountType === MonthlyAccountType.PAYABLE
            ? "Accounts Payable"
            : "Accounts Receivable";
        const periodLabel = `${account.periodYear}-${String(account.periodMonth).padStart(2, "0")}`;
        const signOffUrl = `${process.env.FRONTEND_URL || "https://annix.co.za"}/au-rubber/signoff/${token}`;

        const emailHtml = `
          <h2>Monthly ${typeLabel} - ${periodLabel}</h2>
          <p>Dear ${director.name},</p>
          <p>The monthly ${typeLabel.toLowerCase()} report for ${periodLabel} is ready for your review and sign-off.</p>
          <p>Please click the link below to review and approve or reject:</p>
          <p><a href="${signOffUrl}" style="display:inline-block;padding:12px 24px;background:#d97706;color:#fff;text-decoration:none;border-radius:6px;">Review & Sign Off</a></p>
          <p>This link will expire in 7 days.</p>
          <p>Regards,<br/>AU Rubber Accounting</p>
        `;

        const attachments = pdfBuffer
          ? [
              {
                filename: `${typeLabel.replace(/ /g, "-")}-${periodLabel}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ]
          : [];

        await this.emailService.sendEmail({
          to: director.email,
          subject: `[Sign-Off Required] ${typeLabel} - ${periodLabel}`,
          html: emailHtml,
          attachments,
        });

        return saved;
      }),
    );

    this.logger.log(
      `Requested sign-off for account ${monthlyAccountId} from ${directors.length} directors`,
    );
    return this.mapAccountToDto(account, signOffs);
  }

  async signOffAccount(
    token: string,
    action: "APPROVED" | "REJECTED",
    notes?: string,
  ): Promise<{ success: boolean; message: string }> {
    const signOff = await this.signOffRepository.findOne({
      where: { signOffToken: token },
    });

    if (!signOff) {
      return { success: false, message: "Invalid sign-off token" };
    }

    if (signOff.tokenExpiresAt < now().toJSDate()) {
      return { success: false, message: "Sign-off token has expired" };
    }

    if (signOff.status !== SignOffStatus.PENDING) {
      return {
        success: false,
        message: `Already ${signOff.status.toLowerCase()}`,
      };
    }

    signOff.status = action === "APPROVED" ? SignOffStatus.APPROVED : SignOffStatus.REJECTED;
    signOff.signedAt = now().toJSDate();
    signOff.notes = notes || null;
    await this.signOffRepository.save(signOff);

    const allSignOffs = await this.signOffRepository.find({
      where: { monthlyAccountId: signOff.monthlyAccountId },
    });
    const allApproved = allSignOffs.every((s) => s.status === SignOffStatus.APPROVED);

    if (allApproved) {
      await this.monthlyAccountRepository.update(signOff.monthlyAccountId, {
        status: MonthlyAccountStatus.SIGNED_OFF,
      });
    }

    return { success: true, message: `Sign-off ${action.toLowerCase()} recorded` };
  }

  async signOffDetails(token: string): Promise<{
    signOff: SignOffDto;
    account: MonthlyAccountDto;
    pdfUrl: string | null;
  } | null> {
    const signOff = await this.signOffRepository.findOne({
      where: { signOffToken: token },
    });
    if (!signOff) return null;

    const account = await this.monthlyAccountRepository.findOne({
      where: { id: signOff.monthlyAccountId },
    });
    if (!account) return null;

    const allSignOffs = await this.signOffRepository.find({
      where: { monthlyAccountId: account.id },
    });

    let pdfUrl: string | null = null;
    if (account.pdfPath) {
      pdfUrl = await this.storageService.presignedUrl(account.pdfPath, 3600);
    }

    return {
      signOff: this.mapSignOffToDto(signOff),
      account: this.mapAccountToDto(account, allSignOffs),
      pdfUrl,
    };
  }

  private async monthlyAccountData(
    year: number,
    month: number,
    invoiceType: TaxInvoiceType,
    accountType: MonthlyAccountType,
    companyId?: number,
  ): Promise<MonthlyAccountDataDto> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const query = this.taxInvoiceRepository
      .createQueryBuilder("inv")
      .leftJoinAndSelect("inv.company", "company")
      .where("inv.invoice_type = :invoiceType", { invoiceType })
      .andWhere("inv.status = :status", { status: TaxInvoiceStatus.APPROVED })
      .andWhere("inv.invoice_date >= :startDate", { startDate })
      .andWhere("inv.invoice_date < :endDate", { endDate })
      .andWhere("inv.version_status = :versionStatus", {
        versionStatus: "ACTIVE",
      })
      .orderBy("company.name", "ASC")
      .addOrderBy("inv.invoice_date", "ASC");

    if (companyId) {
      query.andWhere("inv.company_id = :companyId", { companyId });
    }

    const invoices = await query.getMany();

    const grouped = invoices.reduce(
      (acc, inv) => {
        const cId = inv.companyId;
        const existing = acc[cId] || {
          company: inv.company,
          invoices: [] as RubberTaxInvoice[],
        };
        return {
          ...acc,
          [cId]: {
            ...existing,
            invoices: [...existing.invoices, inv],
          },
        };
      },
      {} as Record<number, { company: RubberCompany; invoices: RubberTaxInvoice[] }>,
    );

    const companies: CompanyAccountDto[] = Object.values(grouped).map(
      ({ company, invoices: companyInvoices }) => {
        const discountPercent = parseFloat(company.discountPercent || "0");

        const invoiceLines: InvoiceLineDto[] = companyInvoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate ? inv.invoiceDate.toISOString().split("T")[0] : null,
          totalAmount: parseFloat(inv.totalAmount || "0"),
          vatAmount: parseFloat(inv.vatAmount || "0"),
          isCreditNote: inv.isCreditNote,
          extractedData: inv.extractedData,
        }));

        const subtotal = invoiceLines
          .filter((l) => !l.isCreditNote)
          .reduce((sum, l) => sum + l.totalAmount, 0);

        const creditTotal = invoiceLines
          .filter((l) => l.isCreditNote)
          .reduce((sum, l) => sum + Math.abs(l.totalAmount), 0);

        const balance = subtotal - creditTotal;
        const discountAmount = discountPercent > 0 ? balance * (discountPercent / 100) : 0;
        const vatTotal = invoiceLines.reduce(
          (sum, l) => sum + (l.isCreditNote ? -l.vatAmount : l.vatAmount),
          0,
        );
        const amountPayable = balance - discountAmount;

        return {
          companyId: company.id,
          companyName: company.name,
          discountPercent,
          invoices: invoiceLines,
          subtotal,
          creditTotal,
          balance,
          discountAmount,
          vatTotal,
          amountPayable,
        };
      },
    );

    const grandTotal = companies.reduce((s, c) => s + c.balance, 0);
    const grandVat = companies.reduce((s, c) => s + c.vatTotal, 0);
    const grandPayable = companies.reduce((s, c) => s + c.amountPayable, 0);

    return {
      year,
      month,
      accountType,
      companies,
      grandTotal,
      grandVat,
      grandPayable,
    };
  }

  private mapAccountToDto(
    account: RubberMonthlyAccount,
    signOffs: RubberAccountSignOff[],
  ): MonthlyAccountDto {
    return {
      id: account.id,
      firebaseUid: account.firebaseUid,
      periodYear: account.periodYear,
      periodMonth: account.periodMonth,
      accountType: account.accountType,
      status: account.status,
      pdfPath: account.pdfPath,
      generatedAt: account.generatedAt ? account.generatedAt.toISOString() : null,
      generatedBy: account.generatedBy,
      signOffs: signOffs.map((s) => this.mapSignOffToDto(s)),
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  private mapSignOffToDto(signOff: RubberAccountSignOff): SignOffDto {
    return {
      id: signOff.id,
      directorName: signOff.directorName,
      directorEmail: signOff.directorEmail,
      status: signOff.status,
      signedAt: signOff.signedAt ? signOff.signedAt.toISOString() : null,
      notes: signOff.notes,
    };
  }
}
