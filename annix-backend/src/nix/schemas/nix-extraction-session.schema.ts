import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NixExtractionSessionDocument = HydratedDocument<NixExtractionSession>;

@Schema({
  collection: "nix_extraction_sessions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NixExtractionSession {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  sourceModule: string;

  @Prop({ type: Number, required: false })
  sourceId: number;

  @Prop({ type: String, required: true })
  extractionProfile: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  title: string;

  @Prop({ type: String, required: false })
  externalReference: string;

  @Prop({ type: String, required: false })
  promotedRef: string;

  @Prop({ type: Number, required: false })
  ownerUserId: number;

  @Prop({ type: Object, required: false })
  quoteEditorState: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  customerCompanyId: number;

  @Prop({ type: Object, required: false })
  customerSnapshot: Record<string, unknown>;

  @Prop({ type: String, required: false })
  customerOrderNumber: string;

  @Prop({ type: String, required: false })
  deliveryNoteRef: string;

  @Prop({ type: Object, required: false })
  quoteNotes: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  submittedAt: Date;

  @Prop({ type: Number, required: false })
  jobCardId: number;

  @Prop({ type: Number, required: false })
  quoteTotalIncVat: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const NixExtractionSessionSchema = SchemaFactory.createForClass(NixExtractionSession);

NixExtractionSessionSchema.virtual("ownerUser", {
  ref: "User",
  localField: "ownerUserId",
  foreignField: "_id",
  justOne: true,
});

NixExtractionSessionSchema.virtual("extractions", {
  ref: "NixExtraction",
  localField: "_id",
  foreignField: "sessionId",
  justOne: false,
});
