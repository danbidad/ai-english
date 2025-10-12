module.exports = {
  verbose: true,
  testPathIgnorePatterns: [
    'node_modules',
    '.*\\_.*\\.test\\.ts$',  // ._로 시작하는 test.ts 파일 제외
  ],
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testEnvironment: 'jsdom',
};
