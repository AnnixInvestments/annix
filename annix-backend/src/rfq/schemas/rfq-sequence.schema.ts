import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RfqSequenceDocument = HydratedDocument<RfqSequence>;

@Schema({
  collection: "rfq_sequences",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RfqSequence {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  year: number;

  @Prop({ type: Number, required: true })
  lastSequence: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RfqSequenceSchema = SchemaFactory.createForClass(RfqSequence);
