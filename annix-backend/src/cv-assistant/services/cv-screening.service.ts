import { Injectable } from "@nestjs/common";
import type { Candidate } from "../entities/candidate.entity";
import type { JobPosting } from "../entities/job-posting.entity";

export type ScreeningRejectionCategory =
  | "experience"
  | "qualifications"
  | "certifications"
  | "skills";

export interface ScreeningResult {
  passed: boolean;
  reasons: string[];
  rejectionCategories: ScreeningRejectionCategory[];
}

const SKILLS_MATCH_THRESHOLD = 0.5;

@Injectable()
export class CvScreeningService {
  screen(candidate: Candidate, jobPosting: JobPosting): ScreeningResult {
    const extracted = candidate.extractedData;
    const reasons: string[] = [];
    const rejectionCategories: ScreeningRejectionCategory[] = [];

    if (!extracted) {
      return {
        passed: false,
        reasons: ["No extracted CV data available"],
        rejectionCategories: [],
      };
    }

    const experienceFailure = this.checkExperience(extracted.experienceYears, jobPosting);
    if (experienceFailure) {
      reasons.push(experienceFailure);
      rejectionCategories.push("experience");
    }

    const qualificationsFailure = this.checkQualifications(extracted.education, jobPosting);
    if (qualificationsFailure) {
      reasons.push(qualificationsFailure);
      rejectionCategories.push("qualifications");
    }

    const certificationsFailure = this.checkCertifications(extracted.certifications, jobPosting);
    if (certificationsFailure) {
      reasons.push(certificationsFailure);
      rejectionCategories.push("certifications");
    }

    const skillsFailure = this.checkSkills(extracted.skills, jobPosting);
    if (skillsFailure) {
      reasons.push(skillsFailure);
      rejectionCategories.push("skills");
    }

    return {
      passed: rejectionCategories.length === 0,
      reasons,
      rejectionCategories,
    };
  }

  private checkExperience(candidateYears: number | null, jobPosting: JobPosting): string | null {
    const required = jobPosting.minExperienceYears;
    if (required === null || required === undefined) {
      return null;
    } else if (candidateYears === null || candidateYears < required) {
      const reported = candidateYears === null ? "not reported" : `${candidateYears} years`;
      return `Minimum ${required} years experience required (candidate: ${reported})`;
    } else {
      return null;
    }
  }

  private checkQualifications(candidateEducation: string[], jobPosting: JobPosting): string | null {
    const requirement = jobPosting.requiredEducation;
    if (!requirement || requirement.trim() === "") {
      return null;
    }

    const requirementLower = requirement.toLowerCase();
    const requirementTokens = this.tokenize(requirementLower);
    const candidateText = candidateEducation.map((e) => e.toLowerCase()).join(" ");

    const substringMatch = candidateEducation.some((entry) =>
      entry.toLowerCase().includes(requirementLower),
    );
    if (substringMatch) {
      return null;
    }

    const candidateTokens = new Set(this.tokenize(candidateText));
    const overlapCount = requirementTokens.filter((token) => candidateTokens.has(token)).length;
    const overlapRatio =
      requirementTokens.length === 0 ? 0 : overlapCount / requirementTokens.length;

    if (overlapRatio >= SKILLS_MATCH_THRESHOLD) {
      return null;
    } else {
      return `Required qualification not detected: ${requirement}`;
    }
  }

  private checkCertifications(
    candidateCertifications: string[],
    jobPosting: JobPosting,
  ): string | null {
    const required = jobPosting.requiredCertifications;
    if (!required || required.length === 0) {
      return null;
    }

    const candidateLower = candidateCertifications.map((c) => c.toLowerCase());
    const missing = required.filter((cert) => {
      const certLower = cert.toLowerCase();
      return !candidateLower.some((c) => c.includes(certLower) || certLower.includes(c));
    });

    if (missing.length === 0) {
      return null;
    } else {
      return `Missing required certifications: ${missing.join(", ")}`;
    }
  }

  private checkSkills(candidateSkills: string[], jobPosting: JobPosting): string | null {
    const required = jobPosting.requiredSkills;
    if (!required || required.length === 0) {
      return null;
    }

    const candidateLower = candidateSkills.map((s) => s.toLowerCase());
    const matched = required.filter((skill) => {
      const skillLower = skill.toLowerCase();
      return candidateLower.some((c) => c.includes(skillLower) || skillLower.includes(c));
    });

    const ratio = matched.length / required.length;
    if (ratio >= SKILLS_MATCH_THRESHOLD) {
      return null;
    } else {
      const matchedPct = Math.round(ratio * 100);
      return `Only ${matched.length}/${required.length} required skills present (${matchedPct}%, minimum 50%)`;
    }
  }

  private tokenize(text: string): string[] {
    return text
      .split(/[^a-z0-9]+/i)
      .map((t) => t.trim())
      .filter((t) => t.length > 2);
  }
}
