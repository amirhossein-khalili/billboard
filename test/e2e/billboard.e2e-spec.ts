import {
  INestApplication,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Db } from 'mongodb';
import { AppModule } from 'src/app.module';
import { seedOrganizations, insertUserClosedState } from './utils/seed';
import { makeXlsx, makeCustomAoAXlsx } from './utils/excel';
import { startMongo, clearDatabase, stopMongo, getDb } from './utils/mongo';

@Injectable()
class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const role = (req.headers['x-test-role'] as string) || 'user';
    const userId = (req.headers['x-test-user-id'] as string) || 'anon';
    req.user = { id: userId, role };

    const method = (req.method || '').toUpperCase();
    const url: string = req.url || '';

    const requiresAdmin =
      (method === 'POST' && url.startsWith('/billboard/items/upload')) ||
      (method === 'DELETE' && url.startsWith('/billboard/items/'));

    if (requiresAdmin && role !== 'admin') {
      throw new ForbiddenException();
    }
    return true;
  }
}

describe('Billboard E2E (External Mongo)', () => {
  let app: INestApplication;
  let httpServer: any;
  let db: Db;

  beforeAll(async () => {
    await startMongo();
    db = getDb();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // NOTE : check this part
    // app.useGlobalGuards(new TestAuthGuard());

    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
    await stopMongo();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  const asAdmin = (req: request.Test) =>
    req.set('x-test-role', 'admin').set('x-test-user-id', 'ADMIN');
  const asUser = (req: request.Test, userId = 'U1') =>
    req.set('x-test-role', 'user').set('x-test-user-id', userId);
  const expectIso = (iso: string) => {
    const d = new Date(iso);
    expect(d.toString()).not.toBe('Invalid Date');
  };

  describe('Create (upload)', () => {
    it('#1 Happy path – specific orgs', async () => {
      await seedOrganizations(db, ['ORG_A', 'ORG_B']);

      const buf = makeXlsx([
        ['ORG_A', 'Hello **A**'],
        ['ORG_B', 'Visit [link](https://ex.com)'],
      ]);

      const res = await asAdmin(
        request(httpServer).post('/billboard/items/upload'),
      )
        .attach('file', buf, {
          filename: 'upload.xlsx',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .expect(201);

      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toEqual(
        expect.objectContaining({
          totalRows: 2,
          createdCount: 2,
          errorCount: 0,
        }),
      );
      expect(Array.isArray(res.body.created)).toBe(true);
      expect(res.body.created.length).toBe(2);
      for (const item of res.body.created) {
        expect(item).toHaveProperty('orgId');
        expect(item).toHaveProperty('messageId');
        expect(item).toHaveProperty('createdAt');
        expectIso(item.createdAt);
      }

      const resA = await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_A', userId: 'U1' }),
      ).expect(200);

      expect(resA.body).toEqual(
        expect.objectContaining({
          orgId: 'ORG_A',
          markdown: 'Hello **A**',
        }),
      );
      expectIso(resA.body.createdAt);
    });

    it('#2 Happy path – asterisk fan-out', async () => {
      await seedOrganizations(db, ['ORG_A', 'ORG_B', 'ORG_C']);
      const buf = makeXlsx([['*', 'Global notice']]);

      const res = await asAdmin(
        request(httpServer).post('/billboard/items/upload'),
      )
        .attach('file', buf, {
          filename: 'upload.xlsx',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .expect(201);

      expect(res.body.summary.createdCount).toBe(3);
      expect(res.body.created.length).toBe(3);

      for (const orgId of ['ORG_A', 'ORG_B', 'ORG_C']) {
        const r = await asUser(
          request(httpServer)
            .get('/billboard/items')
            .query({ orgId, userId: 'U1' }),
        ).expect(200);
        expect(r.body.orgId).toBe(orgId);
        expect(r.body.markdown).toBe('Global notice');
      }
    });

    it('#3 Last-wins within one file', async () => {
      await seedOrganizations(db, ['ORG_A']);
      const buf = makeXlsx([
        ['ORG_A', 'First'],
        ['ORG_A', 'Second'],
      ]);

      await asAdmin(request(httpServer).post('/billboard/items/upload'))
        .attach('file', buf, { filename: 'upload.xlsx' })
        .expect(201);

      const res = await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_A', userId: 'U1' }),
      ).expect(200);

      expect(res.body.markdown).toBe('Second');
    });

    it('#4 Mixed asterisk + specific', async () => {
      await seedOrganizations(db, ['ORG_A', 'ORG_B']);

      const rows: Array<[string, string]> = [
        ['*', 'Global 1'],
        ['ORG_B', 'Direct B'],
        ['*', 'Global 2'],
      ];
      const buf = makeXlsx(rows);

      await asAdmin(request(httpServer).post('/billboard/items/upload'))
        .attach('file', buf, { filename: 'upload.xlsx' })
        .expect(201);

      const resA = await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_A', userId: 'U1' }),
      ).expect(200);
      expect(resA.body.markdown).toBe('Global 2');

      const resB = await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_B', userId: 'U1' }),
      ).expect(200);
      expect(resB.body.markdown).toBe('Global 2');
    });

    it('#5 Unknown org row produces error but others succeed', async () => {
      await seedOrganizations(db, ['ORG_A']);
      const buf = makeXlsx([
        ['ORG_A', 'Hi'],
        ['ORG_X', 'Nope'],
      ]);

      const res = await asAdmin(
        request(httpServer).post('/billboard/items/upload'),
      )
        .attach('file', buf, { filename: 'upload.xlsx' })
        .expect(201);

      expect(res.body.summary.totalRows).toBe(2);
      expect(res.body.summary.createdCount).toBe(1);
      expect(res.body.summary.errorCount).toBe(1);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ reason: 'ORG_NOT_FOUND' }),
        ]),
      );
    });

    it('#6 Validation errors (EMPTY_ORGID, EMPTY_MESSAGE, MISSING_COLUMNS, INVALID_FILE)', async () => {
      await seedOrganizations(db, ['ORG_A']);

      const buf1 = makeXlsx([
        ['', 'Text'],
        ['ORG_A', ''],
      ]);

      const res1 = await asAdmin(
        request(httpServer).post('/billboard/items/upload'),
      )
        .attach('file', buf1, { filename: 'upload.xlsx' })
        .expect(201);

      expect(res1.body.summary.errorCount).toBe(2);
      expect(res1.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ reason: 'EMPTY_ORGID' }),
          expect.objectContaining({ reason: 'EMPTY_MESSAGE' }),
        ]),
      );

      const bufMissing = makeCustomAoAXlsx([['Org ID', 'Message'], ['ORG_A']]);

      const res2 = await asAdmin(
        request(httpServer).post('/billboard/items/upload'),
      )
        .attach('file', bufMissing, { filename: 'upload.xlsx' })
        .expect(201);

      expect(res2.body.summary.errorCount).toBeGreaterThanOrEqual(1);
      expect(res2.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ reason: 'MISSING_COLUMNS' }),
        ]),
      );

      const txt = Buffer.from('not an excel file', 'utf-8');
      const res3 = await asAdmin(
        request(httpServer).post('/billboard/items/upload'),
      )
        .attach('file', txt, {
          filename: 'upload.txt',
          contentType: 'text/plain',
        })
        .expect(400);

      if (Array.isArray(res3.body?.errors)) {
        expect(res3.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ reason: 'INVALID_FILE' }),
          ]),
        );
      } else {
        expect(
          res3.body?.reason === 'INVALID_FILE' ||
            res3.body?.message?.includes?.('INVALID_FILE'),
        ).toBeTruthy();
      }
    });

    it('#7 AuthZ – non-admin forbidden', async () => {
      await seedOrganizations(db, ['ORG_A']);
      const buf = makeXlsx([['ORG_A', 'Hi']]);

      await asUser(request(httpServer).post('/billboard/items/upload'))
        .attach('file', buf, { filename: 'upload.xlsx' })
        .expect(403);
    });
  });

  describe('Get', () => {
    it('#8 No message → 204', async () => {
      await seedOrganizations(db, ['ORG_A']);

      await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_A', userId: 'U1' }),
      ).expect(204);
    });

    it('#9 User closed latest → 204 (for that user only)', async () => {
      await seedOrganizations(db, ['ORG_A']);
      const buf = makeXlsx([['ORG_A', 'Hello']]);

      const res = await asAdmin(
        request(httpServer).post('/billboard/items/upload'),
      )
        .attach('file', buf, { filename: 'upload.xlsx' })
        .expect(201);

      const createdForA = (res.body.created as any[]).find(
        (c) => c.orgId === 'ORG_A',
      );
      expect(createdForA).toBeDefined();

      await insertUserClosedState(db, {
        userId: 'U1',
        orgId: 'ORG_A',
        messageId: createdForA.messageId,
      });

      await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_A', userId: 'U1' }),
      ).expect(204);

      const resU2 = await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_A', userId: 'U2' }),
      ).expect(200);
      expect(resU2.body.markdown).toBe('Hello');
    });

    it('#10 Deleted message not returned', async () => {
      await seedOrganizations(db, ['ORG_A']);
      const buf = makeXlsx([['ORG_A', 'To delete']]);

      const res = await asAdmin(
        request(httpServer).post('/billboard/items/upload'),
      )
        .attach('file', buf, { filename: 'upload.xlsx' })
        .expect(201);

      const created = (res.body.created as any[]).find(
        (c) => c.orgId === 'ORG_A',
      );
      expect(created).toBeDefined();

      await asAdmin(
        request(httpServer).delete(`/billboard/items/${created.messageId}`),
      ).expect(204);

      await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_A', userId: 'U1' }),
      ).expect(204);
    });

    it('#11 Markdown with links preserved', async () => {
      await seedOrganizations(db, ['ORG_A']);
      const md = 'Visit [docs](https://example.org/path?x=1)';
      const buf = makeXlsx([['ORG_A', md]]);

      await asAdmin(request(httpServer).post('/billboard/items/upload'))
        .attach('file', buf, { filename: 'upload.xlsx' })
        .expect(201);

      const res = await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_A', userId: 'U1' }),
      ).expect(200);

      expect(res.body.markdown).toBe(md);
    });

    it('#12 Latest message wins across multiple uploads', async () => {
      await seedOrganizations(db, ['ORG_A']);

      const buf1 = makeXlsx([['ORG_A', 'One']]);
      await asAdmin(request(httpServer).post('/billboard/items/upload'))
        .attach('file', buf1, { filename: 'u1.xlsx' })
        .expect(201);

      await new Promise((r) => setTimeout(r, 10));

      const buf2 = makeXlsx([['ORG_A', 'Two']]);
      await asAdmin(request(httpServer).post('/billboard/items/upload'))
        .attach('file', buf2, { filename: 'u2.xlsx' })
        .expect(201);

      const res = await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_A', userId: 'U1' }),
      ).expect(200);

      expect(res.body.markdown).toBe('Two');
    });
  });

  describe('Delete', () => {
    it('#13 Happy path delete', async () => {
      await seedOrganizations(db, ['ORG_A']);
      const buf = makeXlsx([['ORG_A', 'Erase me']]);

      const res = await asAdmin(
        request(httpServer).post('/billboard/items/upload'),
      )
        .attach('file', buf, { filename: 'upload.xlsx' })
        .expect(201);

      const created = (res.body.created as any[]).find(
        (c) => c.orgId === 'ORG_A',
      );
      expect(created).toBeDefined();

      await asAdmin(
        request(httpServer).delete(`/billboard/items/${created.messageId}`),
      ).expect(204);

      await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_A', userId: 'U1' }),
      ).expect(204);
    });

    it('#14 Idempotency / non-existent → 404', async () => {
      await asAdmin(
        request(httpServer).delete('/billboard/items/000000000000000000000000'),
      ).expect(404);
    });

    it('#15 AuthZ – non-admin forbidden', async () => {
      await asUser(
        request(httpServer).delete('/billboard/items/000000000000000000000000'),
      ).expect(403);
    });
  });

  describe('Concurrency / Ordering', () => {
    it('#16 Competing creates – later timestamp is visible', async () => {
      await seedOrganizations(db, ['ORG_A']);

      const bufEarly = makeXlsx([['ORG_A', 'Earlier']]);
      const bufLater = makeXlsx([['ORG_A', 'Later']]);

      const r1 = await asAdmin(
        request(httpServer).post('/billboard/items/upload'),
      )
        .attach('file', bufEarly, { filename: 'early.xlsx' })
        .expect(201);

      await new Promise((r) => setTimeout(r, 15));

      const r2 = await asAdmin(
        request(httpServer).post('/billboard/items/upload'),
      )
        .attach('file', bufLater, { filename: 'later.xlsx' })
        .expect(201);

      const c1 = (r1.body.created as any[]).find((c) => c.orgId === 'ORG_A');
      const c2 = (r2.body.created as any[]).find((c) => c.orgId === 'ORG_A');
      expectIso(c1.createdAt);
      expectIso(c2.createdAt);
      expect(new Date(c2.createdAt).getTime()).toBeGreaterThan(
        new Date(c1.createdAt).getTime(),
      );

      const res = await asUser(
        request(httpServer)
          .get('/billboard/items')
          .query({ orgId: 'ORG_A', userId: 'U1' }),
      ).expect(200);
      expect(res.body.markdown).toBe('Later');
    });
  });
});
