import { SandboxDriver } from "./driver.ts";

// Once for the whole run, before its parallel workers start: each worker's own set-up would race
// another's governance scenario.
try {
  process.loadEnvFile();
} catch {}
await SandboxDriver.resetGovernance();
