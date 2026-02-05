import { Injectable } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { now } from '../../lib/datetime';
import { AUTH_CONSTANTS } from './auth.constants';

export interface CreateSessionResult<T> {
  session: T;
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
  createSession<T extends ObjectLiteral, TProfileId extends string>(
    repo: Repository<T>,
    data: SessionCreateData<TProfileId>,
  ): CreateSessionResult<T> {
    const sessionToken = uuidv4();
    const refreshToken = uuidv4();
    const expiresAt = now()
      .plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS })
      .toJSDate();

    const sessionData: Record<string, any> = {
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

    const session = repo.create(sessionData as T);

    return { session, sessionToken, refreshToken };
  }

  async validateSession<T extends ObjectLiteral>(
    repo: Repository<T>,
    sessionToken: string,
    relations?: string[],
  ): Promise<T | null> {
    const session = await repo.findOne({
      where: { sessionToken, isActive: true } as any,
      relations,
    });

    if (!session) return null;

    const sessionAny = session as any;
    if (now().toJSDate() > sessionAny.expiresAt) {
      sessionAny.isActive = false;
      sessionAny.invalidatedAt = now().toJSDate();
      sessionAny.invalidationReason = 'EXPIRED';
      await repo.save(session);
      return null;
    }

    sessionAny.lastActivity = now().toJSDate();
    await repo.save(session);

    return session;
  }

  async invalidateAllSessions<T extends ObjectLiteral>(
    repo: Repository<T>,
    profileId: number,
    profileIdField: string,
    reason: string,
  ): Promise<void> {
    await repo.update(
      { [profileIdField]: profileId, isActive: true } as any,
      {
        isActive: false,
        invalidatedAt: now().toJSDate(),
        invalidationReason: reason,
      } as any,
    );
  }

  async invalidateSession<T extends ObjectLiteral>(
    repo: Repository<T>,
    sessionToken: string,
    reason: string,
  ): Promise<T | null> {
    const session = await repo.findOne({
      where: { sessionToken, isActive: true } as any,
    });

    if (session) {
      const sessionAny = session as any;
      sessionAny.isActive = false;
      sessionAny.invalidatedAt = now().toJSDate();
      sessionAny.invalidationReason = reason;
      await repo.save(session);
    }

    return session;
  }

  async updateSessionToken<T extends ObjectLiteral>(
    repo: Repository<T>,
    profileId: number,
    profileIdField: string,
    newSessionToken: string,
  ): Promise<void> {
    const expiresAt = now()
      .plus({ hours: AUTH_CONSTANTS.SESSION_EXPIRY_HOURS })
      .toJSDate();

    await repo.update(
      { [profileIdField]: profileId, isActive: true } as any,
      {
        sessionToken: newSessionToken,
        lastActivity: now().toJSDate(),
        expiresAt,
      } as any,
    );
  }
}
