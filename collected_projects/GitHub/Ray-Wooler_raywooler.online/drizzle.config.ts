import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { getEnv } from "./src/lib/env";

loadEnvConfig(process.cwd());

const env = getEnv();

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL ?? "postgresql://raywooler@localhost:5432/raywooler",
  },
  strict: true,
  verbose: true,
});
