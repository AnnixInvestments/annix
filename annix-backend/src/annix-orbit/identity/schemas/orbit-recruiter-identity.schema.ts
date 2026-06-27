import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { applyOrbitIdentityIndexes, OrbitIdentityBase } from "./orbit-identity.base.schema";

export type OrbitRecruiterIdentityDocument = HydratedDocument<OrbitRecruiterIdentity>;

@Schema({
  collection: "orbit_recruiter_identities",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class OrbitRecruiterIdentity extends OrbitIdentityBase {
  @Prop({ type: String, required: true, default: "recruiter" })
  module: string;
}

export const OrbitRecruiterIdentitySchema = applyOrbitIdentityIndexes(
  SchemaFactory.createForClass(OrbitRecruiterIdentity),
);
