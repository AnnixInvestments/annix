import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { now } from "../../lib/datetime";
import type { DeepPartial, PersistedEntity } from "../../lib/persistence/crud-repository";
import { AUTH_CONSTANTS } from "./auth.constants";
import type { AuthSessionRepository } from "./auth-session.repository";

export interface CreateSessionResult<T> {
  sessionData: DeepPartial<T>;
  sessionToken: string;
  refreshToken: string;
}

export interface SessionCreateData<TProfileId extends string> {
  profileId: number;
  profileIdField: TProfileId;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class SessionService {
  createSession<T extends PersistedEntity, TProfileId extends string>(
    data: SessionCreateData<TProfileId>,
  ): CreateSessionResult<T> {
    const sessionToken = uuidv4();
    const refreshToken = uuidv4();
    const expiresAt = now().plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS }).toJSDate();

    const sessionData: Record<string, unknown> = {
      [data.profileIdField]: data.profileId,
      sessionToken,
      refreshToken,
      deviceFingerprint: data.deviceFingerprint,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      isActive: true,
      expiresAt,
      lastActivity: now().toJSDate(),
    };

    return { sessionData: sessionData as DeepPartial<T>, sessionToken, refreshToken };
  }

  async validateSession<T extends PersistedEntity>(
    repo: AuthSessionRepository<T>,
    sessionToken: string,
    relations?: string[],
  ): Promise<T | null> {
    const session = await repo.findActiveByToken(sessionToken, relations);

    if (!session) return null;

    const sessionAny = session as Record<string, unknown>;
    if (now().toJSDate() > (sessionAny.expiresAt as Date)) {
      sessionAny.isActive = false;
      sessionAny.invalidatedAt = now().toJSDate();
      sessionAny.invalidationReason = "EXPIRED";
      await repo.save(session);
      return null;
    }

    sessionAny.lastActivity = now().toJSDate();
    await repo.save(session);

    return session;
  }

  async invalidateAllSessions<T extends PersistedEntity>(
    repo: AuthSessionRepository<T>,
    profileId: number,
    profileIdField: string,
    reason: string,
  ): Promise<void> {
    await repo.updateActiveByProfile(profileIdField, profileId, {
      isActive: false,
      invalidatedAt: now().toJSDate(),
      invalidationReason: reason,
    } as unknown as DeepPartial<T>);
  }

  async invalidateSession<T extends PersistedEntity>(
    repo: AuthSessionRepository<T>,
    sessionToken: string,
    reason: string,
  ): Promise<T | null> {
    const session = await repo.findActiveByToken(sessionToken);

    if (session) {
      const sessionAny = session as Record<string, unknown>;
      sessionAny.isActive = false;
      sessionAny.invalidatedAt = now().toJSDate();
      sessionAny.invalidationReason = reason;
      await repo.save(session);
    }

    return session;
  }

  async updateSessionToken<T extends PersistedEntity>(
    repo: AuthSessionRepository<T>,
    profileId: number,
    profileIdField: string,
    newSessionToken: string,
  ): Promise<void> {
    const expiresAt = now().plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS }).toJSDate();

    await repo.updateActiveByProfile(profileIdField, profileId, {
      sessionToken: newSessionToken,
      lastActivity: now().toJSDate(),
      expiresAt,
    } as unknown as DeepPartial<T>);
  }
}
