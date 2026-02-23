import { Injectable, Logger } from "@nestjs/common";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { ExtractedCvData, MatchAnalysis } from "../entities/candidate.entity";
import { JobPosting } from "../entities/job-posting.entity";
import { JOB_MATCH_SYSTEM_PROMPT, jobMatchPrompt } from "../prompts/job-match.prompt";

@Injectable()
export class JobMatchService {
  private readonly logger = new Logger(JobMatchService.name);

  constructor(private readonly aiChatService: AiChatService) {}

  async analyzeMatch(
    candidateData: ExtractedCvData,
    jobPosting: JobPosting,
  ): Promise<MatchAnalysis> {
    try {
      const prompt = jobMatchPrompt(
        {
          skills: candidateData.skills,
          experienceYears: candidateData.experienceYears,
          education: candidateData.education,
          certifications: candidateData.certifications,
          summary: candidateData.summary,
        },
        {
          requiredSkills: jobPosting.requiredSkills,
          minExperienceYears: jobPosting.minExperienceYears,
          requiredEducation: jobPosting.requiredEducation,
          requiredCertifications: jobPosting.requiredCertifications,
          description: jobPosting.description,
        },
      );

      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: prompt }],
        JOB_MATCH_SYSTEM_PROMPT,
        "gemini",
      );

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const analysis = JSON.parse(jsonMatch[0]) as MatchAnalysis;

      return {
        overallScore: Math.min(100, Math.max(0, analysis.overallScore || 0)),
        skillsMatched: Array.isArray(analysis.skillsMatched) ? analysis.skillsMatched : [],
        skillsMissing: Array.isArray(analysis.skillsMissing) ? analysis.skillsMissing : [],
        experienceMatch: Boolean(analysis.experienceMatch),
        educationMatch: Boolean(analysis.educationMatch),
        recommendation: this.normalizeRecommendation(analysis.recommendation),
        reasoning: analysis.reasoning || null,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze job match: ${error.message}`);
      return this.fallbackAnalysis(candidateData, jobPosting);
    }
  }

  private normalizeRecommendation(
    recommendation: string | undefined,
  ): "reject" | "review" | "shortlist" {
    const normalized = (recommendation || "").toLowerCase();
    if (normalized === "shortlist") return "shortlist";
    if (normalized === "reject") return "reject";
    return "review";
  }

  private fallbackAnalysis(candidateData: ExtractedCvData, jobPosting: JobPosting): MatchAnalysis {
    const candidateSkillsLower = candidateData.skills.map((s) => s.toLowerCase());
    const requiredSkillsLower = jobPosting.requiredSkills.map((s) => s.toLowerCase());

    const skillsMatched = requiredSkillsLower.filter((skill) =>
      candidateSkillsLower.some((cSkill) => cSkill.includes(skill) || skill.includes(cSkill)),
    );
    const skillsMissing = requiredSkillsLower.filter((skill) => !skillsMatched.includes(skill));

    const skillScore =
      requiredSkillsLower.length > 0
        ? (skillsMatched.length / requiredSkillsLower.length) * 40
        : 20;

    const experienceMatch =
      !jobPosting.minExperienceYears ||
      (candidateData.experienceYears !== null &&
        candidateData.experienceYears >= jobPosting.minExperienceYears);
    const experienceScore = experienceMatch ? 25 : 0;

    const educationMatch = !jobPosting.requiredEducation || candidateData.education.length > 0;
    const educationScore = educationMatch ? 20 : 0;

    const certMatch =
      jobPosting.requiredCertifications.length === 0 || candidateData.certifications.length > 0;
    const certScore = certMatch ? 15 : 0;

    const overallScore = Math.round(skillScore + experienceScore + educationScore + certScore);

    const recommendation: "reject" | "review" | "shortlist" =
      overallScore >= 80 ? "shortlist" : overallScore >= 50 ? "review" : "reject";

    return {
      overallScore,
      skillsMatched: jobPosting.requiredSkills.filter((_, i) =>
        skillsMatched.includes(requiredSkillsLower[i]),
      ),
      skillsMissing: jobPosting.requiredSkills.filter((_, i) =>
        skillsMissing.includes(requiredSkillsLower[i]),
      ),
      experienceMatch,
      educationMatch,
      recommendation,
      reasoning: "Fallback analysis based on keyword matching",
    };
  }
}
