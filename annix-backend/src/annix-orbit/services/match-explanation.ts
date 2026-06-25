import type { MatchAnalysis } from "../entities/candidate.entity";
import type { JobPosting } from "../entities/job-posting.entity";

export interface MatchExplanation {
  text: string;
  bullets: string[];
  auditReasoning: string | null;
}

export const formatMatchExplanation = (
  matchAnalysis: MatchAnalysis | null,
  jobPosting: Pick<JobPosting, "minExperienceYears" | "requiredSkills" | "requiredEducation">,
): MatchExplanation => {
  if (!matchAnalysis) {
    return {
      text: "Your application was reviewed against the job requirements; a detailed automated score was not generated for this submission.",
      bullets: [],
      auditReasoning: null,
    };
  }

  const skillsMatchedCount = matchAnalysis.skillsMatched.length;
  const totalRequiredSkills = jobPosting.requiredSkills.length;
  const skillsMissing = matchAnalysis.skillsMissing;

  const bullets: string[] = [];

  if (totalRequiredSkills > 0) {
    const matchedDetail =
      matchAnalysis.skillsMatched.length > 0
        ? matchAnalysis.skillsMatched.join(", ")
        : "none from the required list";
    const missingDetail = skillsMissing.length > 0 ? skillsMissing.join(", ") : "none";
    bullets.push(
      `Skills: matched ${skillsMatchedCount} of ${totalRequiredSkills} required (matched: ${matchedDetail}; missing: ${missingDetail}).`,
    );
  }

  if (jobPosting.minExperienceYears !== null && jobPosting.minExperienceYears > 0) {
    bullets.push(
      `Experience: the role required at least ${jobPosting.minExperienceYears} years; the screening assessment was that this requirement was ${matchAnalysis.experienceMatch ? "met" : "not met"}.`,
    );
  }

  if (jobPosting.requiredEducation) {
    bullets.push(
      `Education: the role required ${jobPosting.requiredEducation}; the screening assessment was that this requirement was ${matchAnalysis.educationMatch ? "met" : "not met"}.`,
    );
  }

  const text =
    bullets.length > 0
      ? bullets.join(" ")
      : "Your application was reviewed against the role requirements but no per-criterion breakdown is available.";

  return { text, bullets, auditReasoning: matchAnalysis.reasoning };
};
