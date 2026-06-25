/// <reference types="astro/client" />

interface CfEnv {
  DB: D1Database;
  BUCKET: R2Bucket;
  SITE_URL: string;
  R2_PUBLIC_BASE: string;
  SITE_NAME: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<CfEnv>;

declare namespace App {
  interface Locals extends Runtime {}
}
