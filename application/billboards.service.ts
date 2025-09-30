import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  IMetadata,
  BaseService,
  ICommandResult,
} from 'com.chargoon.cloud.svc.common';
import {
  CreateBillboardMessageDto,
  DeleteBillboardMessageDto,
  GetAllBillboardMessagesDto,
  GetBillboardMessagesResponseDto,
  DeleteBillboardMessagePayloadDto,
} from '../domain/dtos';
import { BillboardMessagesXlsxParser } from './utils';
import {
  CreateBillboardMessageCommand,
  DeleteBillboardMessageCommand,
} from './commands/impls';
import { GetAllBillboardMessages } from './queries/impl';
import { IImportResult } from '../domain/interfaces';

@Injectable()
export class BillboardsService extends BaseService {
  public readonly logger = new Logger(BillboardsService.name);

  constructor(
    protected readonly commandBus: CommandBus,
    protected readonly queryBus: QueryBus,
    protected readonly amqpConnection: AmqpConnection,
    private readonly billboardMessagesXlsxParser: BillboardMessagesXlsxParser,
  ) {
    super(amqpConnection);
  }

  async getBillboardMessages(
    data: GetAllBillboardMessagesDto,
    meta: IMetadata,
  ): Promise<GetBillboardMessagesResponseDto> {
    const result = await this.queryBus.execute(
      new GetAllBillboardMessages(data, meta),
    );
    return {
      status: true,
      data: result,
      meta: meta as IMetadata,
    };
  }

  async importMessagesFromExcel(
    fileBuffer: Buffer,
    meta: IMetadata,
  ): Promise<ICommandResult<IImportResult>> {
    const { rows, errors } = this.billboardMessagesXlsxParser.parse(fileBuffer);
    if (!rows.length && errors.length) {
      return {
        success: false,
        data: {
          createdCount: 0,
          createdIds: [],
          errors,
        },
        meta: {} as IMetadata,
      };
    }

    const createdIds: string[] = [];
    const createPromises = rows.map(async (r) => {
      try {
        const data: CreateBillboardMessageDto = {
          message: r.message,
          organizationId: r.organizationId,
          createdAt: new Date(),
        };
        const created = await this.commandBus.execute(
          new CreateBillboardMessageCommand(data, meta),
        );
        return created._id;
      } catch (e: any) {
        errors.push(
          `Row ${r.rowNumber}: Failed to create message (${e?.message ?? 'unknown error'})`,
        );
        return null;
      }
    });

    const results = await Promise.allSettled(createPromises);
    createdIds.push(
      ...results
        .filter(
          (result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled',
        )
        .map((result) => result.value)
        .filter(Boolean),
    );

    return {
      success: true,
      data: {
        createdCount: createdIds.length,
        createdIds,
        errors,
      },
      meta: {} as IMetadata,
    };
  }

  async deleteBillboardMessage(
    data: DeleteBillboardMessageDto,
    meta: IMetadata,
  ): Promise<ICommandResult<DeleteBillboardMessageDto>> {
    const payload: DeleteBillboardMessagePayloadDto = {
      ...data,
      deletedBy: meta.user?.id || 'system',
      deletedAt: new Date(),
    };

    await this.commandBus.execute(
      new DeleteBillboardMessageCommand(payload, meta),
    );

    return {
      success: true,
      data,
      meta,
    };
  }
}