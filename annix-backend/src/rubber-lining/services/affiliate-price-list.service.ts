import { Inject, Injectable, Logger } from "@nestjs/common";
import { uploadDocument } from "../../lib/app-storage-helper";
import { now } from "../../lib/datetime";
import { extractTextFromPdf } from "../../lib/document-extraction";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { AffiliatePriceList, PriceListStatus } from "../entities/affiliate-price-list.entity";
import { AffiliatePriceListItem } from "../entities/affiliate-price-list-item.entity";
import { AffiliatePriceListRepository } from "../repositories/affiliate-price-list.repository";
import { AffiliatePriceListItemRepository } from "../repositories/affiliate-price-list-item.repository";

interface ParsedLineItem {
  productCode: string;
  productDescription: string;
  minPrice: number;
  unit: string;
}

@Injectable()
export class AffiliatePriceListService {
  private readonly logger = new Logger(AffiliatePriceListService.name);

  constructor(
    private readonly priceListRepository: AffiliatePriceListRepository,
    private readonly priceListItemRepository: AffiliatePriceListItemRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async uploadPriceList(
    affiliateId: number,
    file: Express.Multer.File,
    uploadedBy: string,
  ): Promise<AffiliatePriceList> {
    const timestamp = now().toFormat("yyyyMMdd-HHmmss");
    const period = `affiliate-${affiliateId}`;

    const uploadResult = await uploadDocument(
      this.storageService,
      file.buffer,
      file.originalname,
      file.mimetype,
      StorageArea.AU_RUBBER,
      "affiliate-price-lists",
      period,
      `${timestamp}-${file.originalname}`,
    );

    const priceList = this.priceListRepository.build({
      affiliateId,
      originalFilename: file.originalname,
      storagePath: uploadResult.path,
      status: PriceListStatus.PENDING,
      itemCount: 0,
      uploadedBy,
      uploadedAt: now().toJSDate(),
    });

    const saved = await this.priceListRepository.save(priceList);

    try {
      const items = await this.parsePriceListPdf(file.buffer);
      await this.priceListItemRepository.deleteByPriceListId(saved.id);

      for (const item of items) {
        const entity = this.priceListItemRepository.build({
          priceListId: saved.id,
          productCode: item.productCode,
          productDescription: item.productDescription,
          minPrice: item.minPrice,
          unit: item.unit,
        });
        await this.priceListItemRepository.save(entity);
      }

      saved.status = PriceListStatus.PROCESSED;
      saved.itemCount = items.length;
      await this.priceListRepository.save(saved);
      this.logger.log(`Price list ${saved.id} processed: ${items.length} items`);
    } catch (err) {
      this.logger.error(`Failed to parse price list ${saved.id}: ${err}`);
      saved.status = PriceListStatus.FAILED;
      await this.priceListRepository.save(saved);
    }

    return saved;
  }

  async getPriceListItems(priceListId: number): Promise<AffiliatePriceListItem[]> {
    return this.priceListItemRepository.findByPriceListId(priceListId);
  }

  async getLatestPriceListItems(affiliateId: number): Promise<AffiliatePriceListItem[]> {
    const lists = await this.priceListRepository.findByAffiliateId(affiliateId);
    const processed = lists.filter((l) => l.status === PriceListStatus.PROCESSED);
    if (processed.length === 0) return [];

    const latest = processed.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
    return this.priceListItemRepository.findByPriceListId(latest.id);
  }

  private async parsePriceListPdf(buffer: Buffer): Promise<ParsedLineItem[]> {
    const text = await extractTextFromPdf(buffer);

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const items: ParsedLineItem[] = [];
    const linePattern = /^(\S+)\s+(.+?)\s+R\s*([\d,]+\.?\d*)\s*(.+)?$/i;

    for (const line of lines) {
      const match = line.match(linePattern);
      if (match) {
        items.push({
          productCode: match[1],
          productDescription: match[2].trim(),
          minPrice: parseFloat(match[3].replace(/,/g, "")),
          unit: (match[4] || "each").trim().toLowerCase(),
        });
      }
    }

    if (items.length === 0) {
      const fallbackPattern = /^(\S[\S ]*\S)\s+R\s*([\d,]+\.?\d*)/gm;
      let fallbackMatch: RegExpExecArray | null;
      while ((fallbackMatch = fallbackPattern.exec(text)) !== null) {
        items.push({
          productCode: `ITEM-${items.length + 1}`,
          productDescription: fallbackMatch[1].trim(),
          minPrice: parseFloat(fallbackMatch[2].replace(/,/g, "")),
          unit: "each",
        });
      }
    }

    return items;
  }
}
