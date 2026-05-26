import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type IssuanceItemCoatTrackingDocument = HydratedDocument<IssuanceItemCoatTracking>;

@Schema({
  collection: "sm_issuance_item_coat_tracking",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class IssuanceItemCoatTracking {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  issuanceRowId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: true })
  lineItemId: number;

  @Prop({ type: String, required: true })
  coatType: string;

  @Prop({ type: Number, required: true })
  quantityIssued: number;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const IssuanceItemCoatTrackingSchema =
  SchemaFactory.createForClass(IssuanceItemCoatTracking);

IssuanceItemCoatTrackingSchema.virtual("issuanceRow", {
  ref: "IssuanceRow",
  localField: "issuanceRowId",
  foreignField: "_id",
  justOne: true,
});
