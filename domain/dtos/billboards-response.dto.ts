import { ApiProperty } from 'com.chargoon.cloud.contracts.management-center';
import { IMetadata } from 'com.chargoon.cloud.svc.common';
import { BillboardDto } from './billboard.dto';

/**
 * @class GetBillboardsResponseDto
 * @description Response data transfer object for retrieving billboards.
 */
export class GetBillboardsResponseDto {
  @ApiProperty({ example: true })
    status: boolean;

  @ApiProperty({ type: BillboardDto, isArray: true })
    data: BillboardDto[];

  @ApiProperty({ example: {} })
    meta: IMetadata;
}
