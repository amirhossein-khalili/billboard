/**
 * @interface IUserBillboardMessagesStateRepository
 * @description Interface for the user billboard message state repository, defining methods for
 * managing the dismissed state of billboard messages for users.
 */
export interface IUserBillboardMessagesStateRepository {
  /**
   * @method dismissForUser
   * @description Marks a billboard message as dismissed for a specific user in an organization.
   * @param {string} messageId - The ID of the billboard message.
   * @param {string} userId - The ID of the user.
   * @param {string} orgId - The ID of the organization.
   * @param {Date} [closedAt] - The timestamp when the billboard message was dismissed.
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
   * @description Checks if a billboard message has been dismissed
   *  by a specific user in an organization.
   * @param {string} messageId - The ID of the billboard message.
   * @param {string} userId - The ID of the user.
   * @param {string} orgId - The ID of the organization.
   * @returns {Promise<boolean>} A promise that resolves to true if the
   * billboard message is dismissed, otherwise false.
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
   * @description Deletes all dismissal states for a specific billboard message
   * within a particular organization.
   * @param {string} messageId - The ID of the billboard message.
   * @param {string} orgId - The ID of the organization.
   * @returns {Promise<void>}
   */
  deleteByMessageIdAndOrg(messageId: string, orgId: string): Promise<void>;
}
