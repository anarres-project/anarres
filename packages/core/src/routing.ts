export type AcceptedWork = {
  fromRole: string;
  module: string;
  verdict: string;
};

export type Task = {
  role: string;
  module: string;
};

export function route(work: AcceptedWork): Task[] {
  const role = work.fromRole === "architecture" ? "specification" : "test";
  return [{ role, module: work.module }];
}
