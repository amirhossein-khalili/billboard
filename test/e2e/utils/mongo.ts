import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let _db: Db | null = null;
let _uri = '';
let _dbName = '';

function ensureDbNameFromUri(uri: string): { uri: string; dbName: string } {
  try {
    const u = new URL(uri);
    const path = u.pathname; // e.g., "/mydb" or "/"
    if (path && path !== '/' && !path.includes(',')) {
      const dbName = decodeURIComponent(path.slice(1));
      return { uri, dbName };
    }
  } catch {
    // Fallback parse if URL ctor fails (older Node or custom schemes)
  }
  const dbName = `e2e_billboard_${Date.now()}`;
  const sep = uri.endsWith('/') ? '' : '/';
  return { uri: `${uri}${sep}${dbName}`, dbName };
}

export async function startMongo(): Promise<{
  uri: string;
  dbName: string;
  db: Db;
  client: MongoClient;
}> {
  const baseUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const resolved = ensureDbNameFromUri(baseUri);
  _uri = resolved.uri;
  _dbName = resolved.dbName;

  client = new MongoClient(_uri);
  await client.connect();
  _db = client.db(_dbName);

  // Ensure the app under test uses the exact same database
  process.env.MONGODB_URI = _uri;

  return { uri: _uri, dbName: _dbName, db: _db, client };
}

export async function clearDatabase() {
  if (!_db) return;
  const collections = await _db.collections();
  await Promise.all(
    collections.map(async (c) => {
      try {
        await c.deleteMany({});
      } catch {
        // ignore errors on teardown/cleanup
      }
    }),
  );
}

export async function stopMongo() {
  try {
    if (client) await client.close();
  } finally {
    client = null;
    _db = null;
    _uri = '';
    _dbName = '';
  }
}

export function getDb(): Db {
  if (!_db) throw new Error('Mongo not started: call startMongo() first');
  return _db;
}

export function getUri(): string {
  if (!_uri) throw new Error('Mongo not started: call startMongo() first');
  return _uri;
}

export function getClient(): MongoClient {
  if (!client) throw new Error('Mongo not started: call startMongo() first');
  return client;
}
