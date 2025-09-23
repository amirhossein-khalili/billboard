import {
  Controller,
  Get,
  Headers,
  Request,
  Post,
  UploadedFile,
  UseInterceptors,
  Delete,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { BaseController } from 'com.chargoon.cloud.svc.common/dist/base-controller';
import { RpcQuery } from 'com.chargoon.cloud.svc.common/dist/utils';
import { ParamEx as ParamEx } from 'com.chargoon.cloud.svc.common';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SwaggerGet } from 'com.chargoon.cloud.svc.common/dist/swagger';
import { BillboardsService } from '../application/billboards.service';
import { GetBillboardsDto, CreateBillboardsDto } from '../domain/dtos';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('billboards')
@ApiBearerAuth()
@Controller('/api/v1/billboards')
export class BillboardController extends BaseController {
  constructor(private readonly svc: BillboardsService) {
    super();
  }

  /**
   * Returns the latest active billboard for a given organization.
   * If the user has dismissed the latest billboard, it returns null.
   */
  /**
   * Returns all active billboards.
   */
  @Get('/')
  @SwaggerGet('return all billboards', true)
  async getAllBillboards(@Headers() headers: any, @Request() req: any) {
    const meta = await this.getMetadata({}, headers, req, {
      pagination: false,
    });
    return this.svc.getAllBillboards(meta);
  }

  /**
   * Returns a billboard by its ID.
   */
  @Get('/:id')
  @SwaggerGet('return a billboard by id', false)
  async getBillboardById(
    @Param('id') id: string,
    @Headers() headers: any,
    @Request() req: any,
  ) {
    const meta = await this.getMetadata({}, headers, req, {
      pagination: false,
    });
    return this.svc.getBillboardById(id, meta);
  }

  /**
   * Returns the latest active billboard for a given organization.
   * If the user has dismissed the latest billboard, it returns null.
   */
  @Get('/:organizationId')
  @RpcQuery('billboards', 'billboards', 'get_billboards')
  @SwaggerGet('return a billboards', false)
  async getBillboards(
    @ParamEx() data: GetBillboardsDto,
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

  /**
   * Deletes a billboard by its ID.
   * This is a soft delete.
   */
  @Delete('/:id')
  async deleteBillboard(
    @Param('id') id: string,
    @Headers() headers: any,
    @Request() req: any,
  ) {
    const meta = await this.getMetadata({}, headers, req, {
      pagination: false,
    });
    return this.svc.deleteBillboard(id, meta);
  }

  /**
   * Allows a user to dismiss a billboard for a specific organization.
   */
  @Post('/:organizationId/dismiss/:id')
  async dismissBillboard(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Headers() headers: any,
    @Request() req: any,
  ) {
    const meta = await this.getMetadata({}, headers, req, {
      pagination: false,
    });
    return this.svc.dismissBillboard(organizationId, id, meta);
  }
}
