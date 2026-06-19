import { RubberMonthlyAccount } from "./rubber-monthly-account.entity";

export enum SignOffStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export class RubberAccountSignOff {
  id: number;

  monthlyAccountId: number;

  monthlyAccount: RubberMonthlyAccount;

  directorName: string;

  directorEmail: string;

  status: SignOffStatus;

  signedAt: Date | null;

  signOffToken: string;

  tokenExpiresAt: Date;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
