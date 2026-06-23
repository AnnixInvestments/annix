import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PasskeyDocument = HydratedDocument<Passkey>;

@Schema({
  collection: "passkeys",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Passkey {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: false, default: null })
  appScope: string | null;

  @Prop({ type: String, required: true })
  credentialId: string;

  @Prop({ type: String, required: true })
  publicKey: string;

  @Prop({ type: Number, required: true })
  counter: number;

  @Prop({ type: Object, required: true })
  transports: Record<string, unknown>;

  @Prop({ type: String, required: false })
  deviceName: string;

  @Prop({ type: Boolean, required: true })
  backupEligible: boolean;

  @Prop({ type: Boolean, required: true })
  backupState: boolean;

  @Prop({ type: Date, required: false })
  lastUsedAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PasskeySchema = SchemaFactory.createForClass(Passkey);

PasskeySchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
