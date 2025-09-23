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

  /**
   * Creates a new billboard.
   * @param billboard - The billboard data.
   * @returns The created billboard.
   */
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

  /**
   * Finds billboards for a list of organizations.
   * @param organizationIds - The list of organization IDs.
   * @param includeWildcard - Whether to include wildcard billboards.
   * @returns A list of billboards.
   */
  async findForOrganizations(
    organizationIds: string[],
    includeWildcard = true,
  ): Promise<BillboardsEntity[]> {
    const query: any = {
      isDeleted: false,
      $or: [],
    };

    if (organizationIds.length > 0) {
      query.$or.push({
        isWildcard: false,
        organizationIds: { $in: organizationIds },
      });
    }

    if (includeWildcard) {
      query.$or.push({
        isWildcard: true,
      });
    }

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

  /**
   * Finds a billboard by its ID.
   * @param id - The billboard ID.
   * @returns The billboard, or null if not found.
   */
  async findById(id: string): Promise<BillboardsEntity | null> {
    const billboard = await this.billboardModel
      .findOne({ _id: id, isDeleted: false })
      .lean()
      .exec();

    return billboard;
  }

  /**
   * Updates a billboard by its ID.
   * @param id - The billboard ID.
   * @param updates - The updates to apply.
   * @returns The updated billboard, or null if not found.
   */
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

  /**
   * Deletes a billboard by its ID (soft delete).
   * @param id - The billboard ID.
   * @param deletedBy - The ID of the user who deleted the billboard.
   * @returns True if the billboard was deleted, false otherwise.
   */
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

  /**
   * Deletes multiple billboards by their IDs (soft delete).
   * @param ids - The billboard IDs.
   * @param deletedBy - The ID of the user who deleted the billboards.
   * @returns The number of deleted billboards.
   */
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

  /**
   * Finds all active billboards with pagination.
   * @param limit - The number of items to return.
   * @param offset - The number of items to skip.
   * @returns A list of billboards and the total count.
   */
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

  /**
   * Finds all billboards created by a specific user.
   * @param createdBy - The ID of the user.
   * @returns A list of billboards.
   */
  async findByCreatedBy(createdBy: string): Promise<BillboardsEntity[]> {
    const billboards = await this.billboardModel
      .find({ createdBy, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return billboards;
  }

  /**
   * Checks if a billboard exists.
   * @param id - The billboard ID.
   * @returns True if the billboard exists, false otherwise.
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.billboardModel
      .countDocuments({ _id: id, isDeleted: false })
      .exec();

    return count > 0;
  }

  /**
   * Generates a new ID for a billboard.
   * @returns A new billboard ID.
   */
  private generateId(): string {
    return `billboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
