import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RfqClarificationRequestDocument = HydratedDocument<RfqClarificationRequest>;

@Schema({
  collection: "rfq_clarification_requests",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RfqClarificationRequest {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: Number, required: false })
  rfqDraftId: number;

  @Prop({ type: String, required: false })
  customerEmail: string;

  @Prop({ type: String, required: false })
  projectName: string;

  @Prop({ type: String, required: false })
  rfqReference: string;

  @Prop({ type: Object, required: true })
  requirements: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  responses: Record<string, unknown>;

  @Prop({ type: String, required: false })
  sentAt: string;

  @Prop({ type: Date, required: false })
  respondedAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RfqClarificationRequestSchema = SchemaFactory.createForClass(RfqClarificationRequest);
