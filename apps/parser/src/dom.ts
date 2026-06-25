// Minimal typed surface over linkedom nodes (no DOM lib in the Workers tsconfig).

export interface El {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  remove(): void;
  closest(sel: string): El | null;
  querySelector(sel: string): El | null;
  querySelectorAll(sel: string): Iterable<El>;
  readonly textContent: string | null;
  innerHTML: string;
}

export interface Doc {
  querySelector(sel: string): El | null;
  querySelectorAll(sel: string): Iterable<El>;
  getElementById(id: string): El | null;
}

export function qsa(root: { querySelectorAll(s: string): Iterable<unknown> }, sel: string): El[] {
  return Array.from(root.querySelectorAll(sel)) as El[];
}

export function qs(root: { querySelector(s: string): unknown }, sel: string): El | null {
  return (root.querySelector(sel) ?? null) as El | null;
}
