/** What a request to GitHub asks for, without the names of the repository, issues, runs or files. */
export function kindOf(method: string, path: string): string {
  const [what = ""] = path.replace(/^repos\/[^/]+\/[^/]+\//, "").split("?");
  return `${method} ${what
    .replace(/^(contents|git\/[a-z]+)\/.+$/, "$1/…")
    .replace(/\/\d+(?=\/|$)/g, "/{n}")}`;
}

/** The run's requests: the total, then each kind, the most made first. */
export function summary(tally: Map<string, number>): string[] {
  const kinds = [...tally].sort(([, a], [, b]) => b - a);
  const total = kinds.reduce((sum, [, count]) => sum + count, 0);
  const width = String(kinds[0]?.[1] ?? 0).length + 2;
  return [
    `${total} requests to GitHub`,
    ...kinds.map(([kind, count]) => `${String(count).padStart(width)} ${kind}`),
  ];
}
