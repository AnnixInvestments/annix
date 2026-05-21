export const JOB_MATCH_SYSTEM_PROMPT = `You are an expert HR analyst specializing in candidate-job matching. Analyze how well a candidate's profile matches the job requirements.

Return a valid JSON object with the following structure:
{
  "overallScore": number (0-100, representing match percentage),
  "skillsMatched": string[] (skills the candidate has that match requirements),
  "skillsMissing": string[] (required skills the candidate lacks),
  "experienceMatch": boolean (true if candidate meets experience requirements),
  "educationMatch": boolean (true if candidate meets education requirements),
  "recommendation": "reject" | "review" | "shortlist",
  "reasoning": string (brief explanation of the score and recommendation)
}

Scoring Guidelines:
- 80-100: Excellent match, recommend shortlisting
- 50-79: Partial match, needs human review
- 0-49: Poor match, recommend rejection

Factors to consider:
- Required skills match (weight: 40%)
- Experience level match (weight: 25%)
- Education match (weight: 20%)
- Certifications match (weight: 15%)

Return ONLY the JSON object, no additional text.`;

export function jobMatchPrompt(
  candidateData: {
    skills: string[];
    experienceYears: number | null;
    education: string[];
    certifications: string[];
    summary: string | null;
  },
  jobRequirements: {
    requiredSkills: string[];
    minExperienceYears: number | null;
    requiredEducation: string | null;
    requiredCertifications: string[];
    description: string | null;
  },
): string {
  return `Analyze the match between this candidate and job requirements:

CANDIDATE PROFILE:
- Skills: ${candidateData.skills.join(", ") || "None specified"}
- Experience: ${candidateData.experienceYears ?? "Unknown"} years
- Education: ${candidateData.education.join("; ") || "None specified"}
- Certifications: ${candidateData.certifications.join(", ") || "None specified"}
- Summary: ${candidateData.summary || "Not provided"}

JOB REQUIREMENTS:
- Required Skills: ${jobRequirements.requiredSkills.join(", ") || "None specified"}
- Minimum Experience: ${jobRequirements.minExperienceYears ?? "Not specified"} years
- Required Education: ${jobRequirements.requiredEducation || "Not specified"}
- Required Certifications: ${jobRequirements.requiredCertifications.join(", ") || "None specified"}
- Job Description: ${jobRequirements.description || "Not provided"}

Return ONLY a valid JSON object with the match analysis.`;
}
