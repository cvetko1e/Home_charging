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

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  return client.connect();
}

function createCachedMongoClientPromise() {
  const clientPromise = createMongoClientPromise().catch((error) => {
    if (process.env.NODE_ENV === "development") {
      globalForMongo._mongoClientPromise = undefined;
    } else {
      productionClientPromise = undefined;
    }

    throw error;
  });

  return clientPromise;
}

export function getMongoClient() {
  if (process.env.NODE_ENV === "development") {
    globalForMongo._mongoClientPromise ??= createCachedMongoClientPromise();

    return globalForMongo._mongoClientPromise;
  }

  productionClientPromise ??= createCachedMongoClientPromise();

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
