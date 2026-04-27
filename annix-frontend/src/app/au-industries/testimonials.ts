export type TestimonialSource = "google" | "manual" | "email" | "whatsapp";

export interface Testimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorCompany: string | null;
  rating: number;
  body: string;
  datePublished: string;
  source: TestimonialSource;
  highlight: boolean;
}

export const TESTIMONIALS: Testimonial[] = [];

export function highlightedTestimonials(): Testimonial[] {
  return TESTIMONIALS.filter((entry) => entry.highlight);
}

export function aggregateRating(): { value: number; count: number } | null {
  if (TESTIMONIALS.length === 0) {
    return null;
  }
  const total = TESTIMONIALS.reduce((sum, entry) => sum + entry.rating, 0);
  const value = Math.round((total / TESTIMONIALS.length) * 10) / 10;
  return { value, count: TESTIMONIALS.length };
}
