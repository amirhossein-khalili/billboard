import { ApiProperty } from '@nestjs/swagger';

/**
 * @class CreateBillboardsDto
 * @description Data transfer object for uploading a file to create billboards.
 */
export class CreateBillboardsDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'The Excel file to import.' })
    file: any;
}
