import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IBillboardsRepository } from '../domain/interfaces';
import { BillboardsDocument, BillboardsEntity } from '../domain/models';
import { CreateBillboardDto, GetAllBillboardsDto } from '../domain/dtos';

/**
 * @class BillboardsRepository
 * @description Implements the IBillboardsRepository interface for interacting with the billboards collection in MongoDB.
 */
@Injectable()
export class BillboardsRepository implements IBillboardsRepository {
  constructor(
    @InjectModel(BillboardsEntity.name)
    private readonly BillboardModel: Model<BillboardsDocument>,
  ) {}

  /**
   * @method create
   * @description Creates a new billboard document in the database.
   * @param {CreateBillboardDto} data - The data for creating the new billboard.
   * @returns {Promise<BillboardsEntity>} A promise that resolves to the newly created billboard entity.
   */
  async create(data: CreateBillboardDto): Promise<BillboardsEntity> {
    return new this.BillboardModel({
      ...data,
      _id: uuidv4(),
      createdAt: data.createdAt || new Date(),
      isDeleted: false,
    }).save();
  }

  /**
   * @method findAllForOrganization
   * @description Finds all active billboards for a given organization, including wildcard billboards.
   * @param {GetAllBillboardsDto} data - The DTO containing the organization ID.
   * @returns {Promise<BillboardsEntity[]>} A promise that resolves to an array of billboard entities.
   */
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

  /**
   * @method deleteForOrganization
   * @description Deletes a billboard for a specific organization.
   * If the billboard is associated with multiple organizations, it only removes the specified organization ID.
   * If it's the last organization, the billboard is soft-deleted.
   * @param {string} billboardId - The ID of the billboard to delete.
   * @param {string} organizationId - The ID of the organization to remove the billboard from.
   * @param {{ deletedBy: string; deletedAt: Date }} audit - Auditing information for the deletion.
   * @returns {Promise<{ removed: boolean; fullyDeleted: boolean }>} A promise that resolves to an object indicating if the billboard was removed and if it was fully deleted.
   */
  async deleteForOrganization(
    billboardId: string,
    organizationId: string,
    audit: { deletedBy: string; deletedAt: Date },
  ): Promise<{ removed: boolean; fullyDeleted: boolean }> {
    // Attempt to delete by updating the document directly if it's the only organization
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

    // If the above update failed, it might be part of a list of organizations.
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

    // If removing this orgId leaves the array empty, soft-delete the billboard.
    if (nextOrgIds.length === 0) {
      doc.isDeleted = true;
      doc.deletedAt = audit.deletedAt;
      doc.deletedBy = audit.deletedBy;
      doc.organizationIds = [];
      await doc.save();
      return { removed: true, fullyDeleted: true };
    }

    // Otherwise, just remove the orgId from the list.
    doc.organizationIds = nextOrgIds;
    doc.markModified('organizationIds');
    await doc.save();

    return { removed: true, fullyDeleted: false };
  }
}
