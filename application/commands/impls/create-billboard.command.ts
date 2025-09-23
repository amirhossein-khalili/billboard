import {
  ICommand,
  IMetadata,
} from 'com.chargoon.cloud.svc.common/dist/interfaces';

export class CreateBillboardCommand implements ICommand<CreateBillboardDto> {
  constructor(
    public readonly data: CreateBillboardDto,
    public readonly meta: IMetadata,
  ) {}
}
