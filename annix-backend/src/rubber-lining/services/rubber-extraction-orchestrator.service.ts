import { Injectable, Logger } from "@nestjs/common";
import { extractTextFromPdf, extractTextFromWord } from "../../lib/document-extraction";
import { DeliveryNoteType } from "../entities/rubber-delivery-note.entity";
import { SupplierCocType } from "../entities/rubber-supplier-coc.entity";
import { TaxInvoiceType } from "../entities/rubber-tax-invoice.entity";
import { RubberAuCocReadinessService } from "../rubber-au-coc-readiness.service";
import { RubberCocService } from "../rubber-coc.service";
import { RubberCocExtractionService } from "../rubber-coc-extraction.service";
import { RubberDeliveryNoteService } from "../rubber-delivery-note.service";
import { RubberTaxInvoiceService } from "../rubber-tax-invoice.service";

@Injectable()
export class RubberExtractionOrchestratorService {
  private readonly logger = new Logger(RubberExtractionOrchestratorService.name);

  constructor(
    private readonly cocService: RubberCocService,
    private readonly cocExtractionService: RubberCocExtractionService,
    private readonly taxInvoiceService: RubberTaxInvoiceService,
    private readonly deliveryNoteService: RubberDeliveryNoteService,
    private readonly auCocReadinessService: RubberAuCocReadinessService,
  ) {}

  triggerCocExtraction(
    cocId: number,
    cocType: SupplierCocType,
    pdfText: string,
    pdfBuffer?: Buffer,
  ): void {
    this.cocService
      .correctionHintsForCoc(cocId)
      .then((hints) => this.cocExtractionService.extractByType(cocType, pdfText, hints, pdfBuffer))
      .then(async (result) => {
        if (result?.data) {
          await this.cocService.setExtractedData(cocId, result.data);
          this.logger.log(`Auto-extracted data for CoC ${cocId} in ${result.processingTimeMs}ms`);
        }
      })
      .catch((error) => {
        this.logger.error(`Auto-extraction failed for CoC ${cocId}: ${error.message}`);
      });
  }

  triggerTaxInvoiceExtraction(
    invoiceId: number,
    fileBuffer: Buffer,
    originalFilename: string,
    companyName: string | null,
  ): void {
    const ext = originalFilename.split(".").pop()?.toLowerCase() || "";
    const isPdf = ext === "pdf";

    (async () => {
      try {
        const invoiceMeta = await this.taxInvoiceService.taxInvoiceById(invoiceId);
        const invoiceType = invoiceMeta?.invoiceType ?? TaxInvoiceType.SUPPLIER;
        const correctionHints = companyName
          ? await this.taxInvoiceService.correctionHintsForSupplier(companyName)
          : null;

        if (isPdf) {
          const extractionResult = await this.cocExtractionService.extractTaxInvoiceFromImages(
            fileBuffer,
            correctionHints,
            invoiceType,
          );
          const invoices = extractionResult.invoices ?? [extractionResult.data];
          if (invoices.length > 1) {
            const splitResult = await this.taxInvoiceService.splitTaxInvoiceExtraction(
              invoiceId,
              invoices,
            );
            this.logger.log(
              `Auto-extracted Tax Invoice ${invoiceId} via Vision in ${extractionResult.processingTimeMs}ms — split into ${splitResult.taxInvoiceIds.length} invoices: ${splitResult.taxInvoiceIds.join(", ")}`,
            );
          } else {
            await this.taxInvoiceService.setExtractedData(invoiceId, extractionResult.data);
            this.logger.log(
              `Auto-extracted Tax Invoice ${invoiceId} via Vision in ${extractionResult.processingTimeMs}ms`,
            );
          }
        } else {
          const docText = await extractTextFromWord(fileBuffer);
          if (docText.length >= 20) {
            const extractionResult = await this.cocExtractionService.extractTaxInvoice(
              docText,
              correctionHints,
              invoiceType,
            );
            await this.taxInvoiceService.setExtractedData(invoiceId, extractionResult.data);
            this.logger.log(
              `Auto-extracted Tax Invoice ${invoiceId} from document in ${extractionResult.processingTimeMs}ms`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to auto-extract Tax Invoice ${invoiceId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })();
  }

  triggerDeliveryNoteExtraction(
    deliveryNoteId: number,
    pdfBuffer: Buffer,
    dnType: DeliveryNoteType,
  ): void {
    (async () => {
      try {
        const isRoll = dnType === DeliveryNoteType.ROLL;

        const extractedData = await (async () => {
          if (isRoll) {
            const customerResult =
              await this.cocExtractionService.extractCustomerDeliveryNoteFromImages(pdfBuffer);

            const supplierDns = customerResult.deliveryNotes.filter((dn) => {
              const supplier = (dn.supplierName || "").toLowerCase();
              const isCdn = supplier.includes("au industrie") || supplier.includes("au industries");
              if (isCdn) {
                this.logger.log(
                  `[SupplierDN] Filtering out customer DN "${dn.deliveryNoteNumber}" (supplier: ${dn.supplierName}) from supplier extraction`,
                );
              }
              return !isCdn;
            });
            const dnsToProcess =
              supplierDns.length > 0 ? supplierDns : customerResult.deliveryNotes;

            const allRolls = dnsToProcess.flatMap((dn, dnIdx) =>
              (dn.lineItems || [])
                .filter((item) => item != null && typeof item === "object")
                .map((item) => ({
                  rollNumber: item.rollNumber ?? null,
                  compoundCode: item.compoundCode ?? null,
                  thicknessMm: item.thicknessMm ?? null,
                  widthMm: item.widthMm ?? null,
                  lengthM: item.lengthM ?? null,
                  weightKg: item.actualWeightKg ?? null,
                  areaSqM:
                    item.widthMm && item.lengthM ? (item.widthMm * item.lengthM) / 1000 : null,
                  deliveryNoteNumber: dn.deliveryNoteNumber ?? null,
                  deliveryDate: dn.deliveryDate ?? null,
                  customerName: dn.customerName ?? null,
                  customerReference: dn.customerReference ?? null,
                  supplierName: dn.supplierName ?? null,
                  pageNumber: dnIdx + 1,
                })),
            );

            const podPageNumbers = this.resolvePodPageNumbersByOrder(
              customerResult.podPages,
              dnsToProcess,
            );
            const dnMetadata = dnsToProcess[0];
            const dnNumber = dnMetadata?.deliveryNoteNumber || null;
            if (dnNumber && podPageNumbers[dnNumber]) {
              await this.deliveryNoteService.setPodPageNumbers(
                deliveryNoteId,
                podPageNumbers[dnNumber],
              );
            }

            return {
              deliveryNoteNumber: dnMetadata?.deliveryNoteNumber ?? null,
              deliveryDate: dnMetadata?.deliveryDate ?? null,
              customerName: dnMetadata?.customerName ?? null,
              customerReference: dnMetadata?.customerReference ?? null,
              supplierName: dnMetadata?.supplierName ?? null,
              rolls: allRolls,
            };
          } else {
            const pdfText = await extractTextFromPdf(pdfBuffer);
            const useOcr = pdfText.length < 50;
            const extractionResult = useOcr
              ? await this.cocExtractionService.extractDeliveryNoteFromImages(pdfBuffer)
              : await this.cocExtractionService.extractDeliveryNote(pdfText);
            return extractionResult.data;
          }
        })();

        await this.deliveryNoteService.setExtractedData(deliveryNoteId, extractedData);
        this.logger.log(`Auto-extracted delivery note ${deliveryNoteId}`);

        const splitResult = await this.deliveryNoteService.acceptExtractAndSplit(deliveryNoteId);
        if (splitResult.deliveryNoteIds.length > 1) {
          this.logger.log(
            `Auto-split delivery note ${deliveryNoteId} into ${splitResult.deliveryNoteIds.length} notes: ${splitResult.deliveryNoteIds.join(", ")}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to auto-extract delivery note ${deliveryNoteId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })();
  }

  triggerReadinessCheckForCoc(cocId: number): void {
    this.auCocReadinessService.checkAndAutoGenerateForCoc(cocId).catch((error) => {
      this.logger.error(
        `Readiness check after graph link to CoC ${cocId} failed: ${error.message}`,
      );
    });
  }

  triggerReadinessCheckForDeliveryNote(deliveryNoteId: number): void {
    this.auCocReadinessService
      .checkAndAutoGenerateForDeliveryNote(deliveryNoteId)
      .catch((error) => {
        this.logger.error(
          `Readiness check after DN ${deliveryNoteId} creation failed: ${error.message}`,
        );
      });
  }

  private resolvePodPageNumbersByOrder(
    podPages: Array<{ pageNumber: number; sourcePages?: number[] }> | undefined,
    deliveryNotes: Array<{ deliveryNoteNumber?: string | null }>,
  ): Record<string, number[]> {
    if (!podPages || podPages.length === 0) {
      return {};
    }

    const result: Record<string, number[]> = {};
    const dnNumbers = deliveryNotes
      .map((dn) => dn.deliveryNoteNumber)
      .filter((n): n is string => n != null);

    if (dnNumbers.length === 1) {
      const key = dnNumbers[0];
      result[key] = podPages.map((p) => p.pageNumber);
    } else {
      podPages.forEach((pod) => {
        const sourcePages = pod.sourcePages || [];
        const matchedDn = dnNumbers.find((_dn, idx) => sourcePages.includes(idx + 1));
        if (matchedDn) {
          const existing = result[matchedDn] || [];
          result[matchedDn] = [...existing, pod.pageNumber];
        }
      });
    }

    return result;
  }
}
