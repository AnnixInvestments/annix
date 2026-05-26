import { Injectable } from "@nestjs/common";
import { EducationScholarship } from "../entities/education-scholarship.entity";
import { EducationScholarshipRepository } from "../repositories/education-scholarship.repository";

/** Read-only access to the curated scholarships list for seekers (#304 Phase 1). */
@Injectable()
export class EducationScholarshipService {
  constructor(private readonly scholarshipRepo: EducationScholarshipRepository) {}

  /** Active scholarships, optionally narrowed to a country (or country-agnostic entries). */
  async listActive(country?: string | null): Promise<EducationScholarship[]> {
    const all = await this.scholarshipRepo.activeOrderedByName(200);
    if (!country) return all;
    const upper = country.toUpperCase();
    return all.filter((s) => s.country == null || s.country.toUpperCase() === upper);
  }
}
