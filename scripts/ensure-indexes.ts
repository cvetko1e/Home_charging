import { getMongoClient } from "../src/lib/mongodb";
import { ensureDatabaseIndexes } from "../src/repositories/indexes";
import { loadLocalEnv } from "./load-local-env";

async function main() {
  loadLocalEnv();

  await ensureDatabaseIndexes();
  console.log("MongoDB indexes are ready.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const client = await getMongoClient();
      await client.close();
    } catch {
      return;
    }
  });
