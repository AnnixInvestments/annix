import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberAppProfileDocument = HydratedDocument<RubberAppProfile>;

@Schema({
  collection: "rubber_app_profile",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberAppProfile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: false })
  legalName: string;

  @Prop({ type: String, required: false })
  tradingName: string;

  @Prop({ type: String, required: false })
  vatNumber: string;

  @Prop({ type: String, required: false })
  registrationNumber: string;

  @Prop({ type: String, required: false })
  streetAddress: string;

  @Prop({ type: String, required: false })
  city: string;

  @Prop({ type: String, required: false })
  province: string;

  @Prop({ type: String, required: false })
  postalCode: string;

  @Prop({ type: String, required: false })
  postalAddress: string;

  @Prop({ type: String, required: false })
  deliveryAddress: string;

  @Prop({ type: String, required: false })
  phone: string;

  @Prop({ type: String, required: false })
  email: string;

  @Prop({ type: String, required: false })
  websiteUrl: string;

  @Prop({ type: String, required: false })
  logoUrl: string;

  @Prop({ type: String, required: false })
  heroUrl: string;

  @Prop({ type: String, required: false })
  primaryColor: string;

  @Prop({ type: String, required: false })
  accentColor: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberAppProfileSchema = SchemaFactory.createForClass(RubberAppProfile);
