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
  return [{ role: "test", module: work.module }];
}
