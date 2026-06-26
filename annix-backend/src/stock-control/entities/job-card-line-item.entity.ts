import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

// The developed (flat-pattern) outline of one tank component, used to compute
// surface area geometrically and to drive the rubber cutting diagram. Absent
// dimensions degrade to a rectangle take-off.
export type TankComponentShape =
  | { type: "rectangle"; widthMm: number; heightMm: number }
  | { type: "cylinder"; innerDiameterMm: number; heightMm: number }
  | {
      type: "cone";
      largeDiameterMm: number;
      smallDiameterMm: number;
      slantHeightMm: number;
      sweepAngleDegrees: number | null;
    }
  | { type: "dished_head"; crownRadiusMm: number; knuckleRadiusMm: number; outerDiameterMm: number }
  | { type: "annular_ring"; outerDiameterMm: number; innerDiameterMm: number }
  | { type: "branch_wrap"; boreDiameterMm: number; lengthMm: number; mitred: boolean };

// One fabricated tank component (shell course, cone, dished head, ring, branch,
// partition, …) with its developed shape and per-surface lining/paint areas.
export interface TankComponent {
  mark: string;
  description: string;
  componentType:
    | "shell"
    | "cone"
    | "dished_head"
    | "lid"
    | "ring"
    | "branch"
    | "partition"
    | "plate";
  shape: TankComponentShape;
  // Per-surface lining (NEVER blanket-propagated across the tank — mixed
  // thicknesses are common on one assembly). Null when the surface is not lined.
  liningType: string | null;
  liningThicknessMm: number | null;
  // Areas as printed on the drawing, when available — used to cross-check the
  // geometric calculation and to train Nix. Null when not printed.
  liningAreaM2: number | null;
  coatingAreaM2: number | null;
  quantity: number;
  // How many developed panels this component splits into for the cutting diagram.
  segmentCount: number | null;
}

export class JobCardLineItem {
  id: number;

  jobCardId: number;

  jobCard: JobCard;

  itemCode: string | null;

  itemDescription: string | null;

  itemNo: string | null;

  quantity: number | null;

  jtNo: string | null;

  // External / paint surface area (outer surface).
  m2: number | null;

  // Internal / rubber-lining surface area (bore + flange faces). Drives rubber quoting.
  liningM2: number | null;

  // Developed flat plate take-off for a fabricated tank/chute line, from the
  // shared Nix plateBom. Drives the rubber cutting-diagram nesting; null for
  // non-tank rows. (Legacy Postgres path — jsonb; Mongo stores it embedded.)
  plateBom: Array<{
    mark: string;
    description: string;
    thicknessMm: number;
    lengthMm: number;
    widthMm: number;
    quantity: number;
    liningThicknessMm: number;
  }> | null;

  // Richer developed-component take-off (shells, cones, dished heads, rings,
  // branches) for geometric tank m² + the rubber cutting diagram. Null for
  // non-tank rows. Stored embedded on the line item (no separate collection).
  tankComponents: TankComponent[] | null;

  notes: string | null;

  sortOrder: number;

  companyId: number;

  company: StockControlCompany;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
