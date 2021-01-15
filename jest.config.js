// eslint-disable-next-line
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./",
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts"],
  //setupFiles: ["./scripts/jest-setup.ts"],
  modulePathIgnorePatterns: [
    "@effect-ts/jest/.*/build",
    "@effect-ts/jest/.*/compiler-debug",
    "<rootDir>/_tmp",
  ],
  moduleNameMapper: {
    "@effect-ts/jest/(.*)$": "@effect-ts/jest/_traced/$1",
    "@effect-ts/jest$": "@effect-ts/jest/_traced",
    "@effect-ts/morphic/(.*)$": "@effect-ts/morphic/_traced/$1",
    "@effect-ts/morphic$": "@effect-ts/morphic/_traced",
    "@effect-ts/monocle/(.*)$": "@effect-ts/monocle/_traced/$1",
    "@effect-ts/monocle$": "@effect-ts/monocle/_traced",
    "@effect-ts/system/(.*)$": "@effect-ts/system/_traced/$1",
    "@effect-ts/system$": "@effect-ts/system/_traced",
    "@effect-ts/core/(.*)$": "@effect-ts/core/_traced/$1",
    "@effect-ts/core$": "@effect-ts/core/_traced",
    "@effect-ts/node/(.*)$": "@effect-ts/node/_traced/$1",
    "@effect-ts/node$": "@effect-ts/node/_traced",
  },
  verbose: true,
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.jest.json",
      compiler: "ttypescript",
    },
  },
};
