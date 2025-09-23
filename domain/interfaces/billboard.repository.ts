import { BillboardsEntity } from '../models/billboards.entity';

export interface IBillboardRepository {
  /**
   * Create a new billboard message
   */
  create(billboard: Partial<BillboardsEntity>): Promise<BillboardsEntity>;

  /**
   * Find billboards for specific organizations or wildcards
   */
  findForOrganizations(
    organizationIds: string[],
    includeWildcard?: boolean,
  ): Promise<BillboardsEntity[]>;

  /**
   * Find billboard by ID
   */
  findById(id: string): Promise<BillboardsEntity | null>;

  /**
   * Update billboard by ID
   */
  updateById(
    id: string,
    updates: Partial<BillboardsEntity>,
  ): Promise<BillboardsEntity | null>;

  /**
   * Soft delete billboard by ID
   */
  deleteById(id: string, deletedBy: string): Promise<boolean>;

  /**
   * Delete multiple billboards by IDs
   */
  deleteByIds(ids: string[], deletedBy: string): Promise<number>;

  /**
   * Find all active (non-deleted) billboards with pagination
   */
  findAllActive(
    limit?: number,
    offset?: number,
  ): Promise<{ items: BillboardsEntity[]; total: number }>;

  /**
   * Find billboards created by specific admin
   */
  findByCreatedBy(createdBy: string): Promise<BillboardsEntity[]>;

  /**
   * Check if billboard exists and is active
   */
  exists(id: string): Promise<boolean>;
}
