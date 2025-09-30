import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BillboardMessagesDocument = BillboardMessagesEntity & Document;

@Schema({ collection: 'billboard_messages', timestamps: true })
export class BillboardMessagesEntity {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  organizationId: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null })
  deletedAt: Date;

  @Prop({ default: null })
  deletedBy: string;
}

export const BillboardMessagesSchema = SchemaFactory.createForClass(
  BillboardMessagesEntity,
);

BillboardMessagesSchema.index({
  organizationId: 1,
  isDeleted: 1,
  createdAt: -1,
});
BillboardMessagesSchema.index({ createdAt: -1 });