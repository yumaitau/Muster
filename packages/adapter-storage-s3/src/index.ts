import {
  DeleteObjectCommand,
  type GetObjectCommandOutput,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig
} from "@aws-sdk/client-s3";
import { getSignedUrl as presign } from "@aws-sdk/s3-request-presigner";
import type { StorageAdapter } from "@muster/core";

async function bodyToBytes(body: NonNullable<GetObjectCommandOutput["Body"]>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function createS3StorageAdapter(): StorageAdapter {
  const bucket = process.env.STORAGE_BUCKET ?? "muster";
  const clientConfig: S3ClientConfig = {
    region: process.env.STORAGE_REGION ?? "us-east-1",
    forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? "true") === "true",
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "minioadmin",
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "minioadmin"
    }
  };
  if (process.env.STORAGE_ENDPOINT) {
    clientConfig.endpoint = process.env.STORAGE_ENDPOINT;
  }
  const client = new S3Client(clientConfig);

  return {
    async put(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    },
    async get(key) {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!result.Body) {
        return null;
      }
      return bodyToBytes(result.Body);
    },
    async getSignedUrl(key, expiresInSeconds = 900) {
      return presign(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSeconds });
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    async list(prefix) {
      const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
      return result.Contents?.map((item) => item.Key).filter((key): key is string => Boolean(key)) ?? [];
    }
  };
}
