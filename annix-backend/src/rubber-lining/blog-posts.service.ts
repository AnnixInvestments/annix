import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO } from "../lib/datetime";
import { BlogPost } from "./entities/blog-post.entity";

export interface CreateBlogPostDto {
  slug: string;
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  excerpt?: string;
  content?: string;
  heroImageUrl?: string | null;
  author?: string;
  publishedAt?: string | null;
  isPublished?: boolean;
}

export interface UpdateBlogPostDto {
  slug?: string;
  title?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  excerpt?: string;
  content?: string;
  heroImageUrl?: string | null;
  author?: string;
  publishedAt?: string | null;
  isPublished?: boolean;
}

@Injectable()
export class BlogPostsService {
  private readonly logger = new Logger(BlogPostsService.name);

  constructor(
    @InjectRepository(BlogPost)
    private readonly blogPostRepository: Repository<BlogPost>,
  ) {}

  async publishedPosts(): Promise<BlogPost[]> {
    return this.blogPostRepository.find({
      where: { isPublished: true },
      order: { publishedAt: "DESC", createdAt: "DESC" },
    });
  }

  async publishedPostBySlug(slug: string): Promise<BlogPost> {
    const post = await this.blogPostRepository.findOne({
      where: { slug, isPublished: true },
    });
    if (!post) {
      throw new NotFoundException(`Blog post not found: ${slug}`);
    }
    return post;
  }

  async allPosts(): Promise<BlogPost[]> {
    return this.blogPostRepository.find({
      order: { publishedAt: "DESC", createdAt: "DESC" },
    });
  }

  async postById(id: string): Promise<BlogPost> {
    const post = await this.blogPostRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Blog post not found: ${id}`);
    }
    return post;
  }

  async createPost(dto: CreateBlogPostDto): Promise<BlogPost> {
    const existing = await this.blogPostRepository.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new BadRequestException(`A blog post with slug "${dto.slug}" already exists`);
    }
    const publishedAtRaw = dto.publishedAt;
    const post = this.blogPostRepository.create({
      slug: dto.slug,
      title: dto.title,
      metaTitle: dto.metaTitle || null,
      metaDescription: dto.metaDescription || null,
      excerpt: dto.excerpt || "",
      content: dto.content || "",
      heroImageUrl: dto.heroImageUrl || null,
      author: dto.author || "AU Industries",
      publishedAt: publishedAtRaw ? fromISO(publishedAtRaw).toJSDate() : null,
      isPublished: dto.isPublished || false,
    });
    const saved = await this.blogPostRepository.save(post);
    this.logger.log(`Created blog post: ${saved.title} (${saved.slug})`);
    return saved;
  }

  async updatePost(id: string, dto: UpdateBlogPostDto): Promise<BlogPost> {
    const post = await this.postById(id);
    if (dto.slug && dto.slug !== post.slug) {
      const existing = await this.blogPostRepository.findOne({ where: { slug: dto.slug } });
      if (existing) {
        throw new BadRequestException(`A blog post with slug "${dto.slug}" already exists`);
      }
    }
    const publishedAtRaw = dto.publishedAt;
    Object.assign(post, dto);
    if (publishedAtRaw !== undefined) {
      post.publishedAt = publishedAtRaw ? fromISO(publishedAtRaw).toJSDate() : null;
    }
    const saved = await this.blogPostRepository.save(post);
    this.logger.log(`Updated blog post: ${saved.title} (${saved.slug})`);
    return saved;
  }

  async deletePost(id: string): Promise<void> {
    const post = await this.postById(id);
    await this.blogPostRepository.remove(post);
    this.logger.log(`Deleted blog post: ${post.title} (${post.slug})`);
  }
}
