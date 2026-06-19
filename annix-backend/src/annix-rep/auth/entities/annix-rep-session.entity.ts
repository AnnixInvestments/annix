import { SessionInvalidationReason } from "../../../shared/enums";
import { User } from "../../../user/entities/user.entity";

export class AnnixRepSession {
  id: number;

  user: User;

  userId: number;

  sessionToken: string;

  refreshToken: string;

  ipAddress: string;

  userAgent: string;

  isActive: boolean;

  createdAt: Date;

  expiresAt: Date;

  lastActivity: Date;

  invalidatedAt: Date;

  invalidationReason: SessionInvalidationReason;
}
