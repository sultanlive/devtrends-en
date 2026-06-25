// Authentic GitHub language colors — the signature accent of the site.
// Keyed by the source URL slug ({language} segment). Fallback for unknowns.
const COLORS: Record<string, string> = {
  go: "#00ADD8",
  rust: "#DEA584",
  python: "#3572A5",
  typescript: "#3178C6",
  javascript: "#F1E05A",
  c: "#555555",
  cpp: "#F34B7D",
  "c++": "#F34B7D",
  csharp: "#178600",
  "c#": "#178600",
  java: "#B07219",
  kotlin: "#A97BFF",
  php: "#4F5D95",
  ruby: "#701516",
  swift: "#F05138",
  shell: "#89E051",
  bash: "#89E051",
  html: "#E34C26",
  css: "#563D7C",
  "jupyter-notebook": "#DA5B0B",
  jupyter: "#DA5B0B",
  dart: "#00B4AB",
  elixir: "#6E4A7E",
  haskell: "#5E5086",
  lua: "#000080",
  scala: "#C22D40",
  clojure: "#DB5855",
  zig: "#EC915C",
  nim: "#FFC200",
  ocaml: "#3BE133",
  vue: "#41B883",
  r: "#198CE7",
  julia: "#A270BA",
  perl: "#0298C3",
  "objective-c": "#438EFF",
  assembly: "#6E4C13",
  solidity: "#AA6746",
  dockerfile: "#384D54",
  makefile: "#427819",
  vim: "#199F4B",
};

const LABELS: Record<string, string> = {
  cpp: "C++",
  "c#": "C#",
  csharp: "C#",
  css: "CSS",
  html: "HTML",
  php: "PHP",
  "objective-c": "Objective-C",
  "jupyter-notebook": "Jupyter",
  ocaml: "OCaml",
  javascript: "JavaScript",
  typescript: "TypeScript",
};

export function langColor(slug: string): string {
  return COLORS[slug?.toLowerCase()] ?? "#8B95A5";
}

export function langLabel(slug: string): string {
  const key = slug?.toLowerCase() ?? "";
  if (LABELS[key]) return LABELS[key];
  // Title-case fallback: "objective-c" -> "Objective-c" handled above; default cap first letter.
  return key.charAt(0).toUpperCase() + key.slice(1);
}
