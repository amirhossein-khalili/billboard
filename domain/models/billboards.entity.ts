import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BillboardsDocument = BillboardsEntity & Document;

/**
 * @class BillboardsEntity
 * @description Represents a billboard message in the database.
 */
@Schema({ collection: 'billboards', timestamps: true })
export class BillboardsEntity {
  @Prop({ required: true })
    _id: string;

  @Prop({ required: true })
    message: string;

  @Prop({ required: true, default: false })
    isWildcard: boolean;

  @Prop({ type: [String], default: [] })
    organizationIds: string[];

  @Prop({ required: true, default: Date.now })
    createdAt: Date;

  @Prop({ required: true })
    createdBy: string;

  @Prop({ default: false })
    isDeleted: boolean;

  @Prop({ default: null })
    deletedAt: Date;

  @Prop({ default: null })
    deletedBy: string;
}

export const BillboardsSchema = SchemaFactory.createForClass(BillboardsEntity);

// Create indexes for better query performance
BillboardsSchema.index({ organizationIds: 1, isDeleted: 1, createdAt: -1 });
BillboardsSchema.index({ isWildcard: 1, isDeleted: 1, createdAt: -1 });
BillboardsSchema.index({ createdAt: -1 });
