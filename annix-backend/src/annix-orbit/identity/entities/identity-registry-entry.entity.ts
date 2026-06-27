/**
 * Thin routing record (ADR-0001 non-negotiable condition #4 / M0): maps a global
 * numeric userId to the app + module that owns its identity row, so a consumer
 * holding only a bare userId can route to the correct identity collection without
 * a regex-over-everything scan.
 *
 * NOTE: this lives on ORBIT_CONNECTION for now because the only physically-split
 * identities so far are the four Orbit modules. When non-Orbit apps split, this
 * registry should move to the core cluster so it can route every app, not just
 * Orbit.
 */
export class IdentityRegistryEntry {
  /** The global userId — same numeric `_id` space as core `user` and the FKs. */
  id: number;

  app: string;

  module: string;

  emailLower: string;

  createdAt: Date;

  updatedAt: Date;
}
