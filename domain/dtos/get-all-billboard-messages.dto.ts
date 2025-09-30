import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IMetadata } from 'com.chargoon.cloud.svc.common';
import { IsOrganizationScope } from '../validators/is-organization-scope.decorator';
import { BILLBOARD_WILDCARD_ORGANIZATION_ID } from '../constants';

/**
 * @class GetAllBillboardMessagesDto
 * @description Data transfer object for retrieving all billboard messages for an organization.
 */
export class GetAllBillboardMessagesDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '2d0fa324-f699-4576-87d2-1d680ee50f53' })
  @IsOrganizationScope({
    message: `organizationId must be a UUID or "${BILLBOARD_WILDCARD_ORGANIZATION_ID}"`,
  })
    organizationId: string;

  @IsOptional()
  @ApiHideProperty()
    __meta?: IMetadata;
}
