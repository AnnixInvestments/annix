import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

@Schema({ collection: "cv_assistant_usage_counters", timestamps: true })
export class SeekerUsageCounter {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  subjectId: string;

  @Prop({ type: String, required: true })
  operation: string;

  @Prop({ type: String, required: true })
  monthKey: string;

  @Prop({ type: Number, required: true, default: 0 })
  count: number;
}

export const SeekerUsageCounterSchema = SchemaFactory.createForClass(SeekerUsageCounter);

export type SeekerUsageCounterDocument = HydratedDocument<SeekerUsageCounter>;
