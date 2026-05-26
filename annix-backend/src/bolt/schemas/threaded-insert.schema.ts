import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ThreadedInsertDocument = HydratedDocument<ThreadedInsert>;

@Schema({
  collection: "threaded_inserts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ThreadedInsert {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  designation: string;

  @Prop({ type: String, required: true })
  insertType: string;

  @Prop({ type: String, required: true })
  material: string;

  @Prop({ type: String, required: false })
  standard: string;

  @Prop({ type: Number, required: false })
  outerDiameterMm: number;

  @Prop({ type: Number, required: false })
  lengthMm: number;

  @Prop({ type: Number, required: false })
  massKg: number;
}

export const ThreadedInsertSchema = SchemaFactory.createForClass(ThreadedInsert);
