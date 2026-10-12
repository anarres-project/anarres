export type AcceptedWork = {
  project: string;
  module: string;
  role: string;
  member: string;
  verdict: string;
};

export type ReadyTask = {
  role: string;
  module: string;
};

/** How the DSL reaches Anarres. Each driver invokes the system its own way. */
export interface Driver {
  createProject(project: string, modules: string[]): Promise<void>;
  acceptWork(work: AcceptedWork): Promise<void>;
  readyTasks(project: string): Promise<ReadyTask[]>;
}
