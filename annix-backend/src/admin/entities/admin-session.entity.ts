import { User } from "../../user/entities/user.entity";

export class AdminSession {
  id: number;

  user: User;

  userId: number;

  sessionToken: string; // UUID

  clientIp: string;

  userAgent: string;

  expiresAt: Date;

  isRevoked: boolean;

  revokedAt: Date | null;

  createdAt: Date;

  lastActiveAt: Date;
}
