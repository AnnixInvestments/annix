import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { WebsitePage } from "../entities/website-page.entity";
import { WebsitePageRepository } from "./website-page.repository";

@Injectable()
export class PostgresWebsitePageRepository
  extends TypeOrmCrudRepository<WebsitePage>
  implements WebsitePageRepository
{
  constructor(@InjectRepository(WebsitePage) repository: Repository<WebsitePage>) {
    super(repository);
  }

  build(data: Partial<WebsitePage>): WebsitePage {
    return this.repository.create(data as TypeOrmDeepPartial<WebsitePage>);
  }

  findPublishedOrdered(): Promise<WebsitePage[]> {
    return this.repository.find({
      where: { isPublished: true },
      order: { sortOrder: "ASC", title: "ASC" },
    });
  }

  findOnePublishedBySlug(slug: string): Promise<WebsitePage | null> {
    return this.repository.findOne({
      where: { slug, isPublished: true },
    });
  }

  findOneHomePagePublished(): Promise<WebsitePage | null> {
    return this.repository.findOne({
      where: { isHomePage: true, isPublished: true },
    });
  }

  findAllOrdered(): Promise<WebsitePage[]> {
    return this.repository.find({
      order: { sortOrder: "ASC", title: "ASC" },
    });
  }

  findOneBySlug(slug: string): Promise<WebsitePage | null> {
    return this.repository.findOne({ where: { slug } });
  }

  async clearHomePage(): Promise<void> {
    await this.repository.update({ isHomePage: true }, { isHomePage: false });
  }
}
