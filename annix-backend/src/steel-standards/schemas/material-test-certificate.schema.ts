import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MaterialTestCertificateDocument = HydratedDocument<MaterialTestCertificate>;

@Schema({
  collection: "material_test_certificates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MaterialTestCertificate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  mtcNumber: string;

  @Prop({ type: String, required: false })
  mtcType: string;

  @Prop({ type: String, required: false })
  manufacturer: string;

  @Prop({ type: String, required: true })
  heatNumber: string;

  @Prop({ type: String, required: false })
  lotNumber: string;

  @Prop({ type: String, required: true })
  specification: string;

  @Prop({ type: String, required: true })
  grade: string;

  @Prop({ type: String, required: false })
  size: string;

  @Prop({ type: Number, required: false })
  quantity: number;

  @Prop({ type: Number, required: false })
  cPct: number;

  @Prop({ type: Number, required: false })
  mnPct: number;

  @Prop({ type: Number, required: false })
  pPct: number;

  @Prop({ type: Number, required: false })
  sPct: number;

  @Prop({ type: Number, required: false })
  siPct: number;

  @Prop({ type: Number, required: false })
  crPct: number;

  @Prop({ type: Number, required: false })
  moPct: number;

  @Prop({ type: Number, required: false })
  niPct: number;

  @Prop({ type: Number, required: false })
  vPct: number;

  @Prop({ type: Number, required: false })
  cuPct: number;

  @Prop({ type: Number, required: false })
  nbPct: number;

  @Prop({ type: Number, required: false })
  tiPct: number;

  @Prop({ type: Number, required: false })
  alPct: number;

  @Prop({ type: Number, required: false })
  nPct: number;

  @Prop({ type: Number, required: false })
  bPct: number;

  @Prop({ type: Number, required: false })
  carbonEquivalent: number;

  @Prop({ type: String, required: false })
  ceFormulaUsed: string;

  @Prop({ type: Number, required: false })
  yieldStrengthMpa: number;

  @Prop({ type: Number, required: false })
  tensileStrengthMpa: number;

  @Prop({ type: Number, required: false })
  elongationPct: number;

  @Prop({ type: Number, required: false })
  reductionAreaPct: number;

  @Prop({ type: Number, required: false })
  impactTestTempC: number;

  @Prop({ type: String, required: false })
  impactSpecimenSize: string;

  @Prop({ type: Object, required: false })
  impactValuesJ: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  impactAverageJ: number;

  @Prop({ type: Number, required: false })
  hardnessHrc: number;

  @Prop({ type: Number, required: false })
  hardnessHv: number;

  @Prop({ type: Number, required: false })
  hardnessHb: number;

  @Prop({ type: Object, required: false })
  ndtMethodsPerformed: Record<string, unknown>;

  @Prop({ type: String, required: false })
  ndtResults: string;

  @Prop({ type: Number, required: false })
  hydroTestPressureBar: number;

  @Prop({ type: String, required: false })
  hydroTestResult: string;

  @Prop({ type: String, required: false })
  pslLevel: string;

  @Prop({ type: Boolean, required: false })
  naceCompliant: boolean;

  @Prop({ type: Boolean, required: false })
  dnvCompliant: boolean;

  @Prop({ type: Boolean, required: false })
  thirdPartyInspection: boolean;

  @Prop({ type: String, required: false })
  inspectorName: string;

  @Prop({ type: Date, required: false })
  certificateDate: Date;

  @Prop({ type: Number, required: false })
  rfqItemId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const MaterialTestCertificateSchema = SchemaFactory.createForClass(MaterialTestCertificate);
