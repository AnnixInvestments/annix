import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberCompoundDocument = HydratedDocument<RubberCompound>;

@Schema({
  collection: "sm_rubber_compound",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberCompound {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: false })
  supplierId: number;

  @Prop({ type: String, required: false })
  supplierName: string;

  @Prop({ type: String, required: true })
  compoundFamily: string;

  @Prop({ type: Number, required: false })
  shoreHardness: number;

  @Prop({ type: Number, required: false })
  densityKgPerM3: number;

  @Prop({ type: Number, required: false })
  specificGravity: number;

  @Prop({ type: Number, required: false })
  tempRangeMinC: number;

  @Prop({ type: Number, required: false })
  tempRangeMaxC: number;

  @Prop({ type: Number, required: false })
  elongationAtBreakPct: number;

  @Prop({ type: Number, required: false })
  tensileStrengthMpa: number;

  @Prop({ type: [String], required: false })
  chemicalResistance: string;

  @Prop({ type: String, required: false })
  defaultColour: string;

  @Prop({ type: String, required: true })
  datasheetStatus: string;

  @Prop({ type: Number, required: false })
  lastExtractionDatasheetId: number;

  @Prop({ type: String, required: false })
  legacyFirebaseUid: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberCompoundSchema = SchemaFactory.createForClass(RubberCompound);
