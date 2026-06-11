// Export MongoDB collections to NDJSON for the D1 migration.
// Usage: MONGODB_URI=... bun run export-mongo.ts [outDir=./dump]

import { MongoClient } from 'mongodb';
import { mkdirSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';

const COLLECTIONS = ['users', 'recordings', 'coupons', 'planconfigs', 'errorlogs'];

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const outDir = process.argv[2] ?? './dump';
mkdirSync(outDir, { recursive: true });

const client = new MongoClient(uri);
await client.connect();
const db = client.db();

for (const name of COLLECTIONS) {
  const out = createWriteStream(join(outDir, `${name}.ndjson`));
  let count = 0;
  for await (const doc of db.collection(name).find()) {
    // EJSON-ish: keep $oid/$date markers so transform.ts can map types reliably
    out.write(
      JSON.stringify(doc, (_key, value) => {
        if (value && typeof value === 'object' && value._bsontype === 'ObjectId') {
          return { $oid: value.toString() };
        }
        return value;
      }) + '\n',
    );
    count++;
  }
  await new Promise((resolve) => out.end(resolve));
  console.log(`${name}: ${count} documents → ${join(outDir, `${name}.ndjson`)}`);
}

await client.close();
