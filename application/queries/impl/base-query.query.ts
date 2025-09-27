import { IQuery, IMetadata } from 'com.chargoon.cloud.svc.common';

export class BaseQuery<T> implements IQuery<T> {
  constructor(
    public readonly data: T,
    public readonly meta: IMetadata,
  ) { }
}
