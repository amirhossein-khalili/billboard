import { Db } from 'mongodb';

type OrgDoc = { _id: string; name: string };
type UserBillboardStateDoc = {
  userId: string;
  orgId: string;
  messageId: string;
  closedAt: Date;
};

export async function seedOrganizations(db: Db, orgIds: string[]) {
  if (!orgIds.length) return;
  const coll = db.collection<OrgDoc>('organizations');
  const docs: OrgDoc[] = orgIds.map((id) => ({ _id: id, name: id }));
  await coll.insertMany(docs, { ordered: true });
}

export async function insertUserClosedState(
  db: Db,
  params: { userId: string; orgId: string; messageId: string; closedAt?: Date },
) {
  const coll = db.collection<UserBillboardStateDoc>('user_billboard_state');
  const { userId, orgId, messageId, closedAt } = params;
  const doc: UserBillboardStateDoc = {
    userId,
    orgId,
    messageId,
    closedAt: closedAt ?? new Date(),
  };
  await coll.insertOne(doc);
}
