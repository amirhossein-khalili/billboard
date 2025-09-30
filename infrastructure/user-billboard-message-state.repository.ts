import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import {
  UserBillboardMessageStateDocument,
  UserBillboardMessagesStateEntity,
} from '../domain/models';
import { IUserBillboardMessagesStateRepository } from '../domain/interfaces';

/**
 * @class UserBillboardMessageStateRepository
 * @description Implements the IUserBillboardMessagesStateRepository interface for managing
 * user billboard message states in MongoDB.
 */
@Injectable()
export class UserBillboardMessageStateRepository
  implements IUserBillboardMessagesStateRepository
{
  constructor(
    @InjectModel(UserBillboardMessagesStateEntity.name)
    private readonly model: Model<UserBillboardMessageStateDocument>,
  ) {}

  /**
   * @method dismissForUser
   * @description Marks a billboard message as dismissed for a user. If a record already exists,
   *              it updates it; otherwise, it creates a new one.
   * @param {string} messageId - The ID of the billboard message.
   * @param {string} userId - The ID of the user.
   * @param {string} orgId - The ID of the organization (use '*' for global).
   * @param {Date} [closedAt=new Date()] - When the message was dismissed.
   * @returns {Promise<void>}
   */
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

  /**
   * @method isDismissed
   * @description Checks if a specific billboard message has been dismissed by a user in an organization.
   * @param {string} messageId - The ID of the billboard message.
   * @param {string} userId - The ID of the user.
   * @param {string} orgId - The ID of the organization (use '*' for global).
   * @returns {Promise<boolean>} Whether the message is dismissed.
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
  async deleteByMessageIdAndOrg(
    messageId: string,
    orgId: string,
  ): Promise<void> {
    await this.model.deleteMany({ messageId, orgId }).exec();
  }
}
