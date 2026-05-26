import type { ModelAdapter, StorageAdapter } from "./contracts";

const dynamicImport = new Function("specifier", "return import(specifier)") as <T>(specifier: string) => Promise<T>;

export async function loadStorageAdapter(): Promise<StorageAdapter> {
  const provider = process.env.STORAGE_PROVIDER ?? "s3";
  if (provider !== "s3") {
    throw new Error(`Unsupported storage adapter ${provider}`);
  }
  const { createS3StorageAdapter } = await dynamicImport<{ createS3StorageAdapter(): StorageAdapter }>("@muster/adapter-storage-s3");
  return createS3StorageAdapter();
}

export async function loadModelAdapter(): Promise<ModelAdapter> {
  const provider = process.env.MODEL_PROVIDER ?? "openai";
  const { createModelAdapter } = await dynamicImport<{ createModelAdapter(config: { provider: string }): ModelAdapter }>("@muster/adapter-model");
  return createModelAdapter({ provider });
}
