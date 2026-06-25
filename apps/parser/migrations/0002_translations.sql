-- Per-locale translations of articles. English lives in `articles` itself;
-- this table holds the other locales (es, de, ja, fr, pt, it, nl, pl).
CREATE TABLE IF NOT EXISTS article_translations (
  article_id       INTEGER NOT NULL,
  locale           TEXT NOT NULL,
  title            TEXT,
  excerpt          TEXT,
  body_html        TEXT,
  meta_description TEXT,
  updated_at       TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (article_id, locale),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_article_translations_locale ON article_translations(locale);
