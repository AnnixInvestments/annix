import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RfqDocumentDocument = HydratedDocument<RfqDocument>;

@Schema({
  collection: "rfq_documents",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RfqDocument {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  filename: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Number, required: false })
  rfqId: number;

  @Prop({ type: Number, required: false })
  uploadedById: number;
}

export const RfqDocumentSchema = SchemaFactory.createForClass(RfqDocument);

RfqDocumentSchema.virtual("rfq", {
  ref: "Rfq",
  localField: "rfqId",
  foreignField: "_id",
  justOne: true,
});

RfqDocumentSchema.virtual("uploadedBy", {
  ref: "User",
  localField: "uploadedById",
  foreignField: "_id",
  justOne: true,
});
