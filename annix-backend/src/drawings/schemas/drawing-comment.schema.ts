import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type DrawingCommentDocument = HydratedDocument<DrawingComment>;

@Schema({
  collection: "drawing_comments",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DrawingComment {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  commentText: string;

  @Prop({ type: String, required: true })
  commentType: string;

  @Prop({ type: Number, required: false })
  positionX: number;

  @Prop({ type: Number, required: false })
  positionY: number;

  @Prop({ type: Number, required: false })
  pageNumber: number;

  @Prop({ type: Boolean, required: true })
  isResolved: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  drawingId: number;

  @Prop({ type: Number, required: false })
  userId: number;

  @Prop({ type: Number, required: false })
  parentCommentId: number;
}

export const DrawingCommentSchema = SchemaFactory.createForClass(DrawingComment);

DrawingCommentSchema.virtual("drawing", {
  ref: "Drawing",
  localField: "drawingId",
  foreignField: "_id",
  justOne: true,
});

DrawingCommentSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

DrawingCommentSchema.virtual("parentComment", {
  ref: "DrawingComment",
  localField: "parentCommentId",
  foreignField: "_id",
  justOne: true,
});
