import { AnnixOrbitCompany } from "./annix-orbit-company.entity";

export enum AnnixOrbitRole {
  VIEWER = "viewer",
  RECRUITER = "recruiter",
  ADMIN = "admin",
  INDIVIDUAL = "individual",
  STUDENT = "student",
}

export class AnnixOrbitUser {
  id: number;

  email: string;

  passwordHash: string;

  name: string;

  role: AnnixOrbitRole;

  emailVerified: boolean;

  emailVerificationToken: string | null;

  emailVerificationExpires: Date | null;

  resetPasswordToken: string | null;

  resetPasswordExpires: Date | null;

  company: AnnixOrbitCompany;

  companyId: number;

  matchAlertThreshold: number;

  digestEnabled: boolean;

  pushEnabled: boolean;

  createdAt: Date;

  updatedAt: Date;
}
