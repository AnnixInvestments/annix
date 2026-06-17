import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CompoundDataSheet, type CompoundSpec } from "./entities/compound-data-sheet.entity";
import { CompoundDataSheetRepository } from "./repositories/compound-data-sheet.repository";

export interface CreateCompoundDataSheetDto {
  slug: string;
  name: string;
  code?: string;
  category?: string;
  polymer?: string;
  shoreHardness?: string;
  colour?: string;
  cureMethod?: string;
  shortDescription?: string;
  applications?: string[];
  notRecommended?: string;
  specs?: CompoundSpec[];
  pdfUrl?: string | null;
  pdfStatus?: string;
  revision?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
}

export type UpdateCompoundDataSheetDto = Partial<CreateCompoundDataSheetDto>;

@Injectable()
export class CompoundDataSheetsService {
  private readonly logger = new Logger(CompoundDataSheetsService.name);

  constructor(private readonly dataSheetRepository: CompoundDataSheetRepository) {}

  async publishedSheets(): Promise<CompoundDataSheet[]> {
    return this.dataSheetRepository.findPublishedOrdered();
  }

  async publishedSheetBySlug(slug: string): Promise<CompoundDataSheet> {
    const sheet = await this.dataSheetRepository.findOnePublishedBySlug(slug);
    if (!sheet) {
      throw new NotFoundException(`Data sheet not found: ${slug}`);
    }
    return sheet;
  }

  async allSheets(): Promise<CompoundDataSheet[]> {
    return this.dataSheetRepository.findAllOrdered();
  }

  async sheetById(id: string): Promise<CompoundDataSheet> {
    const sheet = await this.dataSheetRepository.findById(id);
    if (!sheet) {
      throw new NotFoundException(`Data sheet not found: ${id}`);
    }
    return sheet;
  }

  async createSheet(dto: CreateCompoundDataSheetDto): Promise<CompoundDataSheet> {
    const existing = await this.dataSheetRepository.findOneBySlug(dto.slug);
    if (existing) {
      throw new BadRequestException(`A data sheet with slug "${dto.slug}" already exists`);
    }
    const sheet = this.dataSheetRepository.build({
      slug: dto.slug,
      name: dto.name,
      code: dto.code || "",
      category: dto.category || "Natural Rubber Lining",
      polymer: dto.polymer || "Natural Rubber",
      shoreHardness: dto.shoreHardness || "",
      colour: dto.colour || "",
      cureMethod: dto.cureMethod || "Steam-Cured",
      shortDescription: dto.shortDescription || "",
      applications: dto.applications || [],
      notRecommended: dto.notRecommended || "",
      specs: dto.specs || [],
      pdfUrl: dto.pdfUrl || null,
      pdfStatus: dto.pdfStatus || "available",
      revision: dto.revision || "",
      metaTitle: dto.metaTitle || null,
      metaDescription: dto.metaDescription || null,
      sortOrder: dto.sortOrder ?? 0,
      isPublished: dto.isPublished || false,
    });
    const saved = await this.dataSheetRepository.save(sheet);
    this.logger.log(`Created data sheet: ${saved.name} (${saved.slug})`);
    return saved;
  }

  async updateSheet(id: string, dto: UpdateCompoundDataSheetDto): Promise<CompoundDataSheet> {
    const sheet = await this.sheetById(id);
    if (dto.slug && dto.slug !== sheet.slug) {
      const existing = await this.dataSheetRepository.findOneBySlug(dto.slug);
      if (existing) {
        throw new BadRequestException(`A data sheet with slug "${dto.slug}" already exists`);
      }
    }
    Object.assign(sheet, dto);
    const saved = await this.dataSheetRepository.save(sheet);
    this.logger.log(`Updated data sheet: ${saved.name} (${saved.slug})`);
    return saved;
  }

  async deleteSheet(id: string): Promise<void> {
    const sheet = await this.sheetById(id);
    await this.dataSheetRepository.remove(sheet);
    this.logger.log(`Deleted data sheet: ${sheet.name} (${sheet.slug})`);
  }
}
