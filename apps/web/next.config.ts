import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
