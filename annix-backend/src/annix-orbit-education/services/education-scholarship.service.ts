import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EducationScholarship } from "../entities/education-scholarship.entity";

/** Read-only access to the curated scholarships list for seekers (#304 Phase 1). */
@Injectable()
export class EducationScholarshipService {
  constructor(
    @InjectRepository(EducationScholarship)
    private readonly scholarshipRepo: Repository<EducationScholarship>,
  ) {}

  /** Active scholarships, optionally narrowed to a country (or country-agnostic entries). */
  async listActive(country?: string | null): Promise<EducationScholarship[]> {
    const all = await this.scholarshipRepo.find({
      where: { active: true },
      order: { name: "ASC" },
      take: 200,
    });
    if (!country) return all;
    const upper = country.toUpperCase();
    return all.filter((s) => s.country == null || s.country.toUpperCase() === upper);
  }
}
