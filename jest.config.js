module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
<<<<<<< HEAD
  collectCoverageFrom: [
    'dist/**/*.js',
    '!dist/**/*.d.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/dist/$1'
  },
  verbose: true
=======
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
>>>>>>> 0c05020 (Refactor tests to use Jest framework)
};
