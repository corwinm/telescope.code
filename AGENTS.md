# Agent Guidelines for telescope-code

## About

A VSCode extension that provides a telescope-style search interface. Opens a virtual `.telescope` file where users can type queries to filter workspace search results, navigate matches with keyboard shortcuts, and select results to open files.

## Build/Lint/Test Commands

- Build: `pnpm run compile`
- Watch mode: `pnpm run watch`
- Type check: `pnpm run check-types`
- Lint: `pnpm run lint`
- Run all tests: `pnpm run test`
- Run single test: `pnpm run compile-tests && pnpm vscode-test --files=out/test/<test-file>.test.js`

## Code Style

- **Language**: TypeScript with strict mode enabled
- **Module system**: Node16 (ESM), target ES2022
- **Imports**: Use `import * as vscode from 'vscode'` for vscode API. Use camelCase/PascalCase for all imports.
- **Types**: Always use explicit types, leverage strict type-checking. Interfaces preferred over types for object shapes.
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Semicolons**: Required (enforced by ESLint)
- **Equality**: Use `===` and `!==` (eqeqeq rule)
- **Control flow**: Always use curly braces for blocks
- **Error handling**: No throw literals - throw proper Error objects
- **Package manager**: Use `pnpm` exclusively (version 10.18.3+)
