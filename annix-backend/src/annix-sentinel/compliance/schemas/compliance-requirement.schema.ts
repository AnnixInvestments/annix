import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelComplianceRequirementDocument =
  HydratedDocument<AnnixSentinelComplianceRequirement>;

@Schema({
  collection: "comply_sa_compliance_requirements",
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelComplianceRequirement {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  regulator: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: Object, required: false })
  applicableConditions: Record<string, unknown> | null;

  @Prop({ type: String, required: true })
  frequency: string;

  @Prop({ type: Object, required: false })
  deadlineRule: Record<string, unknown> | null;

  @Prop({ type: String, required: false })
  penaltyDescription: string | null;

  @Prop({ type: String, required: false })
  guidanceUrl: string | null;

  @Prop({ type: [String], required: false })
  requiredDocuments: string[] | null;

  @Prop({ type: [String], required: false })
  checklistSteps: string[] | null;

  @Prop({ type: Number, required: true, default: 1 })
  tier: number;
}

export const AnnixSentinelComplianceRequirementSchema = SchemaFactory.createForClass(
  AnnixSentinelComplianceRequirement,
);
