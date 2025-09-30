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

@ApiTags('billboards')
@ApiBearerAuth()
@Controller('/api/v1/billboards')
export class BillboardController extends BaseController {
  protected readonly logger = new Logger(BillboardController.name);

  constructor(private readonly svc: BillboardsService) {
    super();
  }

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