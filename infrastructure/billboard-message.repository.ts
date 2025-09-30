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
  DeleteBillboardMessageAuditDto,
  DeleteBillboardMessageOutcomeDto,
  GetAllBillboardMessagesDto,
} from '../domain/dtos';
import { BILLBOARD_WILDCARD_ORGANIZATION_ID } from '../domain/constants';

@Injectable()
export class BillboardMessagesRepository
implements IBillboardMessagesRepository {
  constructor(
    @InjectModel(BillboardMessagesEntity.name)
    private readonly BillboardMessageModel: Model<BillboardMessagesDocument>,
  ) {}

  async deleteBillboardMessage(
    billboardMessageId: string,
    audit: DeleteBillboardMessageAuditDto,
  ): Promise<DeleteBillboardMessageOutcomeDto> {
    const billboardMessage = await this.BillboardMessageModel.findOne({
      _id: billboardMessageId,
    }).exec();

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

  async create(
    data: CreateBillboardMessageDto,
  ): Promise<BillboardMessagesEntity> {
    const now = new Date();
    return new this.BillboardMessageModel({
      _id: uuidv4(),
      message: data.message,
      organizationId: data.organizationId ?? BILLBOARD_WILDCARD_ORGANIZATION_ID,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
      isDeleted: false,
    }).save();
  }

  async findAllForOrganization(
    data: GetAllBillboardMessagesDto,
  ): Promise<BillboardMessagesEntity[]> {
    const { organizationId } = data;

    const matchStage: FilterQuery<BillboardMessagesDocument> = {
      isDeleted: false,
    };

    if (organizationId) {
      matchStage.$or = [
        { organizationId },
        { organizationId: BILLBOARD_WILDCARD_ORGANIZATION_ID },
      ];
    }

    return this.BillboardMessageModel.aggregate<BillboardMessagesEntity>([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 1,
          id: '$_id',
          message: 1,
        },
      },
    ]).exec();
  }

  async deleteForOrganization(
    billboardMessageId: string,
    audit: DeleteBillboardMessageAuditDto,
  ): Promise<DeleteBillboardMessageOutcomeDto> {
    const billboardMessage = await this.BillboardMessageModel.findOne({
      _id: billboardMessageId,
      isDeleted: false,
    }).exec();

    if (!billboardMessage) {
      return {
        removed: false,
        fullyDeleted: false,
        reason: 'Billboard message not found or already deleted',
      };
    }

    billboardMessage.isDeleted = true;
    billboardMessage.deletedAt = audit.deletedAt;
    billboardMessage.deletedBy = audit.deletedBy;
    await billboardMessage.save();

    return { removed: true, fullyDeleted: true };
  }
}
