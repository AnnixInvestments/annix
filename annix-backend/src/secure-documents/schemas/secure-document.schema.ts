import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SecureDocumentDocument = HydratedDocument<SecureDocument>;

@Schema({
  collection: "secure_document",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SecureDocument {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: true })
  storagePath: string;

  @Prop({ type: String, required: true })
  fileType: string;

  @Prop({ type: String, required: false })
  originalFilename: string;

  @Prop({ type: String, required: false })
  folder: string;

  @Prop({ type: String, required: false })
  attachmentPath: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  createdById: number;
}

export const SecureDocumentSchema = SchemaFactory.createForClass(SecureDocument);

SecureDocumentSchema.virtual("createdBy", {
  ref: "User",
  localField: "createdById",
  foreignField: "_id",
  justOne: true,
});
