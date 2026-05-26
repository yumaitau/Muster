import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@muster/core",
    "@muster/db",
    "@muster/connector-sdk",
    "@muster/connector-xero",
    "@muster/adapter-auth-betterauth",
    "@muster/adapter-storage-s3",
    "@muster/adapter-model"
  ]
};

export default nextConfig;
