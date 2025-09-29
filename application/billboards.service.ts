import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  IMetadata,
  BaseService,
  IQueryResult,
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

/**
 * @class BillboardMessagesService
 * @description This service handles the business logic for
 * billboard_messages. It extends a BaseService
 * and uses CQRS for handling commands and queries.
 */
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

  /**
   * @method getBillboardMessages
   * @description Retrieves billboard_messages for a specific organization.
   * @param {GetAllBillboardMessagesDto} data - The DTO for getting
   * all billboard_messages.
   * @param {IMetadata} meta - The metadata.
   * @returns {Promise<GetBillboardMessagesResponseDto>} A promise that resolves
   * to the billboard_messages
   * response.
   */
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

  /**
   * @method importFromExcel
   * @description Imports billboard_messages from an Excel file.
   * @param {Buffer} fileBuffer - The buffer of the Excel file.
   * @param {IMetadata} meta - The metadata.
   * @returns {Promise<IQueryResult>} The result of the import operation.
   */
  async importMessagesFromExcel(
    fileBuffer: Buffer,
    meta: IMetadata,
  ): Promise<IQueryResult> {
    const { rows, errors } = this.billboardMessagesXlsxParser.parse(fileBuffer);
    if (!rows.length && errors.length) {
      return {
        status: false,
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
   * @method deleteBillboardMessage
   * @description Deletes a billboard message by ID.
   * @param {DeleteBillboardMessageDto} data - The billboard message to delete.
   * @param {IMetadata} meta - The metadata.
   * @returns {Promise<ICommandResult<DeleteBillboardMessageDto>>} A promise that
   * resolves to the delete outcome.
   */
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
