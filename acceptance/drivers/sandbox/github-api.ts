import { countedRequest } from "./request-tally.ts";

/** The few GitHub REST calls the sandbox driver makes to see what members would see. */
export class GitHubApi {
  constructor(private readonly token: string) {}

  request<T>(method: string, path: string, body?: unknown, options?: { repeatable?: boolean }) {
    return countedRequest<T>(this.token, method, path, body, options);
  }

  /** Like `request`, but any status outside 2xx is an error. */
  async call<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { repeatable?: boolean },
  ): Promise<T> {
    const { status, data } = await this.request<T>(method, path, body, options);
    if (status < 200 || status >= 300) {
      throw new Error(`GitHub ${method} ${path} answered ${status}: ${JSON.stringify(data)}`);
    }
    return data;
  }
}
