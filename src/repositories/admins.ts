import { type Collection } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import type {
  AdminDocument,
  AdminSessionDocument,
  AdminSessionUser,
} from "@/types/admin";

const adminsCollectionName = "admins";
const adminSessionsCollectionName = "admin_sessions";

async function getAdminsCollection(): Promise<Collection<AdminDocument>> {
  const db = await getMongoDb();

  return db.collection<AdminDocument>(adminsCollectionName);
}

async function getAdminSessionsCollection(): Promise<
  Collection<AdminSessionDocument>
> {
  const db = await getMongoDb();

  return db.collection<AdminSessionDocument>(adminSessionsCollectionName);
}

export async function createAdminIndexes() {
  const admins = await getAdminsCollection();
  const sessions = await getAdminSessionsCollection();

  await Promise.all([
    admins.createIndex({ email: 1 }, { unique: true }),
    sessions.createIndex({ sessionTokenHash: 1 }, { unique: true }),
    sessions.createIndex({ adminId: 1 }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

export async function findAdminByEmail(email: string) {
  const collection = await getAdminsCollection();

  return collection.findOne({ email });
}

export async function upsertAdmin(document: Omit<AdminDocument, "_id">) {
  const collection = await getAdminsCollection();
  const now = new Date();

  await collection.updateOne(
    { email: document.email },
    {
      $set: {
        passwordHash: document.passwordHash,
        role: document.role,
        active: document.active,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: document.createdAt,
      },
    },
    { upsert: true },
  );

  return collection.findOne({ email: document.email });
}

export async function insertAdminSession(document: AdminSessionDocument) {
  const collection = await getAdminSessionsCollection();
  await collection.insertOne(document);

  return document;
}

export async function findActiveAdminSessionByTokenHash(
  sessionTokenHash: string,
  now = new Date(),
) {
  const sessions = await getAdminSessionsCollection();
  const admins = await getAdminsCollection();
  const session = await sessions.findOne({
    sessionTokenHash,
    expiresAt: { $gt: now },
    invalidatedAt: { $exists: false },
  });

  if (!session) {
    return null;
  }

  const admin = await admins.findOne({
    _id: session.adminId,
    active: true,
  });

  if (!admin) {
    return null;
  }

  return { session, admin };
}

export async function invalidateAdminSession(sessionTokenHash: string) {
  const collection = await getAdminSessionsCollection();

  await collection.updateOne(
    {
      sessionTokenHash,
      invalidatedAt: { $exists: false },
    },
    {
      $set: {
        invalidatedAt: new Date(),
      },
    },
  );
}

export function toAdminSessionUser(admin: AdminDocument): AdminSessionUser {
  return {
    id: admin._id.toHexString(),
    email: admin.email,
    role: admin.role,
  };
}
