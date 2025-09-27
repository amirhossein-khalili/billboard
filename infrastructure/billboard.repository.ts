import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IBillboardsRepository } from '../domain/interfaces';
import { BillboardsDocument, BillboardsEntity } from '../domain/models';
import { CreateBillboardDto, GetAllBillboardsDto } from '../domain/dtos';

@Injectable()
export class BillboardsRepository implements IBillboardsRepository {
  constructor(
    @InjectModel(BillboardsEntity.name)
    private readonly BillboardModel: Model<BillboardsDocument>,
  ) {}

  /**
   * Creates a new billboard.
   * @param billboard - The billboard data.
   * @returns The created billboard.
   */
  async create(data: CreateBillboardDto): Promise<BillboardsEntity> {
    return new this.BillboardModel({
      ...data,
      _id: uuidv4(),
      createdAt: data.createdAt || new Date(),
      isDeleted: false,
    }).save();
  }

  async findAllForOrganization(
    data: GetAllBillboardsDto,
  ): Promise<BillboardsEntity[]> {
    const { organizationId } = data;

    const filter: FilterQuery<BillboardsDocument> = {
      isDeleted: false,
      ...(organizationId
        ? {
            $or: [{ isWildcard: true }, { organizationIds: organizationId }],
          }
        : {}),
    };

    return this.BillboardModel.find(filter)
      .select({ _id: 1, message: 1, createdAt: 1, updatedAt: 1 })
      .sort({ createdAt: -1 })
      .lean<BillboardsEntity[]>()
      .exec();
  }

  async deleteForOrganization(
    billboardId: string,
    organizationId: string,
    audit: { deletedBy: string; deletedAt: Date },
  ): Promise<{ removed: boolean; fullyDeleted: boolean }> {
    const result = await this.BillboardModel.updateOne(
      {
        _id: billboardId,
        isDeleted: false,
        isWildcard: false,
        organizationIds: organizationId,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: audit.deletedAt,
          deletedBy: audit.deletedBy,
          organizationIds: [],
        },
      },
    ).exec();

    if (result.modifiedCount && result.modifiedCount > 0) {
      return { removed: true, fullyDeleted: true };
    }

    const doc = await this.BillboardModel.findOne({
      _id: billboardId,
      isDeleted: false,
      isWildcard: false,
    }).exec();

    if (!doc || !doc.organizationIds?.includes(organizationId)) {
      return { removed: false, fullyDeleted: false };
    }

    const nextOrgIds = doc.organizationIds.filter(
      (id) => id !== organizationId,
    );

    if (nextOrgIds.length === 0) {
      doc.isDeleted = true;
      doc.deletedAt = audit.deletedAt;
      doc.deletedBy = audit.deletedBy;
      doc.organizationIds = [];
      await doc.save();
      return { removed: true, fullyDeleted: true };
    }

    doc.organizationIds = nextOrgIds;
    doc.markModified('organizationIds');
    await doc.save();

    return { removed: true, fullyDeleted: false };
  }
}
