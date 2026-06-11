import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CalibrationCertificateDocument = HydratedDocument<CalibrationCertificate>;

@Schema({
  collection: "calibration_certificates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CalibrationCertificate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  equipmentName: string;

  @Prop({ type: String, required: false })
  equipmentIdentifier: string;

  @Prop({ type: String, required: false })
  certificateNumber: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Date, required: true })
  expiryDate: Date;

  @Prop({ type: Date, required: false })
  expiryWarningSentAt: Date;

  @Prop({ type: Date, required: false })
  expiryNotificationSentAt: Date;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Number, required: false })
  uploadedById: number;

  @Prop({ type: String, required: false })
  uploadedByName: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const CalibrationCertificateSchema = SchemaFactory.createForClass(CalibrationCertificate);

CalibrationCertificateSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

CalibrationCertificateSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
