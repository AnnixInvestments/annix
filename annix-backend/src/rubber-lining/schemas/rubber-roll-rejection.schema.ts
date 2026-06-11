import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberRollRejectionDocument = HydratedDocument<RubberRollRejection>;

@Schema({
  collection: "rubber_roll_rejections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberRollRejection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: Number, required: true })
  originalSupplierCocId: number;

  @Prop({ type: String, required: true })
  rollNumber: string;

  @Prop({ type: Number, required: false })
  rollStockId: number;

  @Prop({ type: String, required: true })
  rejectionReason: string;

  @Prop({ type: String, required: true })
  rejectedBy: string;

  @Prop({ type: Date, required: true })
  rejectedAt: Date;

  @Prop({ type: String, required: false })
  returnDocumentPath: string;

  @Prop({ type: Number, required: false })
  replacementSupplierCocId: number;

  @Prop({ type: String, required: false })
  replacementRollNumber: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberRollRejectionSchema = SchemaFactory.createForClass(RubberRollRejection);

RubberRollRejectionSchema.virtual("originalSupplierCoc", {
  ref: "RubberSupplierCoc",
  localField: "originalSupplierCocId",
  foreignField: "_id",
  justOne: true,
});

RubberRollRejectionSchema.virtual("rollStock", {
  ref: "RubberRollStock",
  localField: "rollStockId",
  foreignField: "_id",
  justOne: true,
});

RubberRollRejectionSchema.virtual("replacementSupplierCoc", {
  ref: "RubberSupplierCoc",
  localField: "replacementSupplierCocId",
  foreignField: "_id",
  justOne: true,
});
