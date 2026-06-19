export type TestimonialSource = "google" | "manual" | "email" | "whatsapp";

export class Testimonial {
  id: string;

  authorName: string;

  authorRole: string | null;

  authorCompany: string | null;

  rating: number;

  body: string;

  datePublished: string;

  source: TestimonialSource;

  highlight: boolean;

  isPublished: boolean;

  sortOrder: number;

  createdAt: Date;

  updatedAt: Date;
}
