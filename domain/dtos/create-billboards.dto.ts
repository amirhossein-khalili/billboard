import { ApiProperty } from '@nestjs/swagger';

export class CreateBillboardsDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}
