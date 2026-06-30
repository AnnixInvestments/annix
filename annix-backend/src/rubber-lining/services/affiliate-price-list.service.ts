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
  elongation: string;
  sg: number;
  mpa: string;
  colour: string;
  cureType: string;
  minPrice: number;
  unit: string;
}

const COLOUR_WORDS = /^(Black|White|Red|Yellow|Blue|Green|Pink|Orange|Purple|Grey|Gray|Brown)/i;

const CURE_STR = "(?:Steam Cured|Pre(?:-|\\s)?Cured)";

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
    file: Express.Multer.File,
    uploadedBy: string,
    affiliateId?: number,
  ): Promise<AffiliatePriceList> {
    const timestamp = now().toFormat("yyyyMMdd-HHmmss");
    const period = affiliateId ? `affiliate-${affiliateId}` : "base";

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
      affiliateId: affiliateId ?? null,
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
          elongation: item.elongation,
          sg: item.sg,
          mpa: item.mpa,
          colour: item.colour,
          cureType: item.cureType,
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

  async getLatestPriceListItems(): Promise<AffiliatePriceListItem[]> {
    const lists = await this.priceListRepository.findAll();
    const processed = lists.filter((l) => l.status === PriceListStatus.PROCESSED);
    if (processed.length === 0) return [];

    const latest = processed.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
    return this.priceListItemRepository.findByPriceListId(latest.id);
  }

  async getLatestPriceList(): Promise<AffiliatePriceList | null> {
    const lists = await this.priceListRepository.findAll();
    const processed = lists.filter((l) => l.status === PriceListStatus.PROCESSED);
    if (processed.length === 0) return null;
    return processed.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
  }

  /* ───── PDF parser ───── */

  private async parsePriceListPdf(buffer: Buffer): Promise<ParsedLineItem[]> {
    const text = await extractTextFromPdf(buffer);

    this.logger.debug(`Raw PDF text:\n${text}`);

    const rawLines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    this.logger.debug(`PDF lines (${rawLines.length}):\n${rawLines.join("\n")}`);

    // ── Step 1: merge multi-line items and detect section cureType ──
    const mergedLines: string[] = [];
    let sectionCure = "";

    for (const line of rawLines) {
      // Section headers like "Steam Cured Natural Rubbers (Gold Plastic)"
      if (/steam cured|pre.?cured/i.test(line) && !/^[A-Z]{2}-/.test(line) && line.length < 80) {
        sectionCure = /pre.?cured/i.test(line) ? "pre-cured" : "uncured";
        continue;
      }

      // Skip column header lines
      if (this.isTableHeader(line)) continue;

      // Standalone price line — append to previous item
      if (/^R\s*[\d,]+\.?\d*\s*$/.test(line) && mergedLines.length > 0) {
        mergedLines[mergedLines.length - 1] += line;
        continue;
      }

      // Continuation line (starts with digit or non-code text)
      if (!/^[A-Z]{2}-/.test(line) && mergedLines.length > 0) {
        mergedLines[mergedLines.length - 1] += line;
        continue;
      }

      // Product line (starts with code like SG-A, SC-C)
      if (/^[A-Z]{2}-/.test(line)) {
        mergedLines.push(line);
      }
    }

    this.logger.debug(`Merged into ${mergedLines.length} lines`);

    // ── Step 2: parse each merged row right-to-left ──
    const items: ParsedLineItem[] = [];
    for (const line of mergedLines) {
      const item = this.parseRow(line, sectionCure);
      if (item) items.push(item);
    }

    this.logger.log(`Parsed ${items.length} items from price list PDF`);
    return items;
  }

  private parseRow(line: string, sectionCure: string): ParsedLineItem | null {
    let r = line;

    // ── 1. Price — last "R..." on the line ──
    const priceIdx = r.toLowerCase().lastIndexOf("r");
    if (priceIdx < 1) return null;
    const afterR = r.slice(priceIdx + 1).trim();
    const priceNum = afterR.match(/^([\d,]+\.?\d*)/);
    if (!priceNum) return null;
    const price = parseFloat(priceNum[1].replace(/,/g, ""));
    if (Number.isNaN(price) || price <= 0) return null;
    r = r.slice(0, priceIdx).trim();

    // ── 2. SG — decimal number at end ──
    const sgMatch = r.match(/([\d.]+)\s*$/);
    let sg = 0;
    if (sgMatch) {
      const s = parseFloat(sgMatch[1]);
      if (!Number.isNaN(s)) {
        sg = s;
        r = r.slice(0, r.length - sgMatch[1].length);
      }
    }

    // ── 3. Elongation — "X% min" or bare "X%" at end ──
    let elongation = "";
    const elMatch = r.match(/(\d+%\s*min)\s*$/i);
    if (elMatch) {
      elongation = elMatch[1].trim();
      r = r.slice(0, r.length - elMatch[1].length);
    } else {
      const elMatch2 = r.match(/(\d+%)\s*$/);
      if (elMatch2) {
        elongation = elMatch2[1].trim();
        r = r.slice(0, r.length - elMatch2[1].length);
      }
    }

    // ── 4. Grade / MPa — "XxxNN MPA min" at end ──
    let mpa = "";
    const gradeMatch = r.match(/([A-Z][a-z]*)(\d+)\s+MPA\s+min\s*$/);
    if (gradeMatch) {
      mpa = gradeMatch[2];
      r = r.slice(0, r.length - gradeMatch[0].length);
    }

    // ── 5. Parse product info at left: code + cure + colour + hardness + type ──

    // Code (e.g. SG-A38P, SC-C60CB, SC-C5-EPDM) — lazy match until "Steam" or "Pre"
    const codeMatch = r.match(/^([A-Z]{2}-[A-Z0-9-]+?)(?=Steam|Pre)/i);
    const code = codeMatch ? codeMatch[1] : "";
    if (codeMatch) r = r.slice(code.length);

    // Cure type (e.g. "Steam Cured", "Pre Cured")
    let cureType = sectionCure;
    const cureMatch = r.match(new RegExp(`^${CURE_STR}`, "i"));
    if (cureMatch) {
      cureType = /pre/i.test(cureMatch[0]) ? "pre-cured" : "uncured";
      r = r.slice(cureMatch[0].length);
    }

    // Colour
    const colourMatch = r.match(COLOUR_WORDS);
    const colour = colourMatch ? colourMatch[1] : "";
    if (colourMatch) r = r.slice(colour.length);

    // Hardness — next 1-2 digits
    const hardMatch = r.match(/^(\d{1,2})/);
    const hardness = hardMatch ? hardMatch[1] : "";
    if (hardMatch) r = r.slice(hardMatch[1].length);

    // Everything remaining is the product type / compound name
    const type = r.trim().replace(/\/+$/, "");

    const productName = `${code} ${type}`.trim();

    return {
      productCode: code || this.extractCode(productName, 0),
      productDescription: type || productName,
      elongation: elongation.replace(/\s*min$/i, "").trim(),
      sg,
      mpa,
      colour,
      cureType: cureType || "",
      minPrice: price,
      unit: "kg",
    };
  }

  private isTableHeader(line: string): boolean {
    return (
      /^(code|item|product|description|price|rate|qty|page|date|prepared|terms|unit|no\.|compound)/i.test(
        line,
      ) ||
      /^[\d\s.,\-–—/:|]+$/.test(line) ||
      line.length < 5
    );
  }

  private extractCode(description: string, fallbackIndex: number): string {
    const first = description.split(/\s+/)[0];
    if (
      first &&
      /[A-Za-z]/.test(first) &&
      /\d/.test(first) &&
      first.length >= 2 &&
      first.length <= 20
    ) {
      return first.replace(/[^A-Za-z0-9\-_./]/g, "");
    }
    const codeWord = description.match(/\b([A-Za-z]+[\d][A-Za-z0-9\-_./]{1,18})\b/);
    if (codeWord) return codeWord[1];
    return `ITEM-${fallbackIndex + 1}`;
  }
}
