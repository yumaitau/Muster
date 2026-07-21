import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: [
    "@muster/core",
    "@muster/db",
    "@muster/connector-sdk",
    "@muster/connector-xero",
    "@muster/connector-clicksend",
    "@muster/connector-meta",
    "@muster/connector-canva",
    "@muster/connector-monday",
    "@muster/adapter-auth-betterauth",
    "@muster/adapter-storage-s3",
    "@muster/adapter-model"
  ]
};

export default nextConfig;
