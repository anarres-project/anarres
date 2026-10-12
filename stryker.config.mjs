/** Mutation testing on packages/core: a surviving mutant is code no test demanded. */
export default {
  testRunner: "vitest",
  mutate: ["packages/core/src/**/*.ts"],
  reporters: ["clear-text", "progress", "html"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  thresholds: { high: 100, low: 100, break: 100 },
  tempDirName: ".stryker-tmp",
  // Stryker rewrites the tsconfig's `extends` and `references` paths for its sandbox using the
  // TypeScript 5 compiler API, which TypeScript 7 no longer provides. Our tsconfig has neither,
  // so naming a file that does not exist skips the rewrite; the real tsconfig is still copied.
  tsconfigFile: "stryker-skips-tsconfig-rewrite.json",
};
