import type { User } from "../../user/entities/user.entity";
import type { OrbitModule } from "./orbit-module";

export interface OrbitIdentityProfileChanges {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  status?: string | null;
}

export type OrbitIdentityWriteOp =
  | "createIdentity"
  | "applyVerification"
  | "setVerificationToken"
  | "setResetToken"
  | "applyPasswordReset"
  | "recordLogin"
  | "applyProfileChanges"
  | "setStatus"
  | "deleteIdentity";

/**
 * The SINGLE dual-write abstraction for the per-module Orbit identity stores
 * (ADR-0001 / S3 / M3). Contract for EVERY method:
 *   - Mirror writes run ONLY when ORBIT_IDENTITY_DUAL_WRITE is on (else no-op).
 *   - They are called by the auth service ALWAYS AFTER the authoritative `user`
 *     write has succeeded.
 *   - Best-effort: a mirror failure NEVER throws to the caller (the user write is
 *     authoritative and already committed); it logs + enqueues a reconcile job.
 * Identity rows hold ONLY auth/identity fields — never whatsapp / notification
 * preferences — so notification prefs are deliberately outside this surface.
 *
 * M4 write discipline (so removing the read-fallback can't strand anyone):
 *   - `createIdentity` and `recordLogin` write a COMPLETE row + `identity_registry`
 *     (recordLogin is self-healing — it rebuilds a full row on every login).
 *   - The mutation mirrors (`applyVerification`, `setVerificationToken`,
 *     `setResetToken`, `applyPasswordReset`, `setStatus`, and the non-email branch
 *     of `applyProfileChanges`) are UPDATE-ONLY: they never insert a partial row;
 *     an update on an absent row enqueues a reconcile job instead.
 */
export abstract class OrbitIdentityWriter {
  abstract createIdentity(module: OrbitModule, user: User): Promise<void>;
  abstract applyVerification(userId: number, module: OrbitModule): Promise<void>;
  abstract setVerificationToken(
    userId: number,
    module: OrbitModule,
    token: string | null,
    expires: Date | null,
  ): Promise<void>;
  abstract setResetToken(
    userId: number,
    module: OrbitModule,
    token: string | null,
    expires: Date | null,
  ): Promise<void>;
  abstract applyPasswordReset(
    userId: number,
    module: OrbitModule,
    passwordHash: string,
  ): Promise<void>;
  abstract recordLogin(module: OrbitModule, user: User): Promise<void>;
  abstract applyProfileChanges(
    userId: number,
    module: OrbitModule,
    changes: OrbitIdentityProfileChanges,
  ): Promise<void>;
  abstract setStatus(userId: number, module: OrbitModule, status: string): Promise<void>;
  abstract deleteIdentity(userId: number, module: OrbitModule): Promise<void>;
}
