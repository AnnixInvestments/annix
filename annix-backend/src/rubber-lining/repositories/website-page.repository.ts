import { CrudRepository } from "../../lib/persistence/crud-repository";
import { WebsitePage } from "../entities/website-page.entity";

export abstract class WebsitePageRepository extends CrudRepository<WebsitePage> {
  abstract build(data: Partial<WebsitePage>): WebsitePage;
  abstract findPublishedOrdered(): Promise<WebsitePage[]>;
  abstract findOnePublishedBySlug(slug: string): Promise<WebsitePage | null>;
  abstract findOneHomePagePublished(): Promise<WebsitePage | null>;
  abstract findAllOrdered(): Promise<WebsitePage[]>;
  abstract findOneBySlug(slug: string): Promise<WebsitePage | null>;
  abstract clearHomePage(): Promise<void>;
}
