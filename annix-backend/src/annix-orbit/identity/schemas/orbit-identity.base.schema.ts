import { Prop } from "@nestjs/mongoose";
import type { Schema } from "mongoose";

/**
 * Shared `@Prop` definitions for the four Orbit identity collections. Each
 * concrete schema class extends this and adds its own `@Schema({ collection })`
 * registration plus a `module` default — keeping four distinct collection
 * registrations (ADR-0001) without duplicating the auth field set, which mirrors
 * the core `User` schema (`user/schemas/user.schema.ts`).
 */
export class OrbitIdentityBase {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  emailLower: string;

  @Prop({ type: String, required: false })
  passwordHash: string;

  @Prop({ type: String, required: false })
  firstName: string;

  @Prop({ type: String, required: false })
  lastName: string;

  @Prop({ type: Boolean, required: true, default: false })
  emailVerified: boolean;

  @Prop({ type: String, required: false })
  emailVerificationToken: string;

  @Prop({ type: Date, required: false })
  emailVerificationExpires: Date;

  @Prop({ type: String, required: false })
  resetPasswordToken: string;

  @Prop({ type: Date, required: false })
  resetPasswordExpires: Date;

  @Prop({ type: String, required: false })
  oauthProvider: string;

  @Prop({ type: String, required: false })
  oauthId: string;

  @Prop({ type: String, required: true, default: "active" })
  status: string;

  @Prop({ type: Date, required: false })
  lastLoginAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

/**
 * Applies the indexes every identity collection shares: a unique lookup on the
 * normalized email (module is implicit in the collection) plus non-unique token
 * lookups for email verification and password reset.
 */
export function applyOrbitIdentityIndexes<S extends Schema>(schema: S): S {
  schema.index({ emailLower: 1 }, { unique: true });
  schema.index({ emailVerificationToken: 1 });
  schema.index({ resetPasswordToken: 1 });
  return schema;
}
