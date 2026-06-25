export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;

  // vars (wrangler.toml [vars])
  SOURCE_BASE: string;
  USER_AGENT: string;
  BACKFILL_LIMIT: string;
  PROCESS_BATCH: string;
  OPENAI_BASE_URL: string;
  OPENAI_MODEL: string;
  R2_PUBLIC_BASE: string;
  SITE_URL: string;
  CF_ZONE_ID?: string;
  /** Comma-separated target locales to translate into (besides English). */
  TARGET_LOCALES?: string;

  // secrets (wrangler secret put / .dev.vars)
  OPENAI_API_KEY: string;
  CF_API_TOKEN?: string;
}

export interface ArticleRow {
  id: number;
  source_url: string;
  source_lastmod: string | null;
  language: string | null;
  slug: string | null;
  status: string;
  attempts: number;
}

/** Result of scraping one source article page. */
export interface ScrapedArticle {
  title: string;
  bodyHtml: string;
  tags: string[];
  githubStars: number | null;
  sourceDate: string | null;
}

/** Result of the LLM translation step. */
export interface TranslatedArticle {
  title: string;
  body_html: string;
  excerpt: string;
  meta_description: string;
}
