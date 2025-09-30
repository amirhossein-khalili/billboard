import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsDate,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsOrganizationScope } from '../validators/is-organization-scope.decorator';
import { BILLBOARD_WILDCARD_ORGANIZATION_ID } from '../constants';

export class CreateBillboardMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000, {
    message: 'Message exceeds maximum length of 10000 characters',
  })
    message: string;

  @IsString()
  @IsNotEmpty()
  @IsOrganizationScope({
    message: `organizationId must be a UUID or "${BILLBOARD_WILDCARD_ORGANIZATION_ID}"`,
  })
    organizationId: string;

  @IsDate()
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
    createdAt?: Date;
}
