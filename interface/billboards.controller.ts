import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
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
import { Express } from 'express';
import { BillboardsService } from '../application/billboards.service';
import {
  CreateBillboardsDto,
  DeleteOrganizationBillboardDto,
  GetAllBillboardsDto,
  GetBillboardsResponseDto,
} from '../domain/dtos';
import 'multer';

@ApiTags('billboards')
@ApiBearerAuth()
@Controller('/api/v1/billboards')
export class BillboardController extends BaseController {
  constructor(private readonly svc: BillboardsService) {
    super();
  }

  @Get('')
  @RpcQuery('billboards', 'billboards', 'get_billboards')
  @ApiOkResponse({ description: 'Billboards…', type: GetBillboardsResponseDto })
  @SwaggerGet('return a billboards', false)
  async getBillboards(
    @Param() data: GetAllBillboardsDto,
    @Headers() headers: any,
    @Request() req: any,
  ) {
    const { __meta, ...d } = data;
    return this.svc.getBillboards(
      d,
      await this.getMetadata(data, headers, req, { pagination: false }),
    );
  }

  /**
   * Imports billboards from an Excel file.
   * The Excel file should have columns for organization ID and message.
   */
  @Post('/import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Excel file (.xlsx) with columns: Org ID, Message',
    type: CreateBillboardsDto,
  })
  async importBillboards(
    @UploadedFile() file: Express.Multer.File,
    @Headers() headers: any,
    @Request() req: any,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('file is required (xlsx)');
    }
    const meta = await this.getMetadata({}, headers, req, {
      pagination: false,
    });
    return this.svc.importFromExcel(file.buffer, meta);
  }

  @Post('/delete')
  @ApiBody({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: ['organizationId', 'billboardId'],
        properties: {
          organizationId: {
            type: 'string',
            description:
              'Organization identifier; also supports `orgnizationid` typo.',
            example: '2d0fa324-f699-4576-87d2-1d680ee50f53',
          },
          billboardId: {
            type: 'string',
            description: 'Billboard message identifier.',
            example: 'bb-123456',
          },
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Bulk delete outcome for each requested billboard.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            successes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  organizationId: { type: 'string' },
                  billboardId: { type: 'string' },
                  fullyDeleted: { type: 'boolean' },
                },
              },
            },
            failures: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  organizationId: { type: 'string' },
                  billboardId: { type: 'string' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        meta: { type: 'object' },
      },
    },
  })
  async deleteBillboards(
    @Body() payload: DeleteOrganizationBillboardDto[],
    @Headers() headers: any,
    @Request() req: any,
  ) {
    const meta = await this.getMetadata({}, headers, req, {
      pagination: false,
    });
    return this.svc.deleteOrganizationBillboards(payload, meta);
  }
}
