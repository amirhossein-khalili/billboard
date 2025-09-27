import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import {
  UserBillboardStateDocument,
  UserBillboardStateEntity,
} from '../domain/models';
import { IUserBillboardsStateRepository } from '../domain/interfaces';

/**
 * @class UserBillboardsStateRepository
 * @description Implements the IUserBillboardsStateRepository interface for managing user billboard states in MongoDB.
 */
@Injectable()
export class UserBillboardsStateRepository
implements IUserBillboardsStateRepository {
  constructor(
    @InjectModel(UserBillboardStateEntity.name)
    private readonly model: Model<UserBillboardStateDocument>,
  ) {}

  /**
   * @method dismissForUser
   * @description Marks a billboard as dismissed for a user. If a record already exists, it updates it; otherwise, it creates a new one.
   * @param {string} messageId - The ID of the billboard message.
   * @param {string} userId - The ID of the user.
   * @param {string} orgId - The ID of the organization.
   * @param {Date} [closedAt=new Date()] - The timestamp of when the billboard was dismissed.
   * @returns {Promise<void>}
   */
  async dismissForUser(
    messageId: string,
    userId: string,
    orgId: string,
    closedAt = new Date(),
  ): Promise<void> {
    await this.model.updateOne(
      { messageId, userId, orgId } as FilterQuery<UserBillboardStateDocument>,
      {
        $set: {
          messageId, userId, orgId, closedAt,
        },
      },
      { upsert: true },
    );
  }

  /**
   * @method isDismissed
   * @description Checks if a specific billboard has been dismissed by a user in an organization.
   * @param {string} messageId - The ID of the billboard message.
   * @param {string} userId - The ID of the user.
   * @param {string} orgId - The ID of the organization.
   * @returns {Promise<boolean>} A promise that resolves to true if the billboard is dismissed, otherwise false.
   */
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

  /**
   * @method deleteByMessageId
   * @description Deletes all dismissal states associated with a specific billboard message ID.
   * @param {string} messageId - The ID of the billboard message.
   * @returns {Promise<void>}
   */
  async deleteByMessageId(messageId: string): Promise<void> {
    await this.model.deleteMany({ messageId }).exec();
  }

  /**
   * @method deleteByMessageIdAndOrg
   * @description Deletes all dismissal states for a specific message within a given organization.
   * @param {string} messageId - The ID of the billboard message.
   * @param {string} orgId - The ID of the organization.
   * @returns {Promise<void>}
   */
  async deleteByMessageIdAndOrg(messageId: string, orgId: string): Promise<void> {
    await this.model.deleteMany({ messageId, orgId }).exec();
  }
}
