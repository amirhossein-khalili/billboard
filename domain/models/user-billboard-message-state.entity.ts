import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserBillboardMessageStateDocument =
  UserBillboardMessagesStateEntity & Document;

@Schema({ collection: 'user_billboard_message_state', timestamps: false })
export class UserBillboardMessagesStateEntity {
  @Prop({ required: true })
  messageId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  orgId: string;

  @Prop({ required: true, default: Date.now })
  closedAt: Date;
}

export const UserBillboardMessagesStateSchema = SchemaFactory.createForClass(
  UserBillboardMessagesStateEntity,
);

UserBillboardMessagesStateSchema.index(
  { messageId: 1, userId: 1, orgId: 1 },
  { unique: true },
);