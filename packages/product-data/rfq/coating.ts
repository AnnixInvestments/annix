export interface ISO12944System {
  id: number;
  systemCode: string | null;
  binderType: string | null;
  primerType: string | null;
  primerNdftUm: string | null;
  subsequentBinder: string | null;
  system: string;
  coats: string;
  totalDftUmRange: string;
  supportedDurabilities: string | null;
  isRecommended: boolean;
  applications: string;
}

export interface ISO12944SystemsByDurabilityResult {
  recommended: ISO12944System | null;
  alternatives: ISO12944System[];
}

export interface ISO12944DurabilityOption {
  code: string;
  label: string;
  years: string;
}
