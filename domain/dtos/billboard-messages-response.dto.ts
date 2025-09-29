import { ApiProperty } from 'com.chargoon.cloud.contracts.management-center';
import { IMetadata } from 'com.chargoon.cloud.svc.common';
import { BillboardMessageDto } from './billboard-message.dto';

/**
 * @class GetBillboardMessagesResponseDto
 * @description Response data transfer object for retrieving billboard messages.
 */
export class GetBillboardMessagesResponseDto {
  @ApiProperty({ example: true })
  status: boolean;

  @ApiProperty({ type: BillboardMessageDto, isArray: true })
  data: BillboardMessageDto[];

  @ApiProperty({ example: {} })
  meta: IMetadata;
}
