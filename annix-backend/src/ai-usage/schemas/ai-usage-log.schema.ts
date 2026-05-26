import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AiUsageLogDocument = HydratedDocument<AiUsageLog>;

@Schema({
  collection: "ai_usage_logs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AiUsageLog {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  app: string;

  @Prop({ type: String, required: true })
  actionType: string;

  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: false })
  model: string;

  @Prop({ type: Number, required: false })
  tokensUsed: number;

  @Prop({ type: Number, required: false })
  pageCount: number;

  @Prop({ type: Number, required: false })
  processingTimeMs: number;

  @Prop({ type: Object, required: false })
  contextInfo: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const AiUsageLogSchema = SchemaFactory.createForClass(AiUsageLog);
