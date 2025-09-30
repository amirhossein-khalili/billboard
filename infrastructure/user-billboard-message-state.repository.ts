import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import {
  UserBillboardMessageStateDocument,
  UserBillboardMessagesStateEntity,
} from '../domain/models';
import { IUserBillboardMessagesStateRepository } from '../domain/interfaces';

@Injectable()
export class UserBillboardMessageStateRepository
  implements IUserBillboardMessagesStateRepository
{
  constructor(
    @InjectModel(UserBillboardMessagesStateEntity.name)
    private readonly model: Model<UserBillboardMessageStateDocument>,
  ) {}

  async dismissForUser(
    messageId: string,
    userId: string,
    orgId: string,
    closedAt = new Date(),
  ): Promise<void> {
    await this.model.updateOne(
      {
        messageId,
        userId,
        orgId,
      } as FilterQuery<UserBillboardMessageStateDocument>,
      {
        $set: {
          messageId,
          userId,
          orgId,
          closedAt,
        },
      },
      { upsert: true },
    );
  }

  async isDismissed(
    messageId: string,
    userId: string,
    orgId: string,
  ): Promise<boolean> {
    const count = await this.model
      .countDocuments({ messageId, userId, orgId })
      .exec();
    return count > 0;
  }

  async deleteByMessageId(messageId: string): Promise<void> {
    await this.model.deleteMany({ messageId }).exec();
  }

  async deleteByMessageIdAndOrg(
    messageId: string,
    orgId: string,
  ): Promise<void> {
    await this.model.deleteMany({ messageId, orgId }).exec();
  }
}