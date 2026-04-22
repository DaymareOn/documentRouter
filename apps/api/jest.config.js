module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@vibe-router/shared-types$': '<rootDir>/../../packages/shared-types/src',
    '^@vibe-router/shared-utils$': '<rootDir>/../../packages/shared-utils/src',
    '^@vibe-router/rule-engine$': '<rootDir>/../../packages/rule-engine/src',
    '^@vibe-router/ocr-sdk$': '<rootDir>/../../packages/ocr-sdk/src',
  },
};
