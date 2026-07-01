import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RfqSourcingSendAuditDocument = HydratedDocument<RfqSourcingSendAudit>;

@Schema({
  collection: "rfq_sourcing_send_audits",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RfqSourcingSendAudit {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  sessionId: number;

  @Prop({ type: Number, required: false, default: null })
  supplierProfileId: number | null;

  @Prop({ type: Number, required: false, default: null })
  preferredSupplierId: number | null;

  @Prop({ type: String, required: true })
  recipientEmail: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: [Number], required: true, default: [] })
  itemRowNumbers: number[];

  @Prop({ type: String, required: false, default: null })
  aiRunId: string | null;

  @Prop({ type: String, required: true })
  draftedBody: string;

  @Prop({ type: String, required: true })
  editedBody: string;

  @Prop({ type: Boolean, required: true, default: false })
  wasEdited: boolean;

  @Prop({ type: Number, required: true })
  approverUserId: number;

  @Prop({ type: String, required: false, default: null })
  messageId: string | null;

  @Prop({ type: Date, required: true })
  sentAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RfqSourcingSendAuditSchema = SchemaFactory.createForClass(RfqSourcingSendAudit);
