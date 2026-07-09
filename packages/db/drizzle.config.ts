import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Monorepo: single .env at repo root.
config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
