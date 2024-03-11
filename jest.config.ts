import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  verbose: true,
  transform: {
    ".ts": "ts-jest",
  },
  testPathIgnorePatterns: ["dist"],
  testEnvironment: "node",
};

export default config;
