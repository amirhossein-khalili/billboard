export enum RoleIdEnum {
  awat_admin = 'da83bea1-adfe-479d-820e-5343e6465290',
}

export const isAwatAdmin = (meta) => {
  const groups = meta.user?.groups || [];

  return Boolean(
    groups.find(
      (g) => Boolean(g.roles?.find((r) => r.id === RoleIdEnum.awat_admin)),
    ),
  );
};
