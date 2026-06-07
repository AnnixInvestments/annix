import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerTestingIssueDocument = HydratedDocument<SeekerTestingIssue>;

@Schema({
  collection: "cv_assistant_seeker_test_issues",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerTestingIssue {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Number, required: false, default: null })
  userId: number | null;

  @Prop({ type: String, required: false, default: null })
  phaseId: string | null;

  @Prop({ type: String, required: false, default: null })
  page: string | null;

  @Prop({ type: String, required: false, default: null })
  workflowStep: string | null;

  @Prop({ type: String, default: "medium" })
  severity: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: false, default: null })
  screenshotUrl: string | null;

  @Prop({ type: String, default: "open" })
  status: string;

  @Prop({ type: Date, required: false, default: null })
  resolvedAt: Date | null;
}

export const SeekerTestingIssueSchema = SchemaFactory.createForClass(SeekerTestingIssue);
