import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IBillboardMessagesRepository } from '../domain/interfaces';
import {
  BillboardMessagesEntity,
  BillboardMessagesDocument,
} from '../domain/models';
import {
  CreateBillboardMessageDto,
  GetAllBillboardMessagesDto,
} from '../domain/dtos';

/**
 * @class BillboardMessagesRepository
 * @description Implements the IBillboardMessagesRepository interface for interacting with the
 * billboard_messages collection in MongoDB.
 */
@Injectable()
export class BillboardMessagesRepository
implements IBillboardMessagesRepository {
  constructor(
    @InjectModel(BillboardMessagesEntity.name)
    private readonly BillboardMessageModel: Model<BillboardMessagesDocument>,
  ) {}

  async deleteBillboardMessage(
    billboardMessageId: string,
    audit: { deletedBy: string; deletedAt: Date },
  ): Promise<{ removed: boolean; fullyDeleted: boolean; reason?: string }> {
    const billboardMessage = await this.BillboardMessageModel
      .findOne({ _id: billboardMessageId })
      .exec();

    if (!billboardMessage) {
      return {
        removed: false,
        fullyDeleted: false,
        reason: 'Billboard message not found',
      };
    }

    if (billboardMessage.isDeleted) {
      return {
        removed: false,
        fullyDeleted: false,
        reason: 'Billboard message already deleted',
      };
    }

    billboardMessage.isDeleted = true;
    billboardMessage.deletedAt = audit.deletedAt;
    billboardMessage.deletedBy = audit.deletedBy;
    await billboardMessage.save();

    return { removed: true, fullyDeleted: true };
  }

  /**
   * @method create
   * @description Creates a new billboard message document in the database.
   *              Each Excel row should map to a single call to this method.
   * @param {CreateBillboardMessageDto} data - The data for creating the new message.
   * @returns {Promise<BillboardMessagesEntity>} Newly persisted billboard message entity.
   */
  async create(
    data: CreateBillboardMessageDto,
  ): Promise<BillboardMessagesEntity> {
    const now = new Date();
    return new this.BillboardMessageModel({
      _id: uuidv4(),
      message: data.message,
      organizationId: data.organizationId ?? '*',
      createdAt: data.createdAt ?? now,
      updatedAt: now,
      isDeleted: false,
    }).save();
  }

  /**
   * @method findAllForOrganization
   * @description Finds all active billboard messages for a given organization,
   *              including records whose organizationId is '*'.
   * @param {GetAllBillboardMessagesDto} data - The DTO containing the organization ID.
   * @returns {Promise<BillboardMessagesEntity[]>} Matching billboard message entities.
   */
  async findAllForOrganization(
    data: GetAllBillboardMessagesDto,
  ): Promise<BillboardMessagesEntity[]> {
    const { organizationId } = data;

    const matchStage: FilterQuery<BillboardMessagesDocument> = {
      isDeleted: false,
    };

    if (organizationId) {
      matchStage.$or = [{ organizationId }, { organizationId: '*' }];
    }

    return this.BillboardMessageModel
      .aggregate<BillboardMessagesEntity>([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1,
          id: '$_id',
          message: 1,
        },
      },
    ])
      .exec();
  }

  /**
   * @method deleteForOrganization
   * @description Soft-deletes a billboard message. Deletes only when the stored
   *              organizationId matches the requested organizationId (including '*').
   * @param {string} billboardMessageId - The ID of the billboard message to delete.
   * @param {string} organizationId - The organization scope of the deletion.
   * @param {{ deletedBy: string; deletedAt: Date }} audit - Auditing information.
   * @returns {Promise<{ removed: boolean; fullyDeleted: boolean }>} Outcome summary.
   */
  async deleteForOrganization(
    billboardMessageId: string,
    audit: { deletedBy: string; deletedAt: Date },
  ): Promise<{ removed: boolean; fullyDeleted: boolean }> {
    const billboardMessage = await this.BillboardMessageModel
      .findOne({ _id: billboardMessageId, isDeleted: false })
      .exec();

    if (!billboardMessage) {
      return { removed: false, fullyDeleted: false };
    }

    billboardMessage.isDeleted = true;
    billboardMessage.deletedAt = audit.deletedAt;
    billboardMessage.deletedBy = audit.deletedBy;
    await billboardMessage.save();

    return { removed: true, fullyDeleted: true };
  }
}
