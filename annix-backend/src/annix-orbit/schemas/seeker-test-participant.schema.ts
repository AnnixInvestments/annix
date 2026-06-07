import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerTestParticipantDocument = HydratedDocument<SeekerTestParticipant>;

@Schema({
  collection: "cv_assistant_seeker_test_participants",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerTestParticipant {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: String, required: true })
  phaseId: string;

  @Prop({ type: String, default: "seeker" })
  role: string;

  @Prop({ type: Date, required: true })
  joinedAt: Date;

  @Prop({ type: String, default: "active" })
  status: string;
}

export const SeekerTestParticipantSchema = SchemaFactory.createForClass(SeekerTestParticipant);
