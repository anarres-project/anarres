import type { Role } from "./roles.ts";

export type AcceptedWork = {
  fromRole: string;
  module: string;
  verdict: string;
};

export type Task = {
  role: Role;
  module: string;
};

const MODULE_PIPELINE: readonly Role[] = [
  "architecture",
  "specification",
  "test",
  "coding",
  "reviewer",
  "security-and-quality",
];

export function route(work: AcceptedWork): Task[] {
  const next = (MODULE_PIPELINE as readonly string[]).indexOf(work.fromRole) + 1;
  return MODULE_PIPELINE.slice(next, next + 1).map((role) => ({ role, module: work.module }));
}
