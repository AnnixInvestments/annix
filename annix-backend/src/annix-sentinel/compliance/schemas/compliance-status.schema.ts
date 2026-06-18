import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelComplianceStatusDocument = HydratedDocument<AnnixSentinelComplianceStatus>;

@Schema({
  collection: "comply_sa_compliance_statuses",
  timestamps: { createdAt: false, updatedAt: true },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelComplianceStatus {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  requirementId: number;

  @Prop({ type: String, required: true, default: "in_progress" })
  status: string;

  @Prop({ type: Date, required: false })
  lastCompletedDate: Date | null;

  @Prop({ type: Date, required: false })
  nextDueDate: Date | null;

  @Prop({ type: String, required: false })
  notes: string | null;

  @Prop({ type: Number, required: false })
  completedByUserId: number | null;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AnnixSentinelComplianceStatusSchema = SchemaFactory.createForClass(
  AnnixSentinelComplianceStatus,
);
