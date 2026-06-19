import { CoatingEnvironment } from "./coating-environment.entity";

export class CoatingSpecification {
  id: number;

  environment: CoatingEnvironment;

  environmentId: number;

  coatingType: string; // "external" or "internal"

  lifespan: string; // "Low", "Medium", "High", "Very High" or "Per system"

  system: string; // e.g., "Zinc-rich epoxy primer + Epoxy MIO + Polyurethane topcoat"

  coats: string; // e.g., "2", "3", "2-3"

  totalDftUmRange: string; // e.g., "200-240"

  applications: string; // e.g., "External piping, chutes, tanks"

  systemCode: string | null; // ISO system code e.g., "C3.07", "C4.11"

  binderType: string | null; // e.g., "AK, AY" or "EP, PUR, ESI"

  primerType: string | null; // e.g., "Misc." or "Zn (R)"

  primerNdftUm: string | null; // e.g., "60-80"

  subsequentBinder: string | null; // e.g., "EP, PUR, AY"

  supportedDurabilities: string | null; // comma-separated: "L,M,H,VH"

  isRecommended: boolean; // true if this is the recommended system for its category
}
