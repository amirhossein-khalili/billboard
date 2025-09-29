import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from 'com.chargoon.cloud.contracts.management-center';
import { DeleteBillboardMessageDto } from './delete-billboard-message.dto';

/**
 * @class DeleteOrganizationBillboardMessagePayloadDto
 * @description Payload DTO for the command to delete a billboard message from an organization.
 */
export class DeleteBillboardMessagePayloadDto extends DeleteBillboardMessageDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'user-123456' })
  deletedBy: string;

  @IsNotEmpty()
  @IsDateString()
  @ApiProperty({ example: '2025-09-28T03:54:00Z' })
  deletedAt: Date;
}
