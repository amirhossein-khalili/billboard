import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IBillboardRepository } from '../domain/interfaces/billboard.repository';
import {
  BillboardsDocument,
  BillboardsEntity,
} from '../domain/models/billboards.entity';

@Injectable()
export class BillboardRepository implements IBillboardRepository {
  constructor(
    @InjectModel(BillboardsEntity.name)
    private readonly billboardModel: Model<BillboardsDocument>,
  ) {}

  async create(
    billboard: Partial<BillboardsEntity>,
  ): Promise<BillboardsEntity> {
    const createdBillboard = new this.billboardModel({
      ...billboard,
      _id: billboard._id || this.generateId(),
      createdAt: billboard.createdAt || new Date(),
      isDeleted: false,
    });

    const saved = await createdBillboard.save();
    return saved.toObject();
  }

  async findForOrganizations(
    organizationIds: string[],
    includeWildcard = true,
  ): Promise<BillboardsEntity[]> {
    const query: any = {
      isDeleted: false,
      $or: [],
    };

    // Include organization-specific billboards
    if (organizationIds.length > 0) {
      query.$or.push({
        isWildcard: false,
        organizationIds: { $in: organizationIds },
      });
    }

    // Include wildcard billboards if requested
    if (includeWildcard) {
      query.$or.push({
        isWildcard: true,
      });
    }

    // If no conditions, return empty array
    if (query.$or.length === 0) {
      return [];
    }

    const billboards = await this.billboardModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return billboards;
  }

  async findById(id: string): Promise<BillboardsEntity | null> {
    const billboard = await this.billboardModel
      .findOne({ _id: id, isDeleted: false })
      .lean()
      .exec();

    return billboard;
  }

  async updateById(
    id: string,
    updates: Partial<BillboardsEntity>,
  ): Promise<BillboardsEntity | null> {
    const updated = await this.billboardModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: updates },
        { new: true, lean: true },
      )
      .exec();

    return updated;
  }

  async deleteById(id: string, deletedBy: string): Promise<boolean> {
    const result = await this.billboardModel
      .updateOne(
        { _id: id, isDeleted: false },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy,
          },
        },
      )
      .exec();

    return result.matchedCount > 0;
  }

  async deleteByIds(ids: string[], deletedBy: string): Promise<number> {
    const result = await this.billboardModel
      .updateMany(
        { _id: { $in: ids }, isDeleted: false },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy,
          },
        },
      )
      .exec();

    return result.matchedCount;
  }

  async findAllActive(
    limit = 50,
    offset = 0,
  ): Promise<{ items: BillboardsEntity[]; total: number }> {
    const [items, total] = await Promise.all([
      this.billboardModel
        .find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean()
        .exec(),
      this.billboardModel.countDocuments({ isDeleted: false }).exec(),
    ]);

    return { items, total };
  }

  async findByCreatedBy(createdBy: string): Promise<BillboardsEntity[]> {
    const billboards = await this.billboardModel
      .find({ createdBy, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return billboards;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.billboardModel
      .countDocuments({ _id: id, isDeleted: false })
      .exec();

    return count > 0;
  }

  private generateId(): string {
    return `billboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
