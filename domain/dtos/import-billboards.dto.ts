import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { IdentifiableDto } from 'com.chargoon.cloud.svc.common/dist/dto';

export class ImportBillboardsDto {
  @Expose()
  @ApiProperty({
    type: IdentifiableDto,
    example: { id: '5hh76299-e94d-4c04-9a85-1d1f3fca2b9y' },
  })
  @ValidateNested()
  @Type(() => IdentifiableDto)
  public document: IdentifiableDto;

  @ApiHideProperty()
  public __meta?: {};
}
