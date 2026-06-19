import { RiskLevel } from "./slurry-profile.entity";

export class LiningCoatingRule {
  id: number;

  abrasionLevel: RiskLevel;

  corrosionLevel: RiskLevel;

  recommendedLining: string;

  recommendedCoating: string | null;

  applicationNotes: string | null;

  priority: number;
}
