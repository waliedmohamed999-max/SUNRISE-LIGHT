import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Private object storage. Files are never placed under /public; they are only
 * served through authorised API routes. The "local" driver is for development
 * and single-server deployments (mount a persistent volume). STORAGE_DRIVER=s3
 * uses a private S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, …) — see docs/DEPLOYMENT.md.
 */
interface StorageDriver {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

function localDriver(): StorageDriver {
  const root = path.resolve(process.env.STORAGE_DIR || "./storage");
  const resolve = (key: string) => {
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
    return full;
  };
  return {
    async put(key, data) {
      const full = resolve(key);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, data);
    },
    get: (key) => readFile(resolve(key)),
    async remove(key) {
      await unlink(resolve(key)).catch(() => undefined);
    },
  };
}

function s3Driver(): StorageDriver {
  const env = process.env;
  const bucket = env.S3_BUCKET;
  if (!bucket || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) throw new Error("STORAGE_DRIVER=s3 needs S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY");
  const client = new S3Client({
    region: env.S3_REGION || "auto",
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
  const prefix = (env.S3_PREFIX || "").replace(/^\/+|\/+$/g, "");
  const keyOf = (key: string) => {
    if (key.includes("..") || key.startsWith("/")) throw new Error("Invalid storage key");
    return prefix ? `${prefix}/${key}` : key;
  };
  return {
    async put(key, data) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: keyOf(key), Body: data, ...(env.S3_SSE === "AES256" && { ServerSideEncryption: "AES256" }) }));
    },
    async get(key) {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: keyOf(key) }));
      if (!res.Body) throw new Error("Empty object");
      return Buffer.from(await res.Body.transformToByteArray());
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: keyOf(key) })).catch(() => undefined);
    },
  };
}

function selectDriver(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver === "local") return localDriver();
  if (driver === "s3") return s3Driver();
  throw new Error(`Storage driver "${driver}" is not implemented in this build. See docs/DEPLOYMENT.md.`);
}

export const storage = selectDriver();
