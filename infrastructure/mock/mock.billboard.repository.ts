// import { IBillboardRepository } from '../../domain/interfaces/billboard.repository';
// import { BillboardItem } from '../../domain/models/billboard-item';
// import {
//   store,
//   removeItemsByIds,
//   removeAllOrgSpecificFor,
//   removeAllWildcard,
// } from './mock.store';

// export class MockBillboardRepository implements IBillboardRepository {
//   async create(item: BillboardItem): Promise<void> {
//     store.items.push({
//       id: item.id,
//       isWildcard: item.isWildcard,
//       organizationIds: Array.from(item.organizationIds),
//       message: item.message.value,
//       createdAt: item.createdAt,
//     });
//   }

//   async deleteByIds(ids: string[]): Promise<void> {
//     removeItemsByIds(ids);
//   }

//   async deleteAllOrgSpecificFor(organizationIds: string[]): Promise<void> {
//     removeAllOrgSpecificFor(organizationIds);
//   }

//   async deleteAllWildcard(): Promise<void> {
//     removeAllWildcard();
//   }

//   async findById(id: string): Promise<BillboardItem | null> {
//     const row = store.items.find((i) => i.id === id);
//     if (!row) return null;

//     // Lightweight reconstruction (message validation omitted in mock)
//     return new BillboardItem(
//       row.id,
//       row.isWildcard,
//       new Set(row.organizationIds),
//       { value: row.message } as any,
//       row.createdAt,
//     );
//   }

//   async dismissForUser(
//     itemId: string,
//     userId: string,
//     _dismissedAt: Date,
//   ): Promise<void> {
//     const set = store.dismissals.get(itemId) ?? new Set<string>();
//     set.add(userId);
//     store.dismissals.set(itemId, set);
//   }

//   async isDismissed(itemId: string, userId: string): Promise<boolean> {
//     return store.dismissals.get(itemId)?.has(userId) ?? false;
//   }
// }
