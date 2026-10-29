import { type Allowance, type Download, downloadGitHub, type requestGitHub } from "./request.ts";

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

/**
 * Passes each request and download on, counting it by kind: how a run says what it asked GitHub
 * for. A download counts against the allowance too.
 */
export function countingRequests(
  request: typeof requestGitHub,
  download: Download = downloadGitHub,
): {
  request: typeof requestGitHub;
  download: Download;
  tally: Map<string, number>;
  lastAllowance: () => Allowance | undefined;
} {
  const tally = new Map<string, number>();
  let last: Allowance | undefined;
  const count = (method: string, path: string) => {
    const kind = kindOf(method, path);
    tally.set(kind, (tally.get(kind) ?? 0) + 1);
  };
  return {
    lastAllowance: () => last,
    download: (token, path) => {
      count("GET", path);
      return download(token, path);
    },
    request: async <T>(
      token: string,
      method: string,
      path: string,
      body?: unknown,
      options?: Parameters<typeof requestGitHub>[4],
    ) => {
      count(method, path);
      const answer = await request<T>(token, method, path, body, options);
      last = answer.allowance ?? last;
      return answer;
    },
    tally,
  };
}

/** An allowance in a run's log. */
export function allowanceSaid({ resource, used, limit, reset }: Allowance): string {
  const resets = new Date(reset * 1000).toISOString().slice(11, 16);
  return `${resource} ${used} of ${limit} used (resets ${resets} UTC)`;
}
