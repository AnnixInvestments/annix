import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AppBrandingImageDocument = HydratedDocument<AppBrandingImage>;

@Schema({
  collection: "app_branding_images",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AppBrandingImage {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  brandCode: string;

  @Prop({ type: String, required: true, default: "" })
  label: string;

  @Prop({ type: String, required: true })
  path: string;

  @Prop({ type: Number, required: true, default: 0 })
  sortOrder: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const AppBrandingImageSchema = SchemaFactory.createForClass(AppBrandingImage);
