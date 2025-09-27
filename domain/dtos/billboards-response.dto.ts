import { ApiProperty } from 'com.chargoon.cloud.contracts.management-center';
import { IMetadata } from 'com.chargoon.cloud.svc.common';
import { BillboardDto } from './billboard.dto';

export class GetBillboardsResponseDto {
  @ApiProperty({ example: true })
    status: boolean;

  @ApiProperty({ type: BillboardDto, isArray: true })
    data: BillboardDto[];

  @ApiProperty({ example: {} })
    meta: IMetadata;
}
