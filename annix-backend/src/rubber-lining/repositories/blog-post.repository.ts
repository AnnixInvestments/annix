import { CrudRepository } from "../../lib/persistence/crud-repository";
import { BlogPost } from "../entities/blog-post.entity";

export abstract class BlogPostRepository extends CrudRepository<BlogPost> {
  abstract findPublishedOrdered(): Promise<BlogPost[]>;
  abstract findOnePublishedBySlug(slug: string): Promise<BlogPost | null>;
  abstract findAllOrdered(): Promise<BlogPost[]>;
  abstract findOneBySlug(slug: string): Promise<BlogPost | null>;
  abstract build(data: Partial<BlogPost>): BlogPost;
}
