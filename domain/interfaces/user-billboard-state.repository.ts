/**
 * @interface IUserBillboardsStateRepository
 * @description Interface for the user billboard state repository, defining methods for managing the dismissed state of billboards for users.
 */
export interface IUserBillboardsStateRepository {
  /**
   * @method dismissForUser
   * @description Marks a billboard as dismissed for a specific user in an organization.
   * @param {string} messageId - The ID of the billboard message.
   * @param {string} userId - The ID of the user.
   * @param {string} orgId - The ID of the organization.
   * @param {Date} [closedAt] - The timestamp when the billboard was dismissed.
   * @returns {Promise<void>}
   */
  dismissForUser(
    messageId: string,
    userId: string,
    orgId: string,
    closedAt?: Date,
  ): Promise<void>;

  /**
   * @method isDismissed
   * @description Checks if a billboard has been dismissed by a specific user in an organization.
   * @param {string} messageId - The ID of the billboard message.
   * @param {string} userId - The ID of the user.
   * @param {string} orgId - The ID of the organization.
   * @returns {Promise<boolean>} A promise that resolves to true if the billboard is dismissed, otherwise false.
   */
  isDismissed(
    messageId: string,
    userId: string,
    orgId: string,
  ): Promise<boolean>;

  /**
   * @method deleteByMessageId
   * @description Deletes all dismissal states for a specific billboard message.
   * @param {string} messageId - The ID of the billboard message.
   * @returns {Promise<void>}
   */
  deleteByMessageId(messageId: string): Promise<void>;

  /**
   * @method deleteByMessageIdAndOrg
   * @description Deletes all dismissal states for a specific billboard message within a particular organization.
   * @param {string} messageId - The ID of the billboard message.
   * @param {string} orgId - The ID of the organization.
   * @returns {Promise<void>}
   */
  deleteByMessageIdAndOrg(messageId: string, orgId: string): Promise<void>;
}
