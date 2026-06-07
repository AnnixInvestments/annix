import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerTestEventDocument = HydratedDocument<SeekerTestEvent>;

@Schema({
  collection: "cv_assistant_seeker_events",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerTestEvent {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Number, required: false, default: null })
  candidateId: number | null;

  @Prop({ type: String, required: true })
  eventName: string;

  @Prop({ type: Date, required: true })
  ts: Date;

  @Prop({ type: Number, required: false, default: null })
  durationMs: number | null;

  @Prop({ type: Boolean, default: true })
  ok: boolean;

  @Prop({ type: String, required: false, default: null })
  errorMessage: string | null;

  @Prop({ type: String, required: false, default: null })
  page: string | null;

  @Prop({ type: String, required: false, default: null })
  phaseId: string | null;

  @Prop({ type: Object, required: false, default: null })
  metadata: Record<string, unknown> | null;
}

export const SeekerTestEventSchema = SchemaFactory.createForClass(SeekerTestEvent);
