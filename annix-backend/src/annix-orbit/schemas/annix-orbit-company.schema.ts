import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitCompanyDocument = HydratedDocument<AnnixOrbitCompany>;

@Schema({
  collection: "cv_assistant_companies",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitCompany {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  emailFromAddress: string;

  @Prop({ type: Boolean, required: true })
  isDesignatedEmployer: boolean;

  @Prop({ type: String, required: false })
  economicSector: string;

  @Prop({ type: Boolean, required: true })
  eeaReportingEnabled: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AnnixOrbitCompanySchema = SchemaFactory.createForClass(AnnixOrbitCompany);
