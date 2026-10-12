/**
 * Makes each scenario's names unique, so scenarios never collide when they share a system
 * (such as the GitHub sandbox). "ledger" becomes "ledger-s3".
 */
export class Aliases {
  constructor(private readonly suffix: string) {}

  of(name: string): string {
    return `${name}-${this.suffix}`;
  }
}
