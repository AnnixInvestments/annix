import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NdtMethodRequirementDocument = HydratedDocument<NdtMethodRequirement>;

@Schema({
  collection: "ndt_method_requirements",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NdtMethodRequirement {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  method: string;

  @Prop({ type: String, required: true })
  methodDisplayName: string;

  @Prop({ type: String, required: true })
  astmStandard: string;

  @Prop({ type: String, required: true })
  application: string;

  @Prop({ type: String, required: true })
  applicationDisplayName: string;

  @Prop({ type: Number, required: true })
  coveragePsl1Pct: number;

  @Prop({ type: Number, required: true })
  coveragePsl2Pct: number;

  @Prop({ type: String, required: true })
  acceptanceCriteriaRef: string;

  @Prop({ type: String, required: false })
  equipmentRequirements: string;

  @Prop({ type: String, required: true })
  operatorCertLevel: string;

  @Prop({ type: String, required: false })
  defectsDetected: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const NdtMethodRequirementSchema = SchemaFactory.createForClass(NdtMethodRequirement);
