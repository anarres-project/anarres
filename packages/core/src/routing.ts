export type AcceptedWork = {
  fromRole: string;
  module: string;
  verdict: string;
};

export type Task = {
  role: string;
  module: string;
};

const MODULE_PIPELINE = ["architecture", "specification", "test", "coding"];

export function route(work: AcceptedWork): Task[] {
  const next = MODULE_PIPELINE.indexOf(work.fromRole) + 1;
  return MODULE_PIPELINE.slice(next, next + 1).map((role) => ({ role, module: work.module }));
}
