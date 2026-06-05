import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SecureEntityFolderDocument = HydratedDocument<SecureEntityFolder>;

@Schema({
  collection: "secure_entity_folders",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SecureEntityFolder {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  entityType: string;

  @Prop({ type: Number, required: true })
  entityId: number;

  @Prop({ type: String, required: true })
  folderName: string;

  @Prop({ type: String, required: true })
  secureFolderPath: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  deletedAt: Date;

  @Prop({ type: String, required: false })
  deletionReason: string;
}

export const SecureEntityFolderSchema = SchemaFactory.createForClass(SecureEntityFolder);
