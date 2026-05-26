import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SupplierInvitationDocument = HydratedDocument<SupplierInvitation>;

@Schema({
  collection: "supplier_invitations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SupplierInvitation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  customerCompanyId: number;

  @Prop({ type: Number, required: true })
  invitedById: number;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: false })
  supplierCompanyName: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: false })
  acceptedAt: Date;

  @Prop({ type: String, required: false })
  supplierProfileId: string;

  @Prop({ type: String, required: false })
  message: string;
}

export const SupplierInvitationSchema = SchemaFactory.createForClass(SupplierInvitation);

SupplierInvitationSchema.virtual("customerCompany", {
  ref: "Company",
  localField: "customerCompanyId",
  foreignField: "_id",
  justOne: true,
});

SupplierInvitationSchema.virtual("invitedBy", {
  ref: "CustomerProfile",
  localField: "invitedById",
  foreignField: "_id",
  justOne: true,
});

SupplierInvitationSchema.virtual("supplierProfile", {
  ref: "SupplierProfile",
  localField: "supplierProfileId",
  foreignField: "_id",
  justOne: true,
});
