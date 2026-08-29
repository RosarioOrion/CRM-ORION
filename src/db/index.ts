import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// En desarrollo, reusar la conexión entre recargas en caliente.
const globalForDb = globalThis as unknown as {
  queryClient?: ReturnType<typeof postgres>;
};

const queryClient =
  globalForDb.queryClient ?? postgres(connectionString, { max: 5 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
