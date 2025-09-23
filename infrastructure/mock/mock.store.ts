// type ItemRecord = {
//   id: string;
//   isWildcard: boolean;
//   organizationIds: string[];
//   message: string;
//   createdAt: Date;
// };

// class InMemoryBillboardStore {
//   items: ItemRecord[] = [
//     {
//       id: 'itm-global-20250105',
//       isWildcard: true,
//       organizationIds: [],
//       message: '### Global notice
// Welcome to 2025 🎉',
//       createdAt: new Date('2025-01-05T08:00:00.000Z'),
//     },
//     {
//       id: 'itm-org1-20250210',
//       isWildcard: false,
//       organizationIds: ['org-1'],
//       message: '### Org-1 Maintenance
// We will update servers on Friday 9 PM UTC.',
//       createdAt: new Date('2025-02-10T08:00:00.000Z'),
//     },
//     {
//       id: 'itm-org2-20241220',
//       isWildcard: false,
//       organizationIds: ['org-2'],
//       message: `### Year-end reminder
// Please update your profile.',
//       createdAt: new Date('2024-12-20T10:00:00.000Z'),`
//     },
//   ];

//   // Map<itemId, Set<userId>>
//   dismissals: Map<string, Set<string>> = new Map([
//     ['itm-org1-20250210', new Set(['user-dismissed'])],
//   ]);
// }

// export const store = new InMemoryBillboardStore();

// // Utilities
// export const removeItemsByIds = (ids: string[]) => {
//   const idSet = new Set(ids);
//   store.items = store.items.filter((i) => !idSet.has(i.id));
//   for (const id of ids) store.dismissals.delete(id);
// };

// export const removeAllWildcard = () => {
//   store.items = store.items.filter((i) => !i.isWildcard);
//   // Clean dismissals for removed items
//   for (const [id, _] of Array.from(store.dismissals.entries())) {
//     if (!store.items.find((x) => x.id === id)) store.dismissals.delete(id);
//   }
// };

// export const removeAllOrgSpecificFor = (organizationIds: string[]) => {
//   const orgSet = new Set(organizationIds);
//   const toRemove = new Set(
//     store.items
//       .filter((i) => !i.isWildcard && i.organizationIds.some((o) => orgSet.has(o)))
//       .map((i) => i.id),
//   );
//   store.items = store.items.filter((i) => !toRemove.has(i.id));
//   for (const id of toRemove) store.dismissals.delete(id);
// };