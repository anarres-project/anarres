/** The few GitHub REST calls the sandbox driver makes to see what members would see. */
export class GitHubApi {
  constructor(private readonly token: string) {}

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; data: T }> {
    const response = await fetch(`https://api.github.com/${path}`, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${this.token}`,
        "x-github-api-version": "2022-11-28",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, data: (text ? JSON.parse(text) : undefined) as T };
  }

  /** Like `request`, but any status outside 2xx is an error. */
  async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const { status, data } = await this.request<T>(method, path, body);
    if (status < 200 || status >= 300) {
      throw new Error(`GitHub ${method} ${path} answered ${status}: ${JSON.stringify(data)}`);
    }
    return data;
  }
}
