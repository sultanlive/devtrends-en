import type { APIContext } from "astro";

/** Cloudflare bindings + vars from the request runtime (platformProxy in dev). */
export function getEnv(locals: App.Locals): CfEnv {
  // In dev/prod on Cloudflare, bindings live under locals.runtime.env.
  const env = (locals as { runtime?: { env?: Partial<CfEnv> } })?.runtime?.env ?? {};
  return {
    DB: env.DB as D1Database,
    BUCKET: env.BUCKET as R2Bucket,
    SITE_URL: env.SITE_URL ?? "",
    R2_PUBLIC_BASE: env.R2_PUBLIC_BASE ?? "",
    SITE_NAME: env.SITE_NAME ?? "DevTrends EN",
    TWITTER_HANDLE: env.TWITTER_HANDLE ?? "",
  };
}

/**
 * The canonical site origin. Uses the current request host by default (so it
 * "just works" in dev and prod); set SITE_URL to a real domain to pin the
 * canonical host (recommended in production to avoid the *.pages.dev preview
 * self-canonicalizing).
 */
export function siteUrl(locals: App.Locals, url: URL): string {
  const configured = getEnv(locals).SITE_URL.trim().replace(/\/$/, "");
  if (configured && configured !== "https://example.com") return configured;
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  // Behind Cloudflare the public origin is https; force it (the internal scheme can be http).
  return !isLocal && url.protocol === "http:" ? url.origin.replace(/^http:/, "https:") : url.origin;
}

/** Absolute canonical URL for a path, based on configured SITE_URL. */
export function canonical(siteUrl: string, path = "/"): string {
  return `${siteUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function articlePath(language: string, slug: string): string {
  return `/${language}/${slug}`;
}

export function formatDate(value: string | null, locale = "en"): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
  }
}

/** Standard edge-cache headers for SSR responses (Variant 1). */
export function setCacheHeaders(ctx: APIContext, sMaxAge = 300): void {
  ctx.response?.headers?.set(
    "Cache-Control",
    `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=86400`
  );
}
