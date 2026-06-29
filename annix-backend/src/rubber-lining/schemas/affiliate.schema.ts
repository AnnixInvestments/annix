import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AffiliateDocument = HydratedDocument<Affiliate>;

@Schema({
  collection: "rubber_affiliates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Affiliate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  contactName: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: false })
  phone: string;

  @Prop({ type: Number, required: false, default: 0 })
  commissionPercent: number;

  @Prop({ type: String, required: true, default: "ACTIVE" })
  status: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AffiliateSchema = SchemaFactory.createForClass(Affiliate);
