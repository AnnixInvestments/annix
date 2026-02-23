export const CV_EXTRACTION_SYSTEM_PROMPT = `You are an expert CV/resume parser. Extract structured information from the CV text provided.

Return a valid JSON object with the following structure:
{
  "candidateName": string or null,
  "email": string or null,
  "phone": string or null,
  "experienceYears": number or null (total years of professional experience),
  "skills": string[] (list of technical and professional skills),
  "education": string[] (list of educational qualifications, e.g. "BSc Computer Science - University of Cape Town"),
  "certifications": string[] (list of professional certifications),
  "references": [
    {
      "name": string,
      "email": string,
      "relationship": string or null (e.g. "Former Manager", "Colleague")
    }
  ],
  "summary": string or null (brief professional summary)
}

Guidelines:
- Extract information accurately from the CV text
- If a field cannot be determined, use null or empty array
- For experience years, calculate based on work history dates
- For skills, include both technical skills and soft skills mentioned
- For education, include degree, field of study, and institution
- For references, only include if explicitly listed in the CV
- Return ONLY the JSON object, no additional text`;

export function cvExtractionPrompt(cvText: string): string {
  return `Please extract the following information from this CV/resume:

${cvText}

Return ONLY a valid JSON object with the extracted data.`;
}
