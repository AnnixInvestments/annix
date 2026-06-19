import { User } from "../../user/entities/user.entity";

export abstract class BasePortalProfile {
  id: number;

  user: User;

  userId: number;

  jobTitle: string;

  directPhone: string;

  mobilePhone: string;

  emailVerified: boolean;

  emailVerificationToken: string | null;

  emailVerificationExpires: Date | null;

  suspensionReason?: string | null;

  suspendedAt?: Date | null;

  suspendedBy?: number | null;

  documentStorageAcceptedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
