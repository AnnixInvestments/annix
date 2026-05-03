import type { Subject } from "./enums";

export interface SubjectTemplate {
  evidenceTypes: string[];
  reasoningStyle: string;
  aiChallenge: string;
}

export const subjectTemplates: Record<Subject, SubjectTemplate> = {
  geography: {
    evidenceTypes: ["photos", "maps", "local observations", "weather data"],
    reasoningStyle: "spatial reasoning and real-world observation",
    aiChallenge: "compare AI explanations with real-world evidence",
  },
  science: {
    evidenceTypes: ["measurements", "experiment results", "photos", "tables", "diagrams"],
    reasoningStyle: "hypothesis, observation, explanation",
    aiChallenge: "compare AI predictions with experiment results",
  },
};

export function templateForSubject(subject: Subject): SubjectTemplate {
  return subjectTemplates[subject];
}
