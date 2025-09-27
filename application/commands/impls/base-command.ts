import { ICommand, IMetadata } from 'com.chargoon.cloud.svc.common';

export class BaseCommand<Dto> implements ICommand<Dto> {
  constructor(
    public readonly data: Dto,
    public readonly meta: IMetadata,
  ) {}
}
