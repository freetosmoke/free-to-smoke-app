# Testing Setup Documentation

## ✅ Stato Aggiornato - Errori Risolti

**Data ultimo aggiornamento:** $(date +"%d/%m/%Y")

### Problemi Risolti
- ✅ Creati file mancanti: `ErrorBoundary.tsx`, `NotificationSystem.tsx`, `performance.ts`
- ✅ Risolti errori TypeScript ts(2307) per moduli mancanti
- ✅ Corretti errori ts(6133) per import React non utilizzati
- ✅ Risolto errore ts(7017) per globalThis nel setup dei test
- ✅ Tutti i test passano (12/12) ✨
- ✅ Nessun errore TypeScript rimanente

---

## Overview
This project now includes a comprehensive testing setup using Jest and React Testing Library for unit and integration testing of React components.

## Dependencies Installed

### Core Testing Dependencies
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom Jest matchers for DOM elements
- `@testing-library/user-event` - User interaction simulation
- `jest` - JavaScript testing framework
- `jest-environment-jsdom` - DOM environment for Jest
- `@types/jest` - TypeScript definitions for Jest
- `ts-jest` - TypeScript preprocessor for Jest
- `identity-obj-proxy` - CSS modules mock for testing

## Configuration Files

### `jest.config.js`
Main Jest configuration with:
- TypeScript/TSX support via `ts-jest`
- JSDOM test environment
- ES modules support
- Firebase modules transformation
- CSS modules mocking
- Coverage collection settings
- Global coverage thresholds (70%)

### `src/test/setup.ts`
Test environment setup including:
- Firebase mocking
- Crypto-js mocking
- Environment variables setup
- DOM API mocks (localStorage, sessionStorage, location)
- Console mocking for clean test output
- Test cleanup utilities

## Available Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (no watch)
npm run test:ci
```

## Test Structure

Tests are located in `src/components/__tests__/` directory:

### `Login.test.tsx`
- Component rendering tests
- Navigation functionality
- Form interaction tests
- Basic user interface validation

### `Toast.test.tsx`
- Toast notification rendering
- Different toast types (success, error, warning)
- Auto-close functionality
- User interaction (close button)
- Component lifecycle tests

## Mocking Strategy

### Firebase
- All Firebase modules are mocked in test setup
- Authentication functions return mock implementations
- Firestore operations are stubbed

### Utilities
- Security utilities (CSRF, hashing) are mocked
- Authentication validation functions are mocked
- Security logging is mocked to prevent actual logging during tests

### CSS and Assets
- CSS modules are mocked using `identity-obj-proxy`
- Static assets return their file paths

## Coverage Configuration

Coverage is collected from:
- `src/**/*.{ts,tsx}` files
- Excludes: test files, setup files, type definitions

Global thresholds:
- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%

## Best Practices

1. **Test Structure**: Follow AAA pattern (Arrange, Act, Assert)
2. **Mocking**: Mock external dependencies and focus on component behavior
3. **User-Centric**: Test from user perspective using accessible queries
4. **Cleanup**: Tests automatically clean up after each run
5. **Isolation**: Each test is independent and doesn't affect others

## Running Tests

### Development
```bash
# Start test watcher for active development
npm run test:watch
```

### CI/CD
```bash
# Run all tests with coverage in CI environment
npm run test:ci
```

### Coverage Analysis
```bash
# Generate detailed coverage report
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory with HTML reports available at `coverage/lcov-report/index.html`.

## Troubleshooting

### Common Issues

1. **Import.meta errors**: Resolved by configuring ES modules support in Jest
2. **JSX compilation**: Handled by ts-jest with proper TypeScript configuration
3. **CSS imports**: Mocked using identity-obj-proxy
4. **Firebase imports**: All Firebase modules are mocked in setup

### Adding New Tests

1. Create test files in `src/components/__tests__/`
2. Follow naming convention: `ComponentName.test.tsx`
3. Import required testing utilities
4. Mock external dependencies as needed
5. Focus on user behavior and component contracts

## Future Enhancements

- Add E2E testing with Playwright or Cypress
- Implement visual regression testing
- Add performance testing utilities
- Expand component test coverage
- Add integration tests for complex user flows