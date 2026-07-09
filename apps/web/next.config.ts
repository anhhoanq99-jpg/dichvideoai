import path from "node:path";
import { config } from "dotenv";
import type { NextConfig } from "next";

// Monorepo: single .env at repo root, shared with the worker.
config({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  transpilePackages: ["@dichvideo/shared", "@dichvideo/db"],
};

export default nextConfig;
