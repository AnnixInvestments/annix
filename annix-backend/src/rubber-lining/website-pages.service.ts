import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WebsitePage } from "./entities/website-page.entity";

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
}

@Injectable()
export class WebsitePagesService {
  private readonly logger = new Logger(WebsitePagesService.name);

  constructor(
    @InjectRepository(WebsitePage)
    private readonly pageRepository: Repository<WebsitePage>,
  ) {}

  async publishedPages(): Promise<WebsitePage[]> {
    return this.pageRepository.find({
      where: { isPublished: true },
      order: { sortOrder: "ASC", title: "ASC" },
    });
  }

  async publishedPageBySlug(slug: string): Promise<WebsitePage> {
    const page = await this.pageRepository.findOne({
      where: { slug, isPublished: true },
    });
    if (!page) {
      throw new NotFoundException(`Page not found: ${slug}`);
    }
    return page;
  }

  async homePage(): Promise<WebsitePage | null> {
    return this.pageRepository.findOne({
      where: { isHomePage: true, isPublished: true },
    });
  }

  async allPages(): Promise<WebsitePage[]> {
    return this.pageRepository.find({
      order: { sortOrder: "ASC", title: "ASC" },
    });
  }

  async pageById(id: string): Promise<WebsitePage> {
    const page = await this.pageRepository.findOne({ where: { id } });
    if (!page) {
      throw new NotFoundException(`Page not found: ${id}`);
    }
    return page;
  }

  async createPage(dto: CreateWebsitePageDto): Promise<WebsitePage> {
    const existing = await this.pageRepository.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new BadRequestException(`A page with slug "${dto.slug}" already exists`);
    }

    if (dto.isHomePage) {
      await this.clearHomePage();
    }

    const page = this.pageRepository.create({
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
      const existing = await this.pageRepository.findOne({ where: { slug: dto.slug } });
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

  private async clearHomePage(): Promise<void> {
    await this.pageRepository.update({ isHomePage: true }, { isHomePage: false });
  }
}
