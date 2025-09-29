import { CreateBillboardMessageDto, GetAllBillboardMessagesDto } from '../dtos';
import { BillboardMessagesEntity } from '../models';

/**
 * @interface IBillboardMessagesRepository
 * @description Interface for the billboard message repository, defining the contract for data access
 * operations.
 */
export interface IBillboardMessagesRepository {
  /**
   * Create a new billboard message
   */
  create(
    data: Partial<CreateBillboardMessageDto>,
  ): Promise<BillboardMessagesEntity>;

  /**
   * Fetches active billboard messages for the given organization.
   * When organizationId is omitted, all non-deleted messages (including wildcard) are returned.
   */
  findAllForOrganization(
    data: GetAllBillboardMessagesDto,
  ): Promise<BillboardMessagesEntity[]>;

  deleteBillboardMessage(
    billboardMessageId: string,
    audit: { deletedBy: string; deletedAt: Date },
  ): Promise<{
    removed: boolean;
    fullyDeleted: boolean;
    reason?: string;
  }>;
}
