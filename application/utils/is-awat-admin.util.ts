/**
 * @enum {string} RoleIdEnum
 * @description Enum for role IDs, providing a centralized definition for role identifiers.
 */
export enum RoleIdEnum {
  /**
   * @property {string} awat_admin - The unique identifier for the 'awat_admin' role.
   */
  awat_admin = 'da83bea1-adfe-479d-820e-5343e6465290',
}

/**
 * @function isAwatAdmin
 * @description Checks if a user has the 'awat_admin' role based on the provided metadata.
 * @param {any} meta - The metadata object containing user information, including groups and roles.
 * @returns {boolean} Returns `true` if the user has the 'awat_admin' role, otherwise `false`.
 */
export const isAwatAdmin = (meta) => {
  const groups = meta.user?.groups || [];

  return Boolean(
    groups.find(
      (g) => Boolean(g.roles?.find((r) => r.id === RoleIdEnum.awat_admin)),
    ),
  );
};
