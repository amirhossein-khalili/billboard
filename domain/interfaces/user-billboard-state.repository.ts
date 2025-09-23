export interface IUserBillboardStateRepository {
  dismissForUser(
    messageId: string,
    userId: string,
    orgId: string,
    closedAt?: Date,
  ): Promise<void>;

  isDismissed(
    messageId: string,
    userId: string,
    orgId: string,
  ): Promise<boolean>;

  deleteByMessageId(messageId: string): Promise<void>;
}
