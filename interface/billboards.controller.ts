import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  BaseController,
  ParamEx as Param,
  RpcQuery,
  SwaggerGet,
} from 'com.chargoon.cloud.svc.common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express, Request as ExpressRequest } from 'express';
import { BillboardsService } from '../application/billboards.service';
import {
  DeleteBillboardMessageDto,
  GetAllBillboardMessagesDto,
  GetBillboardMessagesResponseDto,
} from '../domain/dtos';
import 'multer';

/**
 * @class BillboardController
 * @description Handles HTTP requests for managing billboards.
 */
@ApiTags('billboards')
@ApiBearerAuth()
@Controller('/api/v1/billboards')
export class BillboardController extends BaseController {
  protected readonly logger = new Logger(BillboardController.name);

  constructor(private readonly svc: BillboardsService) {
    super();
  }

  /**
   * @method getBillboardMessages
   * @description Retrieves a list of billboard_messages for the authenticated user's organization.
   * @param {GetAllBillboardMessagesDto} data - DTO for getting all billboard_messages.
   * @param {any} headers - Request headers.
   * @param {any} req - The request object.
   * @returns {Promise<GetBillboardMessagesResponseDto>} A promise that resolves
   * to the billboard_messages
   * response.
   */
  @Get('/organization/:organizationId/messages')
  @RpcQuery('billboards', 'billboards', 'get_billboards_messages')
  @ApiOkResponse({
    description: 'Billboard Messages…',
    type: GetBillboardMessagesResponseDto,
  })
  @SwaggerGet('return billboard messages', false)
  async getBillboardMessages(
  @Param() data: GetAllBillboardMessagesDto,
    @Headers() headers: any,
  ) {
    const { __meta, ...d } = data;
    return this.svc.getBillboardMessages(
      d,
      await this.getMetadata(data, headers, { pagination: false }),
    );
  }

  /**
   * @method importBillboardMessages
   * @description Imports billboard_messages from an Excel file. The file should
   * have columns for organization ID (use '*' for all organizations) and message.
   * @param {Express.Multer.File} file - The uploaded Excel file.
   * @param {any} headers - Request headers.
   * @param {any} req - The request object.
   * @returns {Promise<any>} The result of the import operation.
   * @throws {BadRequestException} If no file is provided.
   */
  @Post('/messages/import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Upload an Excel workbook (.xlsx) with two columns: "Org ID" (use "*" for all orgs) and "Message".',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Excel file (.xlsx) containing rows like `uuid of organization id  →  md message`',
        },
      },
    },
  })
  async importBillboardMessages(
  @UploadedFile() file: Express.Multer.File,
    @Headers() headers: Record<string, string | string[]>,
    @Request() req: ExpressRequest,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('file is required (xlsx)');
    }
    const meta = await this.getMetadata({}, headers, req, {
      pagination: false,
    });
    return this.svc.importMessagesFromExcel(file.buffer, meta);
  }

  /**
   * @method deleteBillboardMessage
   * @description Deletes a single billboard message by ID.
   * @param {DeleteBillboardMessageDto} param - The billboard message to delete.
   * @param {Record<string, string | string[]>} headers - Request headers.
   * @param {ExpressRequest} req - The request object.
   * @returns {Promise<any>} A promise that resolves to the delete outcome.
   */
  @Delete('/messages/:billboardMessageId')
  async deleteBillboardMessage(
  @Param() param: DeleteBillboardMessageDto,
    @Headers() headers: Record<string, string | string[]>,
    @Request() req: ExpressRequest,
  ) {
    const meta = await this.getMetadata({}, headers, req, {
      pagination: false,
    });
    return this.svc.deleteBillboardMessage(param, meta);
  }
}
