import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type IdempotencyKeyDocument = HydratedDocument<IdempotencyKey>;

@Schema({
  collection: "idempotency_keys",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class IdempotencyKey {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: String, required: true })
  requestMethod: string;

  @Prop({ type: String, required: true })
  requestPath: string;

  @Prop({ type: Number, required: true })
  responseStatus: number;

  @Prop({ type: Object, required: true })
  responseBody: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const IdempotencyKeySchema = SchemaFactory.createForClass(IdempotencyKey);
