import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { applyOrbitIdentityIndexes, OrbitIdentityBase } from "./orbit-identity.base.schema";

export type OrbitCompanyIdentityDocument = HydratedDocument<OrbitCompanyIdentity>;

@Schema({
  collection: "orbit_company_identities",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class OrbitCompanyIdentity extends OrbitIdentityBase {
  @Prop({ type: String, required: true, default: "company" })
  module: string;
}

export const OrbitCompanyIdentitySchema = applyOrbitIdentityIndexes(
  SchemaFactory.createForClass(OrbitCompanyIdentity),
);
