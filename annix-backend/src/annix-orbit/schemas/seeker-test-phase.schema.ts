import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerTestPhaseDocument = HydratedDocument<SeekerTestPhase>;

@Schema({
  collection: "cv_assistant_seeker_test_phases",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerTestPhase {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Date, required: false, default: null })
  startDate: Date | null;

  @Prop({ type: Date, required: false, default: null })
  endDate: Date | null;

  @Prop({ type: String, default: "pending" })
  status: string;

  @Prop({ type: Number, default: 0 })
  targetUsers: number;

  @Prop({ type: Number, default: 0 })
  actualUsers: number;

  @Prop({ type: String, required: false, default: null })
  notes: string | null;

  @Prop({ type: Number, default: 0 })
  readinessPercentage: number;
}

export const SeekerTestPhaseSchema = SchemaFactory.createForClass(SeekerTestPhase);
