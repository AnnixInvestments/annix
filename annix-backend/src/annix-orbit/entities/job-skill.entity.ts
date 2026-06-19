import { JobPosting } from "./job-posting.entity";

export enum SkillImportance {
  REQUIRED = "required",
  PREFERRED = "preferred",
}

export enum SkillProficiency {
  BASIC = "basic",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

export class JobSkill {
  id: number;

  jobPosting: JobPosting;

  jobPostingId: number;

  name: string;

  importance: SkillImportance;

  proficiency: SkillProficiency;

  yearsExperience: number | null;

  evidenceRequired: string | null;

  weight: number;

  sortOrder: number;

  createdAt: Date;

  updatedAt: Date;
}
