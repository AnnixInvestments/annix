import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { nowISO } from "../lib/datetime";
import { WebsitePage } from "./entities/website-page.entity";
import { WebsitePageRepository } from "./repositories/website-page.repository";

export interface CreateWebsitePageDto {
  title: string;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  content?: string;
  heroImageUrl?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  isHomePage?: boolean;
  showInNav?: boolean;
}

export interface UpdateWebsitePageDto {
  title?: string;
  slug?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  content?: string;
  heroImageUrl?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  isHomePage?: boolean;
  showInNav?: boolean;
  useBlocks?: boolean;
}

@Injectable()
export class WebsitePagesService {
  private readonly logger = new Logger(WebsitePagesService.name);

  constructor(private readonly pageRepository: WebsitePageRepository) {}

  async publishedPages(): Promise<WebsitePage[]> {
    return this.pageRepository.findPublishedOrdered();
  }

  async publishedPageBySlug(slug: string): Promise<WebsitePage> {
    const page = await this.pageRepository.findOnePublishedBySlug(slug);
    if (!page) {
      throw new NotFoundException(`Page not found: ${slug}`);
    }
    return page;
  }

  async homePage(): Promise<WebsitePage | null> {
    return this.pageRepository.findOneHomePagePublished();
  }

  async allPages(): Promise<WebsitePage[]> {
    return this.pageRepository.findAllOrdered();
  }

  async pageById(id: string): Promise<WebsitePage> {
    const page = await this.pageRepository.findById(id);
    if (!page) {
      throw new NotFoundException(`Page not found: ${id}`);
    }
    return page;
  }

  async createPage(dto: CreateWebsitePageDto): Promise<WebsitePage> {
    const existing = await this.pageRepository.findOneBySlug(dto.slug);
    if (existing) {
      throw new BadRequestException(`A page with slug "${dto.slug}" already exists`);
    }

    if (dto.isHomePage) {
      await this.clearHomePage();
    }

    const page = this.pageRepository.build({
      title: dto.title,
      slug: dto.slug,
      metaTitle: dto.metaTitle || null,
      metaDescription: dto.metaDescription || null,
      content: dto.content || "",
      heroImageUrl: dto.heroImageUrl || null,
      sortOrder: dto.sortOrder || 0,
      isPublished: dto.isPublished || false,
      isHomePage: dto.isHomePage || false,
    });

    const saved = await this.pageRepository.save(page);
    this.logger.log(`Created website page: ${saved.title} (${saved.slug})`);
    return saved;
  }

  async updatePage(id: string, dto: UpdateWebsitePageDto): Promise<WebsitePage> {
    const page = await this.pageById(id);

    if (dto.slug && dto.slug !== page.slug) {
      const existing = await this.pageRepository.findOneBySlug(dto.slug);
      if (existing) {
        throw new BadRequestException(`A page with slug "${dto.slug}" already exists`);
      }
    }

    if (dto.isHomePage && !page.isHomePage) {
      await this.clearHomePage();
    }

    Object.assign(page, dto);
    const saved = await this.pageRepository.save(page);
    this.logger.log(`Updated website page: ${saved.title} (${saved.slug})`);
    return saved;
  }

  async deletePage(id: string): Promise<void> {
    const page = await this.pageById(id);
    await this.pageRepository.remove(page);
    this.logger.log(`Deleted website page: ${page.title} (${page.slug})`);
  }

  async reorderPage(id: string, sortOrder: number): Promise<WebsitePage> {
    const page = await this.pageById(id);
    page.sortOrder = sortOrder;
    return this.pageRepository.save(page);
  }

  async saveDraftBlocks(id: string, blocks: Record<string, unknown>[]): Promise<WebsitePage> {
    const page = await this.pageById(id);
    page.draftBlocks = blocks;
    page.draftUpdatedAt = nowISO();
    const saved = await this.pageRepository.save(page);
    this.logger.log(`Saved draft blocks for page: ${saved.slug} (${blocks.length} blocks)`);
    return saved;
  }

  async publishBlocks(id: string, publishedBy: string | null): Promise<WebsitePage> {
    const page = await this.pageById(id);
    const draft = page.draftBlocks ?? page.publishedBlocks ?? [];
    page.publishedBlocks = draft;
    page.draftBlocks = draft;
    page.lastPublishedAt = nowISO();
    page.lastPublishedBy = publishedBy;
    page.draftUpdatedAt = nowISO();
    const saved = await this.pageRepository.save(page);
    this.logger.log(`Published blocks for page: ${saved.slug} by ${publishedBy ?? "unknown"}`);
    return saved;
  }

  async discardDraftBlocks(id: string): Promise<WebsitePage> {
    const page = await this.pageById(id);
    page.draftBlocks = page.publishedBlocks ?? [];
    page.draftUpdatedAt = nowISO();
    const saved = await this.pageRepository.save(page);
    this.logger.log(`Discarded draft blocks for page: ${saved.slug}`);
    return saved;
  }

  private async clearHomePage(): Promise<void> {
    await this.pageRepository.clearHomePage();
  }
}
