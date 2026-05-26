import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ContactDocument = HydratedDocument<Contact>;

@Schema({
  collection: "contacts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Contact {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  contactType: string;

  @Prop({ type: String, required: false })
  code: string;

  @Prop({ type: String, required: false })
  registrationNumber: string;

  @Prop({ type: String, required: false })
  vatNumber: string;

  @Prop({ type: String, required: false })
  phone: string;

  @Prop({ type: String, required: false })
  email: string;

  @Prop({ type: String, required: false })
  contactPerson: string;

  @Prop({ type: String, required: false })
  addressText: string;

  @Prop({ type: Object, required: false })
  addressJsonb: Record<string, unknown>;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Object, required: false })
  emailConfig: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  availableProducts: Record<string, unknown>;

  @Prop({ type: String, required: false })
  firebaseUid: string;

  @Prop({ type: Number, required: false })
  pricingTierId: number;

  @Prop({ type: String, required: false })
  pricingTierFirebaseUid: string;

  @Prop({ type: Number, required: false })
  sageContactId: number;

  @Prop({ type: String, required: false })
  sageContactType: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

ContactSchema.virtual("company", {
  ref: "Company",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});
