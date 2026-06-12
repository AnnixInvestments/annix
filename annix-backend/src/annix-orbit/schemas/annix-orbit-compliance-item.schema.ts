import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { AnnixOrbitComplianceStatus } from "../entities/annix-orbit-compliance-item.entity";

export type AnnixOrbitComplianceItemDocument = HydratedDocument<AnnixOrbitComplianceItem>;

@Schema({
  collection: "orbit_compliance_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitComplianceItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: String, required: true })
  documentType: string;

  @Prop({ type: String, required: false, default: "missing" })
  status: AnnixOrbitComplianceStatus;

  @Prop({ type: String, required: false })
  expiryDate: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitComplianceItemSchema =
  SchemaFactory.createForClass(AnnixOrbitComplianceItem);
