export interface CompoundSpec {
  label: string;
  value: string;
  method?: string | null;
}

export class CompoundDataSheet {
  id: string;

  slug: string;

  name: string;

  code: string;

  category: string;

  polymer: string;

  shoreHardness: string;

  colour: string;

  cureMethod: string;

  shortDescription: string;

  applications: string[];

  notRecommended: string;

  specs: CompoundSpec[];

  pdfUrl: string | null;

  pdfStatus: string;

  revision: string;

  metaTitle: string | null;

  metaDescription: string | null;

  sortOrder: number;

  isPublished: boolean;

  createdAt: Date;

  updatedAt: Date;
}
