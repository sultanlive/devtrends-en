-- devtrends-en: article store + parse log
-- Apply: wrangler d1 migrations apply devtrends --local   (or --remote)

CREATE TABLE IF NOT EXISTS articles (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  source_url       TEXT NOT NULL UNIQUE,
  source_lastmod   TEXT,                 -- from sitemap <lastmod>
  language         TEXT,                 -- {language} segment of source URL
  slug             TEXT UNIQUE,          -- mirrors project slug (ascii)
  title_en         TEXT,
  excerpt_en       TEXT,
  body_html_en     TEXT,
  meta_description TEXT,
  og_image         TEXT,                 -- R2 URL of hero image
  tags             TEXT,                 -- JSON array
  github_stars     INTEGER,
  source_date      TEXT,                 -- original publish date string, if present
  status           TEXT NOT NULL DEFAULT 'pending', -- pending|processing|published|failed
  attempts         INTEGER NOT NULL DEFAULT 0,
  error            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_pub    ON articles(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_lang   ON articles(language, status);

-- Lightweight run log for observability of cron ticks.
CREATE TABLE IF NOT EXISTS parse_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at      TEXT NOT NULL DEFAULT (datetime('now')),
  discovered  INTEGER NOT NULL DEFAULT 0,
  processed   INTEGER NOT NULL DEFAULT 0,
  failed      INTEGER NOT NULL DEFAULT 0,
  note        TEXT
);
