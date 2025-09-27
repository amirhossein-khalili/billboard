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

  private static getUserId(meta?: IMetadata): string | null {
    const anyMeta: any = meta || {};
    return anyMeta?.user?.id || anyMeta?.user?._id || anyMeta?.userId || null;
  }

  private static getAdminId(meta?: IMetadata): string {
    return BillboardsService.getUserId(meta) ?? 'system';
  }

  async getBillboards(
    data: GetAllBillboardsDto,
    meta: IMetadata,
  ): Promise<GetBillboardsResponseDto> {
    this.logger.verbose(`getBillboards: org=${data.organizationId}}`);

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
   * Import billboards from Excel
   * @param fileBuffer - The buffer of the Excel file.
   * @param meta - The metadata.
   * @returns The result of the import operation.
   */
  async importFromExcel(
    fileBuffer: Buffer,
    meta: IMetadata,
  ): Promise<IQueryResult> {
    const adminId = BillboardsService.getAdminId(meta);
    const { rows, errors } = this.billboardsXlsxParser.parse(fileBuffer);

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

    const commandResults = await Promise.allSettled(commandPromises);

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
