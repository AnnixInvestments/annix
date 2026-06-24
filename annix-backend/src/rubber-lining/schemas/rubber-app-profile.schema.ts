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

  @Prop({ type: Object, required: false })
  address: {
    streetAddress: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
  };

  @Prop({ type: String, required: false })
  postalAddress: string;

  @Prop({ type: String, required: false })
  deliveryAddress: string;

  @Prop({ type: Object, required: false })
  contact: {
    phone: string | null;
    email: string | null;
  };

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

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberAppProfileSchema = SchemaFactory.createForClass(RubberAppProfile);
