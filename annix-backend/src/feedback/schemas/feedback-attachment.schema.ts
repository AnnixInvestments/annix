import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FeedbackAttachmentDocument = HydratedDocument<FeedbackAttachment>;

@Schema({
  collection: "feedback_attachment",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FeedbackAttachment {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  feedbackId: number;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  fileSize: number;

  @Prop({ type: Boolean, required: true })
  isAutoScreenshot: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const FeedbackAttachmentSchema = SchemaFactory.createForClass(FeedbackAttachment);

FeedbackAttachmentSchema.virtual("feedback", {
  ref: "CustomerFeedback",
  localField: "feedbackId",
  foreignField: "_id",
  justOne: true,
});
