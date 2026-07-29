/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
      clearMocks: true,
      resetMocks: false,
      restoreMocks: true,
      testTimeout: 30000,
      collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
        '!<rootDir>/src/**/*.d.ts',
        '!<rootDir>/src/server.ts',
        '!<rootDir>/src/index.ts',
        '!<rootDir>/src/__tests__/**',
        '!<rootDir>/src/scripts/**',
      ],
      coverageDirectory: '<rootDir>/coverage',
      coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],
    },
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/__tests__/middlewares/**/*.test.ts',
        '<rootDir>/src/__tests__/services/**/*.test.ts',
        '<rootDir>/src/__tests__/utils/**/*.test.ts',
        '<rootDir>/src/__tests__/validators/**/*.test.ts',
        '<rootDir>/src/__tests__/repositories/**/*.test.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
      clearMocks: true,
      resetMocks: true,
      restoreMocks: true,
    },
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: true,
};
