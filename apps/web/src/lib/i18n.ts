// Multilingual config. English is the default and lives at the site root;
// the other locales are served under a /{locale}/ prefix (Russian excluded).

export const DEFAULT_LOCALE = "en";
export const LOCALES = ["en", "es", "de", "zh", "ja", "fr", "pt", "it", "nl", "pl"] as const;
export type Locale = (typeof LOCALES)[number];

/** Native display names for the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  zh: "中文",
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
    en: "Search projects…", es: "Buscar proyectos…", de: "Projekte suchen…", zh: "搜索项目…",
    ja: "プロジェクトを検索…", fr: "Rechercher des projets…", pt: "Buscar projetos…",
    it: "Cerca progetti…", nl: "Projecten zoeken…", pl: "Szukaj projektów…",
  },
  home: {
    en: "Home", es: "Inicio", de: "Start", zh: "首页", ja: "ホーム", fr: "Accueil",
    pt: "Início", it: "Home", nl: "Home", pl: "Strona główna",
  },
  languages: {
    en: "Languages", es: "Lenguajes", de: "Sprachen", zh: "语言", ja: "言語", fr: "Langages",
    pt: "Linguagens", it: "Linguaggi", nl: "Talen", pl: "Języki",
  },
  sections: {
    en: "Sections", es: "Secciones", de: "Bereiche", zh: "板块", ja: "セクション", fr: "Sections",
    pt: "Seções", it: "Sezioni", nl: "Secties", pl: "Sekcje",
  },
  hero_eyebrow: {
    en: "~/open-source", es: "~/open-source", de: "~/open-source", zh: "~/open-source",
    ja: "~/open-source", fr: "~/open-source", pt: "~/open-source",
    it: "~/open-source", nl: "~/open-source", pl: "~/open-source",
  },
  hero_title: {
    en: "Trending open-source tools, reviewed daily.",
    es: "Herramientas open source en tendencia, reseñadas cada día.",
    de: "Angesagte Open-Source-Tools, täglich vorgestellt.",
    zh: "热门开源工具，每日精选解读。",
    ja: "話題のオープンソースツールを、毎日レビュー。",
    fr: "Les outils open source du moment, présentés chaque jour.",
    pt: "Ferramentas open source em alta, analisadas todos os dias.",
    it: "Strumenti open source di tendenza, recensiti ogni giorno.",
    nl: "Trending open-source tools, elke dag besproken.",
    pl: "Popularne narzędzia open source, opisywane codziennie.",
  },
  browse_by_section: {
    en: "Browse by section", es: "Explorar por sección", de: "Nach Bereich stöbern", zh: "按板块浏览",
    ja: "セクションから探す", fr: "Parcourir par section", pt: "Explorar por seção",
    it: "Sfoglia per sezione", nl: "Bladeren per sectie", pl: "Przeglądaj według sekcji",
  },
  latest: {
    en: "Latest", es: "Recientes", de: "Neueste", zh: "最新", ja: "最新", fr: "Derniers",
    pt: "Recentes", it: "Recenti", nl: "Nieuwste", pl: "Najnowsze",
  },
  results_for: {
    en: "Results for", es: "Resultados para", de: "Ergebnisse für", zh: "搜索结果", ja: "検索結果",
    fr: "Résultats pour", pt: "Resultados para", it: "Risultati per", nl: "Resultaten voor",
    pl: "Wyniki dla",
  },
  clear: {
    en: "clear", es: "limpiar", de: "zurücksetzen", zh: "清除", ja: "クリア", fr: "effacer",
    pt: "limpar", it: "cancella", nl: "wissen", pl: "wyczyść",
  },
  no_projects: {
    en: "No projects published yet.", es: "Aún no hay proyectos publicados.",
    de: "Noch keine Projekte veröffentlicht.", zh: "暂无已发布的项目。", ja: "公開されたプロジェクトはまだありません。",
    fr: "Aucun projet publié pour le moment.", pt: "Ainda não há projetos publicados.",
    it: "Nessun progetto pubblicato ancora.", nl: "Nog geen projecten gepubliceerd.",
    pl: "Brak opublikowanych projektów.",
  },
  newer: {
    en: "Newer", es: "Más recientes", de: "Neuer", zh: "更新", ja: "新しい", fr: "Plus récents",
    pt: "Mais recentes", it: "Più recenti", nl: "Nieuwer", pl: "Nowsze",
  },
  older: {
    en: "Older", es: "Más antiguos", de: "Älter", zh: "更早", ja: "古い", fr: "Plus anciens",
    pt: "Mais antigos", it: "Meno recenti", nl: "Ouder", pl: "Starsze",
  },
  stars: {
    en: "stars", es: "estrellas", de: "Sterne", zh: "星标", ja: "スター", fr: "étoiles",
    pt: "estrelas", it: "stelle", nl: "sterren", pl: "gwiazdki",
  },
  tags: {
    en: "Tags", es: "Etiquetas", de: "Tags", zh: "标签", ja: "タグ", fr: "Tags",
    pt: "Tags", it: "Tag", nl: "Tags", pl: "Tagi",
  },
  related: {
    en: "Related projects", es: "Proyectos relacionados", de: "Ähnliche Projekte", zh: "相关项目",
    ja: "関連プロジェクト", fr: "Projets similaires", pt: "Projetos relacionados",
    it: "Progetti correlati", nl: "Gerelateerde projecten", pl: "Powiązane projekty",
  },
  projects_word: {
    en: "projects", es: "proyectos", de: "Projekte", zh: "个项目", ja: "プロジェクト", fr: "projets",
    pt: "projetos", it: "progetti", nl: "projecten", pl: "projektów",
  },
  languages_word: {
    en: "languages", es: "lenguajes", de: "Sprachen", zh: "种语言", ja: "言語", fr: "langages",
    pt: "linguagens", it: "linguaggi", nl: "talen", pl: "języków",
  },
  refreshed: {
    en: "refreshed continuously", es: "actualizado continuamente", de: "laufend aktualisiert",
    zh: "持续更新", ja: "随時更新", fr: "mis à jour en continu", pt: "atualizado continuamente",
    it: "aggiornato di continuo", nl: "doorlopend bijgewerkt", pl: "stale aktualizowane",
  },
  hero_blurb: {
    en: "Clear write-ups of the open-source projects developers are actually using — searchable, organized by language and field, and in your language.",
    es: "Reseñas claras de los proyectos open source que los desarrolladores realmente usan: con buscador, organizadas por lenguaje y área, y en tu idioma.",
    de: "Verständliche Vorstellungen der Open-Source-Projekte, die Entwickler wirklich nutzen – durchsuchbar, nach Sprache und Bereich sortiert und in deiner Sprache.",
    zh: "对开发者真正在用的开源项目进行清晰解读——可搜索、按语言和领域分类，并提供你的语言版本。",
    ja: "開発者が実際に使っているオープンソースプロジェクトを、わかりやすく解説。検索でき、言語や分野で整理され、あなたの言語で読めます。",
    fr: "Des présentations claires des projets open source que les développeurs utilisent vraiment — avec recherche, classées par langage et domaine, et dans votre langue.",
    pt: "Análises claras dos projetos open source que os desenvolvedores realmente usam — com busca, organizadas por linguagem e área, e no seu idioma.",
    it: "Schede chiare dei progetti open source che gli sviluppatori usano davvero — con ricerca, organizzate per linguaggio e ambito, e nella tua lingua.",
    nl: "Heldere besprekingen van de open-source projecten die ontwikkelaars echt gebruiken — doorzoekbaar, geordend op taal en vakgebied, en in jouw taal.",
    pl: "Przejrzyste omówienia projektów open source, których programiści naprawdę używają — z wyszukiwarką, uporządkowane według języka i dziedziny, i w Twoim języku.",
  },
  error: {
    en: "Error", es: "Error", de: "Fehler", zh: "错误", ja: "エラー", fr: "Erreur",
    pt: "Erro", it: "Errore", nl: "Fout", pl: "Błąd",
  },
  not_found_sub: {
    en: "We couldn't find that page.", es: "No encontramos esa página.",
    de: "Diese Seite wurde nicht gefunden.", zh: "找不到该页面。", ja: "ページが見つかりませんでした。",
    fr: "Page introuvable.", pt: "Não encontramos essa página.",
    it: "Pagina non trovata.", nl: "We konden die pagina niet vinden.",
    pl: "Nie znaleziono tej strony.",
  },
  back_home: {
    en: "Back home", es: "Volver al inicio", de: "Zur Startseite", zh: "返回首页", ja: "ホームに戻る",
    fr: "Retour à l'accueil", pt: "Voltar ao início", it: "Torna alla home",
    nl: "Terug naar home", pl: "Powrót na stronę główną",
  },
  language_label: {
    en: "Language", es: "Idioma", de: "Sprache", zh: "语言", ja: "言語", fr: "Langue",
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
  frontend: { zh: "前端", ja: "フロントエンド" },
  backend: { zh: "后端", ja: "バックエンド" },
  mobile: { es: "Móvil", zh: "移动端", ja: "モバイル", fr: "Mobile", pt: "Mobile", nl: "Mobiel", pl: "Mobilne" },
  devops: { zh: "DevOps", ja: "DevOps" },
  "ai-ml": { zh: "AI / ML", ja: "AI / ML" },
  gamedev: { zh: "游戏开发", ja: "ゲーム開発" },
  blockchain: { zh: "区块链", ja: "ブロックチェーン" },
  embedded: { es: "Embebidos", zh: "嵌入式", ja: "組み込み", fr: "Embarqué", pt: "Embarcados", pl: "Systemy wbudowane" },
  security: { es: "Seguridad", de: "Sicherheit", zh: "安全", ja: "セキュリティ", fr: "Sécurité", pt: "Segurança", it: "Sicurezza", nl: "Beveiliging", pl: "Bezpieczeństwo" },
};

export function sectionTitle(locale: string, slug: string, fallback: string): string {
  const loc = (isLocale(locale) ? locale : DEFAULT_LOCALE) as Locale;
  return SECTION_TITLES[slug]?.[loc] ?? fallback;
}

// Section descriptions per locale (English falls back to the sections.ts text).
const SECTION_DESCRIPTIONS: Record<string, Partial<Dict>> = {
  frontend: {
    es: "Frameworks de UI, herramientas de build y todo lo que corre en el navegador: React, Vue, Svelte, bundlers y servidores de desarrollo.",
    de: "UI-Frameworks, Build-Tools und alles, was im Browser läuft – React, Vue, Svelte, Bundler und Dev-Server.",
    zh: "UI 框架、构建工具，以及一切在浏览器中运行的东西——React、Vue、Svelte、打包工具和开发服务器。",
    ja: "UI フレームワーク、ビルドツール、そしてブラウザで動くものすべて — React、Vue、Svelte、バンドラー、開発サーバー。",
    fr: "Frameworks UI, outils de build et tout ce qui tourne dans le navigateur — React, Vue, Svelte, bundlers et serveurs de dev.",
    pt: "Frameworks de UI, ferramentas de build e tudo o que roda no navegador — React, Vue, Svelte, bundlers e servidores de desenvolvimento.",
    it: "Framework UI, strumenti di build e tutto ciò che gira nel browser — React, Vue, Svelte, bundler e dev server.",
    nl: "UI-frameworks, build-tools en alles wat in de browser draait — React, Vue, Svelte, bundlers en dev-servers.",
    pl: "Frameworki UI, narzędzia build i wszystko, co działa w przeglądarce — React, Vue, Svelte, bundlery i serwery deweloperskie.",
  },
  backend: {
    es: "Frameworks de servidor, APIs REST y GraphQL, bases de datos, caché y la infraestructura detrás de tu aplicación.",
    de: "Server-Frameworks, REST- und GraphQL-APIs, Datenbanken, Caching und die Infrastruktur hinter deiner App.",
    zh: "服务端框架、REST 和 GraphQL API、数据库、缓存，以及应用背后的基础设施。",
    ja: "サーバーフレームワーク、REST・GraphQL API、データベース、キャッシュ、そしてアプリを支えるインフラ。",
    fr: "Frameworks serveur, API REST et GraphQL, bases de données, cache et l'infrastructure derrière votre application.",
    pt: "Frameworks de servidor, APIs REST e GraphQL, bancos de dados, cache e a infraestrutura por trás do seu app.",
    it: "Framework server, API REST e GraphQL, database, caching e l'infrastruttura dietro la tua app.",
    nl: "Server-frameworks, REST- en GraphQL-API's, databases, caching en de infrastructuur achter je app.",
    pl: "Frameworki serwerowe, API REST i GraphQL, bazy danych, cache i infrastruktura stojąca za aplikacją.",
  },
  mobile: {
    es: "Desarrollo iOS y Android: SDK nativos, kits multiplataforma y librerías mobile-first.",
    de: "iOS- und Android-Entwicklung – native SDKs, plattformübergreifende Toolkits und Mobile-First-Bibliotheken.",
    zh: "iOS 和 Android 开发——原生 SDK、跨平台工具包和移动优先的库。",
    ja: "iOS・Android 開発 — ネイティブ SDK、クロスプラットフォームのツールキット、モバイルファーストのライブラリ。",
    fr: "Développement iOS et Android — SDK natifs, kits multiplateformes et bibliothèques mobile-first.",
    pt: "Desenvolvimento iOS e Android — SDKs nativos, kits multiplataforma e bibliotecas mobile-first.",
    it: "Sviluppo iOS e Android — SDK nativi, toolkit multipiattaforma e librerie mobile-first.",
    nl: "iOS- en Android-ontwikkeling — native SDK's, cross-platform toolkits en mobile-first libraries.",
    pl: "Programowanie na iOS i Android — natywne SDK, narzędzia cross-platform i biblioteki mobile-first.",
  },
  devops: {
    es: "Contenedores, orquestación, CI/CD, infraestructura como código y observabilidad para desplegar y operar software.",
    de: "Container, Orchestrierung, CI/CD, Infrastructure as Code und Observability zum Ausliefern und Betreiben von Software.",
    zh: "容器、编排、CI/CD、基础设施即代码，以及用于交付和运行软件的可观测性。",
    ja: "コンテナ、オーケストレーション、CI/CD、Infrastructure as Code、そしてソフトウェアの配信・運用のための可観測性。",
    fr: "Conteneurs, orchestration, CI/CD, infrastructure as code et observabilité pour livrer et exploiter vos logiciels.",
    pt: "Contêineres, orquestração, CI/CD, infraestrutura como código e observabilidade para entregar e operar software.",
    it: "Container, orchestrazione, CI/CD, infrastructure as code e osservabilità per rilasciare e gestire software.",
    nl: "Containers, orchestratie, CI/CD, infrastructure as code en observability om software uit te rollen en te draaien.",
    pl: "Kontenery, orkiestracja, CI/CD, infrastruktura jako kod i observability do wdrażania i utrzymania oprogramowania.",
  },
  "ai-ml": {
    es: "Frameworks de machine learning, herramientas de datos y las librerías que impulsan las aplicaciones de IA modernas.",
    de: "Machine-Learning-Frameworks, Daten-Tools und die Bibliotheken hinter modernen KI-Anwendungen.",
    zh: "机器学习框架、数据工具，以及驱动现代 AI 应用的库。",
    ja: "機械学習フレームワーク、データツール、そして最新の AI アプリを支えるライブラリ。",
    fr: "Frameworks de machine learning, outillage de données et les bibliothèques qui propulsent les applications d'IA modernes.",
    pt: "Frameworks de machine learning, ferramentas de dados e as bibliotecas que impulsionam as aplicações de IA modernas.",
    it: "Framework di machine learning, strumenti per i dati e le librerie dietro le moderne applicazioni di IA.",
    nl: "Machine-learning-frameworks, datatooling en de libraries achter moderne AI-toepassingen.",
    pl: "Frameworki uczenia maszynowego, narzędzia do danych i biblioteki napędzające nowoczesne aplikacje AI.",
  },
  gamedev: {
    es: "Motores de juego, gráficos, física y herramientas de assets para crear juegos 2D y 3D.",
    de: "Game-Engines, Grafik, Physik und Asset-Tools für die Entwicklung von 2D- und 3D-Spielen.",
    zh: "游戏引擎、图形、物理和资源工具，用于制作 2D 和 3D 游戏。",
    ja: "ゲームエンジン、グラフィックス、物理、アセットツール — 2D・3D ゲーム制作のために。",
    fr: "Moteurs de jeu, graphismes, physique et outils d'assets pour créer des jeux 2D et 3D.",
    pt: "Motores de jogo, gráficos, física e ferramentas de assets para criar jogos 2D e 3D.",
    it: "Motori di gioco, grafica, fisica e strumenti per gli asset per creare giochi 2D e 3D.",
    nl: "Game-engines, graphics, physics en asset-tools om 2D- en 3D-games te bouwen.",
    pl: "Silniki gier, grafika, fizyka i narzędzia do assetów do tworzenia gier 2D i 3D.",
  },
  blockchain: {
    es: "Contratos inteligentes, librerías Web3, DeFi y herramientas para aplicaciones descentralizadas.",
    de: "Smart Contracts, Web3-Bibliotheken, DeFi und Tools für dezentrale Anwendungen.",
    zh: "智能合约、Web3 库、DeFi，以及去中心化应用的工具。",
    ja: "スマートコントラクト、Web3 ライブラリ、DeFi、そして分散型アプリのツール。",
    fr: "Smart contracts, bibliothèques Web3, DeFi et outils pour applications décentralisées.",
    pt: "Contratos inteligentes, bibliotecas Web3, DeFi e ferramentas para aplicações descentralizadas.",
    it: "Smart contract, librerie Web3, DeFi e strumenti per applicazioni decentralizzate.",
    nl: "Smart contracts, Web3-libraries, DeFi en tools voor gedecentraliseerde applicaties.",
    pl: "Smart kontrakty, biblioteki Web3, DeFi i narzędzia do aplikacji zdecentralizowanych.",
  },
  embedded: {
    es: "Microcontroladores, IoT, drivers y sistemas en tiempo real cercanos al hardware.",
    de: "Mikrocontroller, IoT, Treiber und Echtzeitsysteme nah an der Hardware.",
    zh: "微控制器、物联网、驱动程序，以及贴近硬件的实时系统。",
    ja: "マイコン、IoT、ドライバー、そしてハードウェアに近いリアルタイムシステム。",
    fr: "Microcontrôleurs, IoT, pilotes et systèmes temps réel au plus près du matériel.",
    pt: "Microcontroladores, IoT, drivers e sistemas em tempo real próximos do hardware.",
    it: "Microcontrollori, IoT, driver e sistemi real-time vicini all'hardware.",
    nl: "Microcontrollers, IoT, drivers en realtime-systemen dicht op de hardware.",
    pl: "Mikrokontrolery, IoT, sterowniki i systemy czasu rzeczywistego blisko sprzętu.",
  },
  security: {
    es: "Pentesting, criptografía, seguridad de redes y herramientas para defensores e investigadores.",
    de: "Penetration Testing, Kryptografie, Netzwerksicherheit und Tools für Verteidiger und Forscher.",
    zh: "渗透测试、密码学、网络安全，以及面向防御者和研究人员的工具。",
    ja: "ペネトレーションテスト、暗号、ネットワークセキュリティ、そして防御側・研究者向けのツール。",
    fr: "Tests d'intrusion, cryptographie, sécurité réseau et outils pour défenseurs et chercheurs.",
    pt: "Pentest, criptografia, segurança de redes e ferramentas para defensores e pesquisadores.",
    it: "Penetration testing, crittografia, sicurezza di rete e strumenti per difensori e ricercatori.",
    nl: "Pentesting, cryptografie, netwerkbeveiliging en tools voor verdedigers en onderzoekers.",
    pl: "Testy penetracyjne, kryptografia, bezpieczeństwo sieci i narzędzia dla obrońców i badaczy.",
  },
};

export function sectionDesc(locale: string, slug: string, fallback: string): string {
  const loc = (isLocale(locale) ? locale : DEFAULT_LOCALE) as Locale;
  return SECTION_DESCRIPTIONS[slug]?.[loc] ?? fallback;
}
