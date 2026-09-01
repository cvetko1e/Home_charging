import { MongoClient, type Db } from "mongodb";

type MongoGlobal = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as MongoGlobal;

let productionClientPromise: Promise<MongoClient> | undefined;

function createMongoClientPromise() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  const client = new MongoClient(uri);

  return client.connect();
}

export function getMongoClient() {
  if (process.env.NODE_ENV === "development") {
    globalForMongo._mongoClientPromise ??= createMongoClientPromise();

    return globalForMongo._mongoClientPromise;
  }

  productionClientPromise ??= createMongoClientPromise();

  return productionClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const dbName = process.env.MONGODB_DB_NAME;

  if (!dbName) {
    throw new Error("Missing MONGODB_DB_NAME environment variable.");
  }

  const client = await getMongoClient();

  return client.db(dbName);
}
