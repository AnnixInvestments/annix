import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type InboundEmailConfigDocument = HydratedDocument<InboundEmailConfig>;

@Schema({
  collection: "inbound_email_configs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class InboundEmailConfig {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  app: string;

  @Prop({ type: Number, required: false })
  companyId: number;

  @Prop({ type: String, required: true })
  emailHost: string;

  @Prop({ type: Number, required: true })
  emailPort: number;

  @Prop({ type: String, required: true })
  emailUser: string;

  @Prop({ type: Buffer, required: true })
  emailPassEncrypted: Buffer;

  @Prop({ type: Boolean, required: true })
  tlsEnabled: boolean;

  @Prop({ type: String, required: false })
  tlsServerName: string;

  @Prop({ type: Boolean, required: true })
  enabled: boolean;

  @Prop({ type: Date, required: false })
  lastPollAt: Date;

  @Prop({ type: String, required: false })
  lastError: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const InboundEmailConfigSchema = SchemaFactory.createForClass(InboundEmailConfig);
