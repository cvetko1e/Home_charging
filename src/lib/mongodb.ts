import { MongoClient, type Db } from "mongodb";
import { DatabaseConfigurationError } from "@/lib/database-errors";

type MongoGlobal = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as MongoGlobal;

let productionClientPromise: Promise<MongoClient> | undefined;

function createMongoClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new DatabaseConfigurationError("MONGODB_URI");
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  return client.connect();
}

function createCachedMongoClientPromise(): Promise<MongoClient> {
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

export function getMongoClient(): Promise<MongoClient> {
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
    throw new DatabaseConfigurationError("MONGODB_DB_NAME");
  }

  const client = await getMongoClient();

  return client.db(dbName);
}
