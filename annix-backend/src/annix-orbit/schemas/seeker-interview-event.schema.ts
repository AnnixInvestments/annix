import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerInterviewEventDocument = HydratedDocument<SeekerInterviewEvent>;

@Schema({
  collection: "cv_assistant_seeker_interview_events",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerInterviewEvent {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: Number, required: false })
  applyClickId: number;

  @Prop({ type: Number, required: false })
  externalJobId: number;

  @Prop({ type: String, required: false })
  companyName: string;

  @Prop({ type: String, required: false })
  roleTitle: string;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  @Prop({ type: Date, required: false })
  endsAt: Date;

  @Prop({ type: String, required: false })
  locationLabel: string;

  @Prop({ type: String, required: false })
  locationAddress: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  cancelledAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const SeekerInterviewEventSchema = SchemaFactory.createForClass(SeekerInterviewEvent);
