import { MongoClient, type Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add MONGODB_URI to .env.local");
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// TTL index: auto-delete activity_streams older than 18 months (548 days)
const STREAM_TTL_SECONDS = 548 * 24 * 3600;
let ensureIndexesPromise: Promise<void> | null = null;

async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("activity_streams").createIndex(
    { activityDate: 1 },
    { expireAfterSeconds: STREAM_TTL_SECONDS, background: true }
  );
}

export async function getDb() {
  const client = await clientPromise;
  const db = client.db("cyclopower");
  if (!ensureIndexesPromise) {
    ensureIndexesPromise = ensureIndexes(db).catch((e) => {
      // Reset so it retries on the next call
      ensureIndexesPromise = null;
      console.error("[mongodb] ensureIndexes failed:", e);
    });
  }
  return db;
}
