import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AppBrandingDocument = HydratedDocument<AppBranding>;

@Schema({
  collection: "app_branding",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AppBranding {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true, default: "#323288" })
  navbarColor: string;

  @Prop({ type: String, required: true, default: "#FF8A00" })
  accentOrange: string;

  @Prop({ type: String, required: true, default: "#FF9C33" })
  accentOrangeLight: string;

  @Prop({ type: String, required: true, default: "#CC6900" })
  accentOrangeDark: string;

  @Prop({ type: String, required: true, default: "#1a1a40" })
  gradientFrom: string;

  @Prop({ type: String, required: true, default: "#0d0d20" })
  gradientVia: string;

  @Prop({ type: String, required: true, default: "#1a1a40" })
  gradientTo: string;

  @Prop({ type: String, required: true, default: "" })
  tagline: string;

  @Prop({ type: String, required: true, default: "" })
  description: string;

  @Prop({ type: String, required: true, default: "" })
  heroWords: string;

  @Prop({ type: String, required: true, default: "Orbitron" })
  fontDisplay: string;

  @Prop({ type: String, required: true, default: "Exo 2" })
  fontHeadings: string;

  @Prop({ type: String, required: true, default: "Inter" })
  fontBody: string;

  @Prop({ type: String, required: false })
  logoIconPath: string;

  @Prop({ type: String, required: false })
  logoLockupPath: string;

  @Prop({ type: String, required: false })
  wordmarkPath: string;

  @Prop({ type: String, required: false })
  faviconPath: string;

  @Prop({ type: String, required: false })
  watermarkPath: string;

  @Prop({ type: String, required: false })
  textCropPath: string;

  @Prop({ type: String, required: false })
  subMarkPath: string;

  @Prop({ type: String, required: false })
  flashLinePath: string;

  @Prop({ type: String, required: false })
  heroImagePath: string;

  @Prop({ type: String, required: false })
  logoIconPathDark: string;

  @Prop({ type: String, required: false })
  logoLockupPathDark: string;

  @Prop({ type: String, required: false })
  wordmarkPathDark: string;

  @Prop({ type: String, required: false })
  faviconPathDark: string;

  @Prop({ type: String, required: false })
  watermarkPathDark: string;

  @Prop({ type: String, required: false })
  textCropPathDark: string;

  @Prop({ type: String, required: false })
  subMarkPathDark: string;

  @Prop({ type: String, required: false })
  flashLinePathDark: string;

  @Prop({ type: String, required: false })
  heroImagePathDark: string;

  @Prop({ type: Boolean, required: true, default: true })
  watermarkEnabled: boolean;

  @Prop({ type: Number, required: true, default: 0.1 })
  watermarkOpacity: number;

  @Prop({ type: Number, required: true, default: 880 })
  watermarkMaxSizePx: number;

  @Prop({ type: String, required: true, default: "pulse" })
  loadingAnimation: string;

  @Prop({ type: [String], required: true, default: [] })
  inheritedFields: string[];

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AppBrandingSchema = SchemaFactory.createForClass(AppBranding);
