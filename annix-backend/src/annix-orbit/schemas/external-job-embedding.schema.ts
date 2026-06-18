import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ExternalJobEmbeddingDocument = HydratedDocument<ExternalJobEmbedding>;

@Schema({
  collection: "cv_assistant_external_job_embeddings",
  timestamps: true,
})
export class ExternalJobEmbedding {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Buffer, required: false })
  embedding: Buffer;
}

export const ExternalJobEmbeddingSchema = SchemaFactory.createForClass(ExternalJobEmbedding);
