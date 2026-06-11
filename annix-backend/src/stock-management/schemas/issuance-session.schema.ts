import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type IssuanceSessionDocument = HydratedDocument<IssuanceSession>;

@Schema({
  collection: "sm_issuance_session",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class IssuanceSession {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  sessionKind: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Number, required: false })
  issuerStaffId: number;

  @Prop({ type: Number, required: false })
  recipientStaffId: number;

  @Prop({ type: Number, required: false })
  cpoId: number;

  @Prop({ type: [Number], required: false })
  jobCardIds: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Number, required: false })
  approvalThresholdValueR: number;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: Number, required: false })
  approvedByStaffId: number;

  @Prop({ type: Date, required: false })
  rejectedAt: Date;

  @Prop({ type: Number, required: false })
  rejectedByStaffId: number;

  @Prop({ type: String, required: false })
  rejectionReason: string;

  @Prop({ type: Date, required: false })
  undoneAt: Date;

  @Prop({ type: Number, required: false })
  undoneByStaffId: number;

  @Prop({ type: Number, required: false })
  legacySessionId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const IssuanceSessionSchema = SchemaFactory.createForClass(IssuanceSession);

IssuanceSessionSchema.virtual("rows", {
  ref: "IssuanceRow",
  localField: "_id",
  foreignField: "sessionId",
  justOne: false,
});
