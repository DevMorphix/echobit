// Export MongoDB collections to NDJSON for the D1 migration.
// Usage: MONGODB_URI=... bun run export-mongo.ts [outDir=./dump] [--since <ISO>]
//
// --since <ISO>  Incremental: export only docs with updatedAt >= <ISO> (every
//                model has { timestamps: true }, so updatedAt always exists).
//                Omit for a full dump (backfill). Combined with transform.ts's
//                upserts, a delta export re-applies cleanly over a prior load.

import { MongoClient } from 'mongodb';
import { mkdirSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';

const COLLECTIONS = ['users', 'recordings', 'coupons', 'planconfigs', 'errorlogs'];

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const args = process.argv.slice(2);
const sinceIdx = args.indexOf('--since');
const since = sinceIdx !== -1 ? args[sinceIdx + 1] : undefined;
const sinceValIdx = sinceIdx !== -1 ? sinceIdx + 1 : -1; // index of --since's value (none → -1)
const outDir = args.find((a, i) => !a.startsWith('--') && i !== sinceValIdx) ?? './dump';
mkdirSync(outDir, { recursive: true });

const filter = since ? { updatedAt: { $gte: new Date(since) } } : {};
if (since) console.log(`Incremental export: updatedAt >= ${new Date(since).toISOString()}`);

const client = new MongoClient(uri);
await client.connect();
const db = client.db();

for (const name of COLLECTIONS) {
  const out = createWriteStream(join(outDir, `${name}.ndjson`));
  let count = 0;
  for await (const doc of db.collection(name).find(filter)) {
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
