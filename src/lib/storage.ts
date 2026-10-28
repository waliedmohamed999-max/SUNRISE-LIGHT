import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Private object storage. Files are never placed under /public; they are only
 * served through authorised API routes. The "local" driver is for development
 * and single-server deployments. Production should use a private S3-compatible
 * bucket: implement the same three functions with @aws-sdk/client-s3
 * (see docs/DEPLOYMENT.md) and select it with STORAGE_DRIVER=s3.
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

function selectDriver(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver === "local") return localDriver();
  throw new Error(`Storage driver "${driver}" is not implemented in this build. See docs/DEPLOYMENT.md.`);
}

export const storage = selectDriver();
