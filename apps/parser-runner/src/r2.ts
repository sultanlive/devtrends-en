// Stand-in for `env.BUCKET` (R2Bucket) that uploads via the wrangler CLI, using
// the same CLOUDFLARE_API_TOKEN as deploys (no separate R2 S3 keys needed).
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BUCKET = "devtrends-images";

export class R2Wrangler {
  async put(
    key: string,
    data: ArrayBuffer,
    opts?: { httpMetadata?: { contentType?: string } }
  ): Promise<void> {
    const ct = opts?.httpMetadata?.contentType ?? "application/octet-stream";
    const dir = mkdtempSync(join(tmpdir(), "r2-"));
    const file = join(dir, "obj");
    writeFileSync(file, Buffer.from(data));
    try {
      execFileSync(
        "npx",
        ["wrangler", "r2", "object", "put", `${BUCKET}/${key}`, "--file", file, "--content-type", ct, "--remote"],
        { stdio: "pipe", env: process.env }
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}
