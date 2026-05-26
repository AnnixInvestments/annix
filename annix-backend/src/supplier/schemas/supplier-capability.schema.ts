import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SupplierCapabilityDocument = HydratedDocument<SupplierCapability>;

@Schema({
  collection: "supplier_capabilities",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SupplierCapability {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  supplierProfileId: number;

  @Prop({ type: String, required: true })
  productCategory: string;

  @Prop({ type: [String], required: true })
  materialSpecializations: string;

  @Prop({ type: Number, required: false })
  monthlyCapacityTons: number;

  @Prop({ type: String, required: false })
  sizeRangeDescription: string;

  @Prop({ type: String, required: false })
  pressureRatings: string;

  @Prop({ type: [String], required: true })
  operationalRegions: string;

  @Prop({ type: Boolean, required: true })
  nationwideCoverage: boolean;

  @Prop({ type: Boolean, required: true })
  internationalSupply: boolean;

  @Prop({ type: [String], required: true })
  certifications: string;

  @Prop({ type: Date, required: false })
  certificationExpiryDate: Date;

  @Prop({ type: Number, required: false })
  standardLeadTimeDays: number;

  @Prop({ type: Number, required: false })
  expeditedLeadTimeDays: number;

  @Prop({ type: Number, required: false })
  minimumOrderValue: number;

  @Prop({ type: String, required: false })
  minimumOrderQuantity: string;

  @Prop({ type: Boolean, required: true })
  millTestCertificates: boolean;

  @Prop({ type: Boolean, required: true })
  thirdPartyInspection: boolean;

  @Prop({ type: String, required: false })
  qualityDocumentation: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Number, required: false })
  capabilityScore: number;

  @Prop({ type: Date, required: false })
  lastVerifiedAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const SupplierCapabilitySchema = SchemaFactory.createForClass(SupplierCapability);

SupplierCapabilitySchema.virtual("supplierProfile", {
  ref: "SupplierProfile",
  localField: "supplierProfileId",
  foreignField: "_id",
  justOne: true,
});
