import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitProfileDocument = HydratedDocument<AnnixOrbitProfile>;

@Schema({
  collection: "cv_assistant_profiles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitProfile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Number, required: false })
  companyId: number;

  @Prop({ type: String, required: true, default: "company" })
  userType: string;

  @Prop({ type: Number, required: true, default: 80 })
  matchAlertThreshold: number;

  @Prop({ type: Boolean, required: true, default: true })
  digestEnabled: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  pushEnabled: boolean;

  @Prop({ type: String, required: false })
  cvFilePath: string;

  @Prop({ type: String, required: false })
  rawCvText: string;

  @Prop({ type: Object, required: false })
  extractedCvData: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  nixGeneratedCv: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  nixGeneratedCvAt: Date;

  @Prop({ type: Date, required: false })
  cvUploadedAt: Date;

  @Prop({ type: String, required: false })
  deletionToken: string;

  @Prop({ type: Date, required: false })
  deletionTokenExpires: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitProfileSchema = SchemaFactory.createForClass(AnnixOrbitProfile);

AnnixOrbitProfileSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

AnnixOrbitProfileSchema.virtual("company", {
  ref: "Company",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});
