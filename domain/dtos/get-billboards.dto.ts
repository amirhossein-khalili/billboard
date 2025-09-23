import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetBillboardsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '2d0fa324-f699-4576-87d2-1d680ee50f53' })
    organizationId: string;

  @IsOptional()
  @ApiHideProperty()
    __meta?: {};
}
