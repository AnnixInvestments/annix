import { User } from "../../user/entities/user.entity";
import { Organization } from "./organization.entity";

export interface TerritoryBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export class Territory {
  id: number;

  organization: Organization;

  organizationId: number;

  name: string;

  description: string | null;

  provinces: string[] | null;

  cities: string[] | null;

  bounds: TerritoryBounds | null;

  assignedTo: User | null;

  assignedToId: number | null;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
