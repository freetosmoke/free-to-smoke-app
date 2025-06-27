export default {
  // Preset per ESM
  preset: 'ts-jest/presets/default-esm',
  
  // Ambiente di test
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  
  // Estensioni da trattare come ESM
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  
  // Moduli da trasformare
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext',
        target: 'es2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        jsx: 'react-jsx',
        lib: ['dom', 'dom.iterable', 'es6'],
      },
    }],
  },
  
  // Estensioni dei file da considerare
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Pattern per i file di test
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)'
  ],
  
  // Moduli da ignorare durante la trasformazione
  transformIgnorePatterns: [
    'node_modules/(?!(firebase|@firebase)/)',
  ],
  
  // Mapping dei moduli
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
};