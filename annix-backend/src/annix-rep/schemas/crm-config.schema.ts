import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CrmConfigDocument = HydratedDocument<CrmConfig>;

@Schema({
  collection: "annix_rep_crm_configs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CrmConfig {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  crmType: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Object, required: false })
  webhookConfig: Record<string, unknown>;

  @Prop({ type: String, required: false })
  apiKeyEncrypted: string;

  @Prop({ type: String, required: false })
  apiSecretEncrypted: string;

  @Prop({ type: String, required: false })
  instanceUrl: string;

  @Prop({ type: String, required: false })
  refreshTokenEncrypted: string;

  @Prop({ type: Date, required: false })
  tokenExpiresAt: Date;

  @Prop({ type: String, required: false })
  crmUserId: string;

  @Prop({ type: String, required: false })
  crmOrganizationId: string;

  @Prop({ type: Object, required: false })
  prospectFieldMappings: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  meetingFieldMappings: Record<string, unknown>;

  @Prop({ type: Boolean, required: true })
  syncProspects: boolean;

  @Prop({ type: Boolean, required: true })
  syncMeetings: boolean;

  @Prop({ type: Boolean, required: true })
  syncOnCreate: boolean;

  @Prop({ type: Boolean, required: true })
  syncOnUpdate: boolean;

  @Prop({ type: String, required: true })
  conflictResolution: string;

  @Prop({ type: String, required: false })
  lastPullSyncToken: string;

  @Prop({ type: Date, required: false })
  lastSyncAt: Date;

  @Prop({ type: String, required: false })
  lastSyncError: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CrmConfigSchema = SchemaFactory.createForClass(CrmConfig);

CrmConfigSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
