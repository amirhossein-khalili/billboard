import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import {
  UserBillboardStateDocument,
  UserBillboardStateEntity,
} from '../domain/models/user-billboard-state.entity';
import { IUserBillboardStateRepository } from '../domain/interfaces/user-billboard-state.repository';

@Injectable()
export class UserBillboardStateRepository
  implements IUserBillboardStateRepository
{
  constructor(
    @InjectModel(UserBillboardStateEntity.name)
    private readonly model: Model<UserBillboardStateDocument>,
  ) {}

  async dismissForUser(
    messageId: string,
    userId: string,
    orgId: string,
    closedAt = new Date(),
  ): Promise<void> {
    await this.model.updateOne(
      { messageId, userId, orgId } as FilterQuery<UserBillboardStateDocument>,
      { $set: { messageId, userId, orgId, closedAt } },
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
}
 