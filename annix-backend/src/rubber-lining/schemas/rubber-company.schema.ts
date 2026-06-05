import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberCompanyDocument = HydratedDocument<RubberCompany>;

@Schema({
  collection: "rubber_company",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberCompany {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  companyType: string;

  @Prop({ type: String, required: false })
  code: string;

  @Prop({ type: String, required: false })
  pricingTierFirebaseUid: string;

  @Prop({ type: Number, required: false })
  pricingTierId: number;

  @Prop({ type: Object, required: true })
  availableProducts: Record<string, unknown>;

  @Prop({ type: Boolean, required: true })
  isCompoundOwner: boolean;

  @Prop({ type: Number, required: false })
  discountPercent: number;

  @Prop({ type: String, required: false })
  vatNumber: string;

  @Prop({ type: String, required: false })
  registrationNumber: string;

  @Prop({ type: Object, required: false })
  address: Record<string, unknown>;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  phone: string;

  @Prop({ type: String, required: false })
  contactPerson: string;

  @Prop({ type: Object, required: false })
  emailConfig: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  sageContactId: number;

  @Prop({ type: String, required: false })
  sageContactType: string;

  @Prop({ type: String, required: false })
  auCocRecipientEmail: string;

  @Prop({ type: Boolean, required: true })
  autoApproveAuCocs: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberCompanySchema = SchemaFactory.createForClass(RubberCompany);

RubberCompanySchema.virtual("pricingTier", {
  ref: "RubberPricingTier",
  localField: "pricingTierId",
  foreignField: "_id",
  justOne: true,
});
