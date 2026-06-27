import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type IdentityRegistryEntryDocument = HydratedDocument<IdentityRegistryEntry>;

/**
 * `identity_registry` (ADR-0001 / M0). `_id` is the global userId and the natural
 * unique key; `emailLower` is indexed for reverse lookups. Registered on
 * ORBIT_CONNECTION for now (see entity note about a future move to the core
 * cluster when non-Orbit apps split).
 */
@Schema({
  collection: "identity_registry",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class IdentityRegistryEntry {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  app: string;

  @Prop({ type: String, required: true })
  module: string;

  @Prop({ type: String, required: true })
  emailLower: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const IdentityRegistryEntrySchema = SchemaFactory.createForClass(IdentityRegistryEntry);

IdentityRegistryEntrySchema.index({ emailLower: 1 });
