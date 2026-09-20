import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@killsql/question-types"],
  serverExternalPackages: ["@duckdb/duckdb-wasm", "stripe"],
};

export default nextConfig;
