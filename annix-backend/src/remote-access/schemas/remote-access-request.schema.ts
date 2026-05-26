import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RemoteAccessRequestDocument = HydratedDocument<RemoteAccessRequest>;

@Schema({
  collection: "remote_access_requests",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RemoteAccessRequest {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  requestType: string;

  @Prop({ type: String, required: true })
  documentType: string;

  @Prop({ type: Number, required: true })
  documentId: number;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  requestedAt: string;

  @Prop({ type: Date, required: false })
  respondedAt: Date;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: String, required: false })
  message: string;

  @Prop({ type: String, required: false })
  denialReason: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  @Prop({ type: Number, required: false })
  requestedById: number;

  @Prop({ type: Number, required: false })
  documentOwnerId: number;
}

export const RemoteAccessRequestSchema = SchemaFactory.createForClass(RemoteAccessRequest);

RemoteAccessRequestSchema.virtual("requestedBy", {
  ref: "User",
  localField: "requestedById",
  foreignField: "_id",
  justOne: true,
});

RemoteAccessRequestSchema.virtual("documentOwner", {
  ref: "User",
  localField: "documentOwnerId",
  foreignField: "_id",
  justOne: true,
});
