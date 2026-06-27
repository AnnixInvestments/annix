import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { applyOrbitIdentityIndexes, OrbitIdentityBase } from "./orbit-identity.base.schema";

export type OrbitSeekerIdentityDocument = HydratedDocument<OrbitSeekerIdentity>;

@Schema({
  collection: "orbit_seeker_identities",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class OrbitSeekerIdentity extends OrbitIdentityBase {
  @Prop({ type: String, required: true, default: "seeker" })
  module: string;
}

export const OrbitSeekerIdentitySchema = applyOrbitIdentityIndexes(
  SchemaFactory.createForClass(OrbitSeekerIdentity),
);
