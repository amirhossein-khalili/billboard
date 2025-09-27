import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  IMetadata,
  BaseService,
  IQueryResult,
  findOrganizationByPosition,
} from 'com.chargoon.cloud.svc.common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBillboardDto,
  DeleteOrganizationBillboardDto,
  GetAllBillboardsDto,
  GetBillboardsResponseDto,
} from '../domain/dtos';
import { BillboardsXlsxParser } from './utils';
import {
  CreateBillboardCommand,
  DeleteOrganizationBillboardCommand,
} from './commands/impls';
import { GetAllBillboards } from './queries/impl';

/**
 * @class BillboardsService
 * @description This service handles the business logic for billboards. It extends a BaseService and uses CQRS for handling commands and queries.
 */
@Injectable()
export class BillboardsService extends BaseService {
  public readonly logger = new Logger(BillboardsService.name);

  protected readonly documentsUrl: string;

  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly queryBus: QueryBus,
    protected readonly amqpConnection: AmqpConnection,
    protected readonly eventBus: EventBus,
    protected readonly configService: ConfigService,
    private readonly billboardsXlsxParser: BillboardsXlsxParser,
  ) {
    super(amqpConnection);
  }

  /**
   * @method getUserId
   * @description Extracts the user ID from the metadata.
   * @param {IMetadata} [meta] - The metadata object.
   * @returns {string | null} The user ID or null if not found.
   */
  private static getUserId(meta?: IMetadata): string | null {
    const anyMeta: any = meta || {};
    return anyMeta?.user?.id || anyMeta?.user?._id || anyMeta?.userId || null;
  }

  /**
   * @method getAdminId
   * @description Gets the admin ID from the metadata, defaulting to 'system'.
   * @param {IMetadata} [meta] - The metadata object.
   * @returns {string} The admin ID.
   */
  private static getAdminId(meta?: IMetadata): string {
    return BillboardsService.getUserId(meta) ?? 'system';
  }

  /**
   * @method getBillboards
   * @description Retrieves billboards for a specific organization.
   * @param {GetAllBillboardsDto} data - The DTO for getting all billboards.
   * @param {IMetadata} meta - The metadata.
   * @returns {Promise<GetBillboardsResponseDto>} A promise that resolves to the billboards response.
   * @throws {ForbiddenException} If the requester does not belong to any organization.
   */
  async getBillboards(
    data: GetAllBillboardsDto,
    meta: IMetadata,
  ): Promise<GetBillboardsResponseDto> {
    this.logger.verbose(`getBillboards: org=${data.organizationId}}`);

    // Find the organization based on the requester's position.
    const organization = findOrganizationByPosition(
      meta.requester.position,
      meta,
    );
    if (!organization) {
      throw new ForbiddenException(
        `requester with positionId ${meta.requester.position.id}
         doesn't exist in any organizations`,
      );
    }

    const organizationId = organization.id;

    // Execute the GetAllBillboards query.
    const result = await this.queryBus.execute(
      new GetAllBillboards(
        {
          ...data,
          organizationId,
        },
        {
          ...meta,
        },
      ),
    );

    return {
      status: true,
      data: result,
      meta: meta as IMetadata,
    };
  }

  /**
   * @method importFromExcel
   * @description Imports billboards from an Excel file.
   * @param {Buffer} fileBuffer - The buffer of the Excel file.
   * @param {IMetadata} meta - The metadata.
   * @returns {Promise<IQueryResult>} The result of the import operation.
   */
  async importFromExcel(
    fileBuffer: Buffer,
    meta: IMetadata,
  ): Promise<IQueryResult> {
    const adminId = BillboardsService.getAdminId(meta);
    const { rows, errors } = this.billboardsXlsxParser.parse(fileBuffer);

    // If there are no rows and only errors, return immediately.
    if (!rows.length && errors.length) {
      return {
        status: false,
        data: { createdCount: 0, createdIds: [], errors },
        meta: {} as IMetadata,
      };
    }

    const createdIds: string[] = [];
    const createPromises = rows.map(async (r) => {
      try {
        const data: CreateBillboardDto = {
          message: r.message,
          isWildcard: r.isWildcard,
          organizationIds: r.isWildcard ? [] : r.organizationIds,
          createdBy: adminId,
          createdAt: new Date(),
        };
        const created = await this.commandBus.execute(
          new CreateBillboardCommand(data, meta),
        );
        return created._id;
      } catch (e: any) {
        errors.push(
          `Row ${r.rowNumber}: Failed to create message (${e?.message ?? 'unknown error'})`,
        );
        return null; // indicate failure
      }
    });

    // Wait for all create promises to settle.
    const results = await Promise.allSettled(createPromises);
    createdIds.push(
      ...results
        .filter(
          (result): result is PromiseFulfilledResult<string> =>
            result.status === 'fulfilled',
        )
        .map((result) => result.value)
        .filter(Boolean),
    );

    return {
      status: true,
      data: {
        createdCount: createdIds.length,
        createdIds,
        errors,
      },
      meta: {} as IMetadata,
    };
  }

  /**
   * @method deleteOrganizationBillboards
   * @description Deletes billboards for specific organizations in bulk.
   * @param {any} rawItems - The raw items to be deleted.
   * @param {IMetadata} meta - The metadata.
   * @returns {Promise<any>} A promise that resolves to the bulk delete outcome.
   */
  async deleteOrganizationBillboards(
    rawItems: any,
    meta: IMetadata,
  ): Promise<{
    status: boolean;
    data: {
      successes: {
        organizationId: string;
        billboardId: string;
        fullyDeleted: boolean;
      }[];
      failures: {
        organizationId?: string;
        billboardId?: string;
        reason: string;
      }[];
    };
    meta: IMetadata;
  }> {
    const adminId = BillboardsService.getAdminId(meta);
    const deletedAt = new Date();
    const items: any[] = Array.isArray(rawItems) ? rawItems : [];

    const successes: {
      organizationId: string;
      billboardId: string;
      fullyDeleted: boolean;
    }[] = [];
    const failures: {
      organizationId?: string;
      billboardId?: string;
      reason: string;
    }[] = [];

    // Normalize the input items to a consistent format.
    const normalizedItems: DeleteOrganizationBillboardDto[] = items
      .map((item, index) => {
        const organizationId =
          item?.organizationId ??
          item?.orgnizationId ??
          item?.orgnizationid ??
          item?.orgId;
        const billboardId = item?.billboardId ?? item?._id ?? item?.id;

        if (!organizationId || !billboardId) {
          failures.push({
            reason: `invalid_payload_at_index_${index}`,
          });
          return null;
        }

        return {
          organizationId: String(organizationId).trim(),
          billboardId: String(billboardId).trim(),
        };
      })
      .filter(Boolean) as DeleteOrganizationBillboardDto[];

    // Create command promises for each item to be deleted.
    const commandPromises = normalizedItems.map((item) =>
      this.commandBus.execute(
        new DeleteOrganizationBillboardCommand(
          {
            organizationId: item.organizationId,
            billboardId: item.billboardId,
            deletedBy: adminId,
            deletedAt,
          },
          meta,
        ),
      ),
    );

    // Wait for all delete commands to settle.
    const commandResults = await Promise.allSettled(commandPromises);

    // Process the results of the delete commands.
    commandResults.forEach((result, idx) => {
      const item = normalizedItems[idx];

      if (result.status === 'fulfilled') {
        if (result.value.removed) {
          successes.push({
            organizationId: item.organizationId,
            billboardId: item.billboardId,
            fullyDeleted: result.value.fullyDeleted,
          });
        } else {
          failures.push({
            organizationId: item.organizationId,
            billboardId: item.billboardId,
            reason: result.value.reason ?? 'not_removed',
          });
        }
      } else {
        failures.push({
          organizationId: item.organizationId,
          billboardId: item.billboardId,
          reason: result.reason?.message ?? 'execution_error',
        });
      }
    });

    return {
      status: failures.length === 0,
      data: {
        successes,
        failures,
      },
      meta: meta as IMetadata,
    };
  }
}
