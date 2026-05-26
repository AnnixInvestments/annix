import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CrmSyncLogDocument = HydratedDocument<CrmSyncLog>;

@Schema({
  collection: "annix_rep_crm_sync_logs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CrmSyncLog {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  configId: number;

  @Prop({ type: String, required: true })
  direction: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Number, required: true })
  recordsProcessed: number;

  @Prop({ type: Number, required: true })
  recordsSucceeded: number;

  @Prop({ type: Number, required: true })
  recordsFailed: number;

  @Prop({ type: Object, required: false })
  errorDetails: Record<string, unknown>;

  @Prop({ type: String, required: false })
  syncToken: string;

  @Prop({ type: String, required: false })
  startedAt: string;

  @Prop({ type: Date, required: false })
  completedAt: Date;
}

export const CrmSyncLogSchema = SchemaFactory.createForClass(CrmSyncLog);

CrmSyncLogSchema.virtual("config", {
  ref: "CrmConfig",
  localField: "configId",
  foreignField: "_id",
  justOne: true,
});
