// Multilingual config. English is the default and lives at the site root;
// the other locales are served under a /{locale}/ prefix (Russian excluded).

export const DEFAULT_LOCALE = "en";
export const LOCALES = ["en", "es", "de", "ja", "fr", "pt", "it", "nl", "pl"] as const;
export type Locale = (typeof LOCALES)[number];

/** Native display names for the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  ja: "日本語",
  fr: "Français",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
};

export function isLocale(x: string | undefined): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}

/** Prefix a root-relative path with the locale (no prefix for the default). */
export function localeHref(locale: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return p;
  return p === "/" ? `/${locale}` : `/${locale}${p}`;
}

type Dict = Record<Locale, string>;

const UI: Record<string, Dict> = {
  search_placeholder: {
    en: "Search projects…", es: "Buscar proyectos…", de: "Projekte suchen…",
    ja: "プロジェクトを検索…", fr: "Rechercher des projets…", pt: "Buscar projetos…",
    it: "Cerca progetti…", nl: "Projecten zoeken…", pl: "Szukaj projektów…",
  },
  home: {
    en: "Home", es: "Inicio", de: "Start", ja: "ホーム", fr: "Accueil",
    pt: "Início", it: "Home", nl: "Home", pl: "Strona główna",
  },
  languages: {
    en: "Languages", es: "Lenguajes", de: "Sprachen", ja: "言語", fr: "Langages",
    pt: "Linguagens", it: "Linguaggi", nl: "Talen", pl: "Języki",
  },
  sections: {
    en: "Sections", es: "Secciones", de: "Bereiche", ja: "セクション", fr: "Sections",
    pt: "Seções", it: "Sezioni", nl: "Secties", pl: "Sekcje",
  },
  hero_eyebrow: {
    en: "~/open-source", es: "~/open-source", de: "~/open-source",
    ja: "~/open-source", fr: "~/open-source", pt: "~/open-source",
    it: "~/open-source", nl: "~/open-source", pl: "~/open-source",
  },
  hero_title: {
    en: "Trending open-source tools, reviewed daily.",
    es: "Herramientas open source en tendencia, reseñadas cada día.",
    de: "Angesagte Open-Source-Tools, täglich vorgestellt.",
    ja: "話題のオープンソースツールを、毎日レビュー。",
    fr: "Les outils open source du moment, présentés chaque jour.",
    pt: "Ferramentas open source em alta, analisadas todos os dias.",
    it: "Strumenti open source di tendenza, recensiti ogni giorno.",
    nl: "Trending open-source tools, elke dag besproken.",
    pl: "Popularne narzędzia open source, opisywane codziennie.",
  },
  browse_by_section: {
    en: "Browse by section", es: "Explorar por sección", de: "Nach Bereich stöbern",
    ja: "セクションから探す", fr: "Parcourir par section", pt: "Explorar por seção",
    it: "Sfoglia per sezione", nl: "Bladeren per sectie", pl: "Przeglądaj według sekcji",
  },
  latest: {
    en: "Latest", es: "Recientes", de: "Neueste", ja: "最新", fr: "Derniers",
    pt: "Recentes", it: "Recenti", nl: "Nieuwste", pl: "Najnowsze",
  },
  results_for: {
    en: "Results for", es: "Resultados para", de: "Ergebnisse für", ja: "検索結果",
    fr: "Résultats pour", pt: "Resultados para", it: "Risultati per", nl: "Resultaten voor",
    pl: "Wyniki dla",
  },
  clear: {
    en: "clear", es: "limpiar", de: "zurücksetzen", ja: "クリア", fr: "effacer",
    pt: "limpar", it: "cancella", nl: "wissen", pl: "wyczyść",
  },
  no_projects: {
    en: "No projects published yet.", es: "Aún no hay proyectos publicados.",
    de: "Noch keine Projekte veröffentlicht.", ja: "公開されたプロジェクトはまだありません。",
    fr: "Aucun projet publié pour le moment.", pt: "Ainda não há projetos publicados.",
    it: "Nessun progetto pubblicato ancora.", nl: "Nog geen projecten gepubliceerd.",
    pl: "Brak opublikowanych projektów.",
  },
  newer: {
    en: "Newer", es: "Más recientes", de: "Neuer", ja: "新しい", fr: "Plus récents",
    pt: "Mais recentes", it: "Più recenti", nl: "Nieuwer", pl: "Nowsze",
  },
  older: {
    en: "Older", es: "Más antiguos", de: "Älter", ja: "古い", fr: "Plus anciens",
    pt: "Mais antigos", it: "Meno recenti", nl: "Ouder", pl: "Starsze",
  },
  stars: {
    en: "stars", es: "estrellas", de: "Sterne", ja: "スター", fr: "étoiles",
    pt: "estrelas", it: "stelle", nl: "sterren", pl: "gwiazdki",
  },
  tags: {
    en: "Tags", es: "Etiquetas", de: "Tags", ja: "タグ", fr: "Tags",
    pt: "Tags", it: "Tag", nl: "Tags", pl: "Tagi",
  },
  related: {
    en: "Related projects", es: "Proyectos relacionados", de: "Ähnliche Projekte",
    ja: "関連プロジェクト", fr: "Projets similaires", pt: "Projetos relacionados",
    it: "Progetti correlati", nl: "Gerelateerde projecten", pl: "Powiązane projekty",
  },
  projects_word: {
    en: "projects", es: "proyectos", de: "Projekte", ja: "プロジェクト", fr: "projets",
    pt: "projetos", it: "progetti", nl: "projecten", pl: "projektów",
  },
  languages_word: {
    en: "languages", es: "lenguajes", de: "Sprachen", ja: "言語", fr: "langages",
    pt: "linguagens", it: "linguaggi", nl: "talen", pl: "języków",
  },
  refreshed: {
    en: "refreshed continuously", es: "actualizado continuamente", de: "laufend aktualisiert",
    ja: "随時更新", fr: "mis à jour en continu", pt: "atualizado continuamente",
    it: "aggiornato di continuo", nl: "doorlopend bijgewerkt", pl: "stale aktualizowane",
  },
  hero_blurb: {
    en: "Clear write-ups of the open-source projects developers are actually using — searchable, organized by language and field, and in your language.",
    es: "Reseñas claras de los proyectos open source que los desarrolladores realmente usan: con buscador, organizadas por lenguaje y área, y en tu idioma.",
    de: "Verständliche Vorstellungen der Open-Source-Projekte, die Entwickler wirklich nutzen – durchsuchbar, nach Sprache und Bereich sortiert und in deiner Sprache.",
    ja: "開発者が実際に使っているオープンソースプロジェクトを、わかりやすく解説。検索でき、言語や分野で整理され、あなたの言語で読めます。",
    fr: "Des présentations claires des projets open source que les développeurs utilisent vraiment — avec recherche, classées par langage et domaine, et dans votre langue.",
    pt: "Análises claras dos projetos open source que os desenvolvedores realmente usam — com busca, organizadas por linguagem e área, e no seu idioma.",
    it: "Schede chiare dei progetti open source che gli sviluppatori usano davvero — con ricerca, organizzate per linguaggio e ambito, e nella tua lingua.",
    nl: "Heldere besprekingen van de open-source projecten die ontwikkelaars echt gebruiken — doorzoekbaar, geordend op taal en vakgebied, en in jouw taal.",
    pl: "Przejrzyste omówienia projektów open source, których programiści naprawdę używają — z wyszukiwarką, uporządkowane według języka i dziedziny, i w Twoim języku.",
  },
  error: {
    en: "Error", es: "Error", de: "Fehler", ja: "エラー", fr: "Erreur",
    pt: "Erro", it: "Errore", nl: "Fout", pl: "Błąd",
  },
  not_found_sub: {
    en: "We couldn't find that page.", es: "No encontramos esa página.",
    de: "Diese Seite wurde nicht gefunden.", ja: "ページが見つかりませんでした。",
    fr: "Page introuvable.", pt: "Não encontramos essa página.",
    it: "Pagina non trovata.", nl: "We konden die pagina niet vinden.",
    pl: "Nie znaleziono tej strony.",
  },
  back_home: {
    en: "Back home", es: "Volver al inicio", de: "Zur Startseite", ja: "ホームに戻る",
    fr: "Retour à l'accueil", pt: "Voltar ao início", it: "Torna alla home",
    nl: "Terug naar home", pl: "Powrót na stronę główną",
  },
  language_label: {
    en: "Language", es: "Idioma", de: "Sprache", ja: "言語", fr: "Langue",
    pt: "Idioma", it: "Lingua", nl: "Taal", pl: "Język",
  },
};

/** Translate a UI key with optional {param} interpolation. */
export function t(locale: string, key: string, params?: Record<string, string | number>): string {
  const loc = (isLocale(locale) ? locale : DEFAULT_LOCALE) as Locale;
  let s = UI[key]?.[loc] ?? UI[key]?.en ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
}

// Section titles per locale (descriptions fall back to the English config text).
const SECTION_TITLES: Record<string, Partial<Dict>> = {
  frontend: { ja: "フロントエンド" },
  backend: { ja: "バックエンド" },
  mobile: { es: "Móvil", ja: "モバイル", fr: "Mobile", pt: "Mobile", nl: "Mobiel", pl: "Mobilne" },
  devops: { ja: "DevOps" },
  "ai-ml": { ja: "AI / ML" },
  gamedev: { ja: "ゲーム開発" },
  blockchain: { ja: "ブロックチェーン" },
  embedded: { es: "Embebidos", ja: "組み込み", fr: "Embarqué", pt: "Embarcados", pl: "Systemy wbudowane" },
  security: { es: "Seguridad", de: "Sicherheit", ja: "セキュリティ", fr: "Sécurité", pt: "Segurança", it: "Sicurezza", nl: "Beveiliging", pl: "Bezpieczeństwo" },
};

export function sectionTitle(locale: string, slug: string, fallback: string): string {
  const loc = (isLocale(locale) ? locale : DEFAULT_LOCALE) as Locale;
  return SECTION_TITLES[slug]?.[loc] ?? fallback;
}
