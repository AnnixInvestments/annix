/**
 * A learner's FuturePath education profile. One per student User (D3: students
 * reuse Orbit's existing registration). `dateOfBirth` drives minor determination
 * for the guardian-consent gate; `jurisdiction` is derived from country (D4).
 */
export class EducationProfile {
  id: string;

  userId: number;

  curriculum: string;

  country: string | null;

  nationality: string | null;

  languages: string[];

  school: string | null;

  dateOfBirth: string | null;

  jurisdiction: string;

  targetCategories: string[] | null;

  createdAt: Date;

  updatedAt: Date;
}
