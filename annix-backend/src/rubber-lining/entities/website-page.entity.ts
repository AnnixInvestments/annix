export class WebsitePage {
  id: string;

  slug: string;

  title: string;

  metaTitle: string | null;

  metaDescription: string | null;

  content: string;

  heroImageUrl: string | null;

  draftBlocks?: Record<string, unknown>[] | null;

  publishedBlocks?: Record<string, unknown>[] | null;

  useBlocks?: boolean;

  draftUpdatedAt?: string | null;

  lastPublishedAt?: string | null;

  lastPublishedBy?: string | null;

  sortOrder: number;

  isPublished: boolean;

  isHomePage: boolean;

  showInNav: boolean;

  createdAt: Date;

  updatedAt: Date;
}
