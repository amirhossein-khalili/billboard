// domain/models/user-billboard-state.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserBillboardStateDocument = UserBillboardStateEntity & Document;

@Schema({ collection: 'user_billboard_state', timestamps: false })
export class UserBillboardStateEntity {
  @Prop({ required: true })
  messageId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  orgId: string;

  @Prop({ required: true, default: Date.now })
  closedAt: Date;
}

export const UserBillboardStateSchema = SchemaFactory.createForClass(
  UserBillboardStateEntity,
);

UserBillboardStateSchema.index(
  { messageId: 1, userId: 1, orgId: 1 },
  { unique: true },
);
