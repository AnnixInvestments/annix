import { Injectable } from "@nestjs/common";

export interface BbeeLevel {
  category: "EME" | "QSE" | "Generic";
  automaticLevel: number | null;
  requiresVerification: boolean;
  description: string;
}

export interface ScorecardElement {
  element: string;
  weighting: number;
  unit: string;
}

@Injectable()
export class ComplySaBbeeService {
  calculateLevel(turnover: number, blackOwnershipPercent: number): BbeeLevel {
    if (turnover < 10_000_000) {
      return {
        category: "EME",
        automaticLevel: this.ownershipLevel(blackOwnershipPercent),
        requiresVerification: false,
        description: `Exempted Micro Enterprise (turnover under R10m). ${this.ownershipDescription(blackOwnershipPercent)}`,
      };
    } else if (turnover <= 50_000_000) {
      return {
        category: "QSE",
        automaticLevel: this.ownershipLevel(blackOwnershipPercent),
        requiresVerification: false,
        description: `Qualifying Small Enterprise (turnover R10m-R50m). ${this.ownershipDescription(blackOwnershipPercent)}`,
      };
    } else {
      return {
        category: "Generic",
        automaticLevel: null,
        requiresVerification: true,
        description:
          "Generic Enterprise (turnover over R50m). Full B-BBEE verification by an accredited agency is required.",
      };
    }
  }

  scorecardElements(): ScorecardElement[] {
    return [
      { element: "Ownership", weighting: 25, unit: "points" },
      { element: "Management Control", weighting: 19, unit: "points" },
      { element: "Skills Development", weighting: 20, unit: "points" },
      {
        element: "Enterprise & Supplier Development",
        weighting: 40,
        unit: "points",
      },
      { element: "Socio-Economic Development", weighting: 5, unit: "points" },
    ];
  }

  private ownershipLevel(blackOwnershipPercent: number): number {
    if (blackOwnershipPercent >= 100) {
      return 1;
    } else if (blackOwnershipPercent >= 51) {
      return 2;
    } else {
      return 4;
    }
  }

  private ownershipDescription(blackOwnershipPercent: number): string {
    if (blackOwnershipPercent >= 100) {
      return "100% black-owned: automatic Level 1 contributor.";
    } else if (blackOwnershipPercent >= 51) {
      return "51%+ black-owned: automatic Level 2 contributor.";
    } else {
      return "Less than 51% black-owned: automatic Level 4 contributor.";
    }
  }
}
