import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * @class DeleteOrganizationBillboardDto
 * @description Data transfer object for deleting a billboard from an organization.
 */
export class DeleteOrganizationBillboardDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '2d0fa324-f699-4576-87d2-1d680ee50f53' })
    organizationId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'bb-123456' })
    billboardId: string;
}
