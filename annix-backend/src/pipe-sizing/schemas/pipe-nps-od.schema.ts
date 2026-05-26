import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeNpsOdDocument = HydratedDocument<PipeNpsOd>;

@Schema({
  collection: "pipe_nps_od",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeNpsOd {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  nps: string;

  @Prop({ type: Number, required: true })
  odInch: number;

  @Prop({ type: Number, required: true })
  odMm: number;
}

export const PipeNpsOdSchema = SchemaFactory.createForClass(PipeNpsOd);
