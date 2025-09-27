import { CreateBillboardDto, GetAllBillboardsDto } from '../dtos';
import { BillboardsEntity } from '../models';

export interface IBillboardsRepository {
  /**
   * Create a new billboard message
   */
  create(data: Partial<CreateBillboardDto>): Promise<BillboardsEntity>;

  /**
   * Fetches active billboard messages for the given organization.
   * When organizationId is omitted, all non-deleted messages (including wildcard) are returned.
   */
  findAllForOrganization(
    data: GetAllBillboardsDto,
  ): Promise<BillboardsEntity[]>;

  deleteForOrganization(
    billboardId: string,
    organizationId: string,
    audit: { deletedBy: string; deletedAt: Date },
  ): Promise<{ removed: boolean; fullyDeleted: boolean }>;
}
