// application/billboards.service.ts
import { Injectable, Logger, ForbiddenException, Inject } from '@nestjs/common';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  IMetadata,
  IQueryResult,
  ICommandResult,
} from 'com.chargoon.cloud.svc.common/dist/interfaces';
import { BaseService } from 'com.chargoon.cloud.svc.common/dist/base-service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { GetBillboardsDto, ImportBillboardsDto } from '../domain/dtos';
import { parseBillboardsXlsxFromBuffer } from './utils/read-data-xlsx.utils';
import { FailureCatch } from 'com.chargoon.cloud.svc.common/dist/utils';
import { IBillboardRepository } from '../domain/interfaces';
import { domainInfo } from 'src/organizations/utils';
import { isAwatAdmin } from './utils/is-awat-admin.util';

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
    private readonly httpService: HttpService,
    @Inject('IBillboardRepository')
    private readonly billboardRepo: IBillboardRepository,
  ) {
    super(amqpConnection);
    this.documentsUrl =
      this.configService.get<string>('DOCUMENTS_SERVICE_URL') ||
      this.configService.get<string>('DOCUMENTS_URL') ||
      '';
  }

  // Only the last message (by createdAt desc) among org-specific + wildcard is returned
  async getBillboards(
    data: GetBillboardsDto,
    meta: IMetadata,
  ): Promise<IQueryResult> {
    const { organizationId } = data;
    this.logger.verbose(`getBillboards: org=${organizationId}`);

    const items = await this.billboardRepo.findForOrganizations(
      [organizationId],
      true,
    );
    const latest = items[0] ?? null;

    const dto = latest
      ? {
          id: latest._id,
          organizationId,
          message: latest.message,
          createdAt: latest.createdAt,
          isWildcard: latest.isWildcard,
        }
      : null;

    return {
      status: true,
      data: dto,
      meta,
    };
  }

  // Entry (RPC) – follows your contacts import structure
  @FailureCatch({
    domain: domainInfo().domain,
    service: domainInfo().service,
  })
  async startImportBillboards(
    data: ImportBillboardsDto,
    meta: IMetadata,
  ): Promise<ICommandResult<ImportBillboardsDto>> {
    this.logger.verbose(
      `BillboardsService:startImportBillboards: document ${data.document.id}`,
    );
    if (!isAwatAdmin(meta)) {
      throw new ForbiddenException(
        `BillboardsService:startImportBillboards: forbidden! user id: ${meta.user?.id}`,
      );
    }
    // fire-and-forget import work (same as your contacts module)
    this.importBillboards(data, meta).catch((e) =>
      this.logger.error(`importBillboards failed: ${e?.message || e}`),
    );
    return { success: true, data, meta };
  }

  // Actual import worker: downloads XLSX, parses, creates billboard messages
  async importBillboards(
    data: ImportBillboardsDto,
    meta: IMetadata,
  ): Promise<ICommandResult<ImportBillboardsDto>> {
    const lockKey = `import_billboard_job_queue_lock_${data.document.id}`;
    const lockResult = await this.jobQueue.makeRedisLock(
      lockKey,
      new Date().toISOString(),
    );

    if (!lockResult?.success) {
      this.logger.warn(
        `BillboardsService:importBillboards: lock not acquired for document ${data.document.id}`,
      );
      return { success: false, data, meta };
    }

    let documentFile: any;
    let buffer: Buffer;

    try {
      documentFile = await lastValueFrom(
        this.httpService.get(`${this.documentsUrl}/${data.document.id}`, {
          responseType: 'arraybuffer',
          headers: {
            'X-Metadata': JSON.stringify(createPermissionLessMeta(meta)),
          },
          params: {
            // Align with your ecosystem; adjust if your Documents svc expects a specific domain
            domain: domainInfo().domain,
          },
        }),
      );
      // Nest Axios gives Buffer data when responseType is 'arraybuffer'
      buffer = Buffer.from(documentFile?.data);
    } catch (err: any) {
      this.logger.warn(err);
      throw new DocumentsDataException(
        `failed to download and parse document, err msg: ${err?.message}`,
      );
    }

    let parsed: ReturnType<typeof parseBillboardsXlsxFromBuffer> | null = null;
    try {
      parsed = parseBillboardsXlsxFromBuffer(buffer);
    } catch (err: any) {
      this.logger.warn(err);
      throw new ParseXlsxDataException(
        `failed to parse xlsx document, err msg: ${err?.message}`,
      );
    }

    if (!parsed.rows.length && parsed.errors.length) {
      this.logger.warn(
        `BillboardsService:importBillboards: header/row validation failed -> ${parsed.errors.join(
          '; ',
        )}`,
      );
      return { success: false, data, meta };
    }

    const adminId = meta?.user?.id || meta?.user?._id || 'system';
    const createdIds: string[] = [];
    const rowErrors: string[] = [];

    for (const r of parsed.rows) {
      try {
        const created = await this.billboardRepo.create({
          message: r.message,
          isWildcard: r.isWildcard,
          organizationIds: r.isWildcard ? [] : r.organizationIds,
          createdBy: adminId,
          createdAt: new Date(),
        });
        createdIds.push(created._id);
      } catch (e: any) {
        const msg = `Row ${r.rowNumber}: create failed (${e?.message || 'unknown error'})`;
        rowErrors.push(msg);
        this.logger.warn(`BillboardsService:importBillboards: ${msg}`);
      }
    }

    this.logger.log(
      `BillboardsService:importBillboards: created=${createdIds.length}, errors=${rowErrors.length}`,
    );

    return { success: true, data, meta };
  }
}
