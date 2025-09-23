// application/billboards.service.ts
import { Injectable, Logger, Inject } from "@nestjs/common";
import { CommandBus, EventBus, QueryBus } from "@nestjs/cqrs";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import {
  IMetadata,
  IQueryResult,
} from "com.chargoon.cloud.svc.common/dist/interfaces";
import { BaseService } from "com.chargoon.cloud.svc.common/dist/base-service";
import { ConfigService } from "@nestjs/config";
import { GetBillboardsDto } from "../domain/dtos";
import {
  IBillboardRepository,
  IUserBillboardStateRepository,
} from "../domain/interfaces";
import { parseBillboardsXlsx } from "./utils/read-data-xlsx.utils";

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
    @Inject("IBillboardRepository")
    private readonly billboardRepo: IBillboardRepository,
    @Inject("IUserBillboardStateRepository")
    private readonly userStateRepo: IUserBillboardStateRepository
  ) {
    super(amqpConnection);
  }

  private getUserId(meta?: IMetadata): string | null {
    const anyMeta: any = meta || {};
    return anyMeta?.user?.id || anyMeta?.user?._id || anyMeta?.userId || null;
  }

  private getAdminId(meta?: IMetadata): string {
    return this.getUserId(meta) ?? "system";
  }

  // Returns only the last message for the org (wildcard included).
  // If the user has dismissed that last message, returns null (empty state).
  async getBillboards(
    data: GetBillboardsDto,
    meta: IMetadata
  ): Promise<IQueryResult> {
    const { organizationId } = data;
    const userId = this.getUserId(meta);

    this.logger.verbose(
      `getBillboards: org=${organizationId}, user=${userId ?? "anonymous"}`
    );

    const items = await this.billboardRepo.findForOrganizations(
      [organizationId],
      true
    );

    // items are sorted desc by createdAt in repo
    const latest = items[0] ?? null;

    if (latest && userId) {
      const dismissed = await this.userStateRepo.isDismissed(
        latest._id,
        userId,
        organizationId
      );
      if (dismissed) {
        return {
          status: true,
          data: null, // empty state for this user
          meta: {} as IMetadata,
        };
      }
    }

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
      meta: {} as IMetadata,
    };
  }

  // Import billboards from Excel
  async importFromExcel(
    fileBuffer: Buffer,
    meta: IMetadata
  ): Promise<IQueryResult> {
    const adminId = this.getAdminId(meta);
    const { rows, errors } = parseBillboardsXlsx(fileBuffer);

    if (!rows.length && errors.length) {
      return {
        status: false,
        data: { createdCount: 0, createdIds: [], errors },
        meta: {} as IMetadata,
      };
    }

    const createdIds: string[] = [];
    for (const r of rows) {
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
        errors.push(
          `Row ${r.rowNumber}: Failed to create message (${
            e?.message || "unknown error"
          })`
        );
      }
    }

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

  // Admin delete (soft)
  async deleteBillboard(id: string, meta: IMetadata): Promise<IQueryResult> {
    const adminId = this.getAdminId(meta);
    const ok = await this.billboardRepo.deleteById(id, adminId);
    if (ok) {
      // Cleanup user dismissals for the deleted message
      await this.userStateRepo.deleteByMessageId(id);
    }
    return {
      status: ok,
      data: { id, deleted: ok },
      meta: {} as IMetadata,
    };
  }

  // User dismiss (close) the latest message (by id)
  async dismissBillboard(
    orgId: string,
    messageId: string,
    meta: IMetadata
  ): Promise<IQueryResult> {
    const userId = this.getUserId(meta);
    if (!userId) {
      return {
        status: false,
        data: { message: "Unauthorized: cannot determine user" },
        meta: {} as IMetadata,
      };
    }
    // Ensure message exists and is active
    const exists = await this.billboardRepo.exists(messageId);
    if (!exists) {
      return {
        status: false,
        data: { message: "Message not found or deleted" },
        meta: {} as IMetadata,
      };
    }
    await this.userStateRepo.dismissForUser(
      messageId,
      userId,
      orgId,
      new Date()
    );
    return {
      status: true,
      data: { dismissed: true, messageId, orgId },
      meta: {} as IMetadata,
    };
  }
}
