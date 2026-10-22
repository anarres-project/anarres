import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The test harness's own logic is tested too, beside it.
    include: ["packages/*/test/**/*.test.ts", "acceptance/**/*.test.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["packages/core/src/**/*.ts"],
      thresholds: { branches: 100, functions: 100, lines: 100, statements: 100 },
    },
  },
});
