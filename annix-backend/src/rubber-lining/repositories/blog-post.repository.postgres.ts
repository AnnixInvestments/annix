import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { BlogPost } from "../entities/blog-post.entity";
import { BlogPostRepository } from "./blog-post.repository";

@Injectable()
export class PostgresBlogPostRepository
  extends TypeOrmCrudRepository<BlogPost>
  implements BlogPostRepository
{
  constructor(@InjectRepository(BlogPost) repository: Repository<BlogPost>) {
    super(repository);
  }

  findPublishedOrdered(): Promise<BlogPost[]> {
    return this.repository.find({
      where: { isPublished: true },
      order: { publishedAt: "DESC", createdAt: "DESC" },
    });
  }

  findOnePublishedBySlug(slug: string): Promise<BlogPost | null> {
    return this.repository.findOne({
      where: { slug, isPublished: true },
    });
  }

  findAllOrdered(): Promise<BlogPost[]> {
    return this.repository.find({
      order: { publishedAt: "DESC", createdAt: "DESC" },
    });
  }

  findOneBySlug(slug: string): Promise<BlogPost | null> {
    return this.repository.findOne({ where: { slug } });
  }

  build(data: Partial<BlogPost>): BlogPost {
    return this.repository.create(data as TypeOrmDeepPartial<BlogPost>);
  }
}
