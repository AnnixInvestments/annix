export class BlogPost {
  id: string;

  slug: string;

  title: string;

  metaTitle: string | null;

  metaDescription: string | null;

  excerpt: string;

  content: string;

  heroImageUrl: string | null;

  author: string;

  publishedAt: Date | null;

  isPublished: boolean;

  createdAt: Date;

  updatedAt: Date;
}
