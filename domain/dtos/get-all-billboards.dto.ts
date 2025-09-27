import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * @class GetAllBillboardsDto
 * @description Data transfer object for retrieving all billboards for an organization.
 */
export class GetAllBillboardsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '2d0fa324-f699-4576-87d2-1d680ee50f53' })
  @IsOptional()
    organizationId: string;

  @IsOptional()
  @ApiHideProperty()
    __meta?: {};
}
