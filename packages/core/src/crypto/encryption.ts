import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";

function keyFromEnv(): Buffer {
  const raw = process.env.MUSTER_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("MUSTER_ENCRYPTION_KEY is required");
  }
  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) {
    return base64;
  }
  const utf8 = Buffer.from(raw, "utf8");
  if (utf8.length === 32) {
    return utf8;
  }
  throw new Error("MUSTER_ENCRYPTION_KEY must be 32 bytes or a base64-encoded 32 byte key");
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, keyFromEnv(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: authTag.toString("base64"),
    data: ciphertext.toString("base64")
  });
}

export function decryptJson<T>(encrypted: string): T {
  const payload = JSON.parse(encrypted) as { iv: string; tag: string; data: string };
  const decipher = createDecipheriv(algorithm, keyFromEnv(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final()
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
