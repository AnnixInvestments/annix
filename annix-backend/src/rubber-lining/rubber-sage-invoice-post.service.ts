import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromJSDate, now } from "../lib/datetime";
import type {
  SageInvoiceLine,
  SagePurchaseInvoicePayload,
  SageSalesInvoicePayload,
  SageTaxType,
} from "../sage-export/sage-api.service";
import { SageApiService } from "../sage-export/sage-api.service";
import { SageConnectionService } from "../sage-export/sage-connection.service";
import { RubberCompany } from "./entities/rubber-company.entity";
import {
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "./entities/rubber-tax-invoice.entity";

export interface PostToSageResult {
  sageInvoiceId: number;
  invoiceId: number;
  invoiceNumber: string;
}

export interface BulkPostResult {
  successful: PostToSageResult[];
  failed: Array<{ invoiceId: number; invoiceNumber: string; error: string }>;
}

const DEFAULT_VAT_RATE = 15;

@Injectable()
export class RubberSageInvoicePostService {
  private readonly logger = new Logger(RubberSageInvoicePostService.name);

  constructor(
    @InjectRepository(RubberTaxInvoice)
    private readonly invoiceRepo: Repository<RubberTaxInvoice>,
    @InjectRepository(RubberCompany)
    private readonly companyRepo: Repository<RubberCompany>,
    private readonly sageApiService: SageApiService,
    private readonly sageConnectionService: SageConnectionService,
  ) {}

  async postInvoice(invoiceId: number, appKey: string): Promise<PostToSageResult> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: ["company"],
    });

    if (!invoice) {
      throw new BadRequestException("Invoice not found");
    }

    if (invoice.status !== TaxInvoiceStatus.APPROVED) {
      throw new BadRequestException("Invoice must be APPROVED before posting to Sage");
    }

    if (invoice.sageInvoiceId !== null) {
      throw new BadRequestException(
        `Invoice already posted to Sage (ID: ${invoice.sageInvoiceId})`,
      );
    }

    const company =
      invoice.company ?? (await this.companyRepo.findOneBy({ id: invoice.companyId }));

    if (!company?.sageContactId) {
      throw new BadRequestException(
        `Company "${company?.name ?? "Unknown"}" is not mapped to a Sage contact. Map it in Settings first.`,
      );
    }

    const status = await this.sageConnectionService.connectionStatus(appKey);
    if (!status.connected || !status.sageCompanyId) {
      throw new BadRequestException("Sage is not connected. Configure it in Settings first.");
    }

    const taxTypes = await this.sageConnectionService.sageTaxTypes(appKey);
    const vatTaxType = taxTypes.find((t) => Math.abs(t.Percentage - DEFAULT_VAT_RATE) < 0.01);

    const lines = this.invoiceLines(invoice, vatTaxType);

    const dateStr = invoice.invoiceDate
      ? (fromJSDate(invoice.invoiceDate).toISODate() ?? "")
      : (now().toISODate() ?? "");

    if (invoice.invoiceType === TaxInvoiceType.SUPPLIER) {
      const payload: SagePurchaseInvoicePayload = {
        SupplierId: company.sageContactId,
        Date: dateStr,
        DueDate: dateStr,
        Reference: invoice.invoiceNumber,
        Lines: lines,
      };

      this.logger.log(
        `Posting supplier invoice ${invoice.invoiceNumber} to Sage (supplier: ${company.name})`,
      );

      const result = await this.sageApiService.savePurchaseInvoice(
        status.sageUsername!,
        await this.decryptedPassword(appKey),
        status.sageCompanyId,
        payload,
      );

      await this.markPosted(invoice.id, result.ID);

      return {
        sageInvoiceId: result.ID,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      };
    } else {
      const payload: SageSalesInvoicePayload = {
        CustomerId: company.sageContactId,
        Date: dateStr,
        DueDate: dateStr,
        Reference: invoice.invoiceNumber,
        Lines: lines,
      };

      this.logger.log(
        `Posting customer invoice ${invoice.invoiceNumber} to Sage (customer: ${company.name})`,
      );

      const result = await this.sageApiService.saveSalesInvoice(
        status.sageUsername!,
        await this.decryptedPassword(appKey),
        status.sageCompanyId,
        payload,
      );

      await this.markPosted(invoice.id, result.ID);

      return {
        sageInvoiceId: result.ID,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      };
    }
  }

  async postBulk(invoiceIds: number[], appKey: string): Promise<BulkPostResult> {
    const results: BulkPostResult = { successful: [], failed: [] };

    const invoices = await this.invoiceRepo.find({
      where: invoiceIds.map((id) => ({ id })),
      relations: ["company"],
    });

    const finalResults = await invoices.reduce(async (accPromise, invoice) => {
      const acc = await accPromise;
      try {
        const result = await this.postInvoice(invoice.id, appKey);
        return { ...acc, successful: [...acc.successful, result] };
      } catch (err) {
        return {
          ...acc,
          failed: [
            ...acc.failed,
            {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              error: err instanceof Error ? err.message : "Unknown error",
            },
          ],
        };
      }
    }, Promise.resolve(results));

    this.logger.log(
      `Bulk post: ${finalResults.successful.length} succeeded, ${finalResults.failed.length} failed`,
    );

    return finalResults;
  }

  private invoiceLines(
    invoice: RubberTaxInvoice,
    vatTaxType: SageTaxType | undefined,
  ): SageInvoiceLine[] {
    const taxTypeId = vatTaxType?.ID ?? 1;
    const extractedItems = invoice.extractedData?.lineItems ?? [];

    if (extractedItems.length > 0) {
      return extractedItems.map((item) => ({
        SelectionId: 0,
        TaxTypeId: taxTypeId,
        Description: item.description,
        Quantity: item.quantity ?? 1,
        UnitPriceExclusive: item.unitPrice ?? item.amount ?? 0,
      }));
    }

    return [
      {
        SelectionId: 0,
        TaxTypeId: taxTypeId,
        Description: `Invoice ${invoice.invoiceNumber}`,
        Quantity: 1,
        UnitPriceExclusive: invoice.totalAmount ? Number(invoice.totalAmount) : 0,
      },
    ];
  }

  private async markPosted(invoiceId: number, sageInvoiceId: number): Promise<void> {
    await this.invoiceRepo.update(invoiceId, {
      sageInvoiceId,
      postedToSageAt: now().toJSDate(),
    } as unknown as RubberTaxInvoice);
  }

  private async decryptedPassword(appKey: string): Promise<string> {
    const creds = await this.sageConnectionService.credentials(appKey);
    return creds.password;
  }
}
