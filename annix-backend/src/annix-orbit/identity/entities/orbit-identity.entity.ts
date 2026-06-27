/**
 * Per-module Orbit identity stores (ADR-0001). Each Orbit module authenticates
 * against its own physically separate collection. The fields below mirror the
 * core `User` auth shape (`user/schemas/user.schema.ts`) so the M1 backfill is a
 * trivial 1:1 copy that preserves the global numeric `_id`.
 */
export type OrbitIdentityModule = "company" | "seeker" | "recruiter" | "student";

export abstract class OrbitIdentity {
  id: number;

  email: string;

  /** Normalized lowercase email backing the per-collection unique index. */
  emailLower: string;

  passwordHash: string | null;

  firstName: string | null;

  lastName: string | null;

  emailVerified: boolean;

  emailVerificationToken: string | null;

  emailVerificationExpires: Date | null;

  resetPasswordToken: string | null;

  resetPasswordExpires: Date | null;

  oauthProvider: string | null;

  oauthId: string | null;

  module: OrbitIdentityModule;

  status: string;

  lastLoginAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
