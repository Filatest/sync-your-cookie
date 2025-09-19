# Sync Your Cookie - Chrome Extension Development Guide

## Architecture Overview

This is a monorepo for a Chrome extension that syncs cookies to Cloudflare KV storage using pnpm workspaces and Turbo.

**Core Components:**
- `chrome-extension/` - Main extension with background scripts, manifest
- `pages/` - Extension UI pages (popup, options, sidepanel, content)
- `packages/` - Shared libraries (storage, shared utils, protobuf, UI components)

**Key Technology Stack:**
- React 18 + TypeScript
- Vite for building
- pnpm workspaces + Turbo for monorepo management
- Protobuf for cookie data encoding
- Chrome Extension Manifest V3

## Development Workflows

**Start Development:**
```bash
pnpm dev  # Starts all packages in watch mode
pnpm dev:firefox  # Firefox-specific build
```

**Build for Production:**
```bash
pnpm build  # Chrome build
pnpm build:firefox  # Firefox build
pnpm zip  # Creates distribution zip
```

**Package Structure:**
- All packages use `workspace:*` dependencies for internal linking
- Changes to `packages/shared` or `packages/storage` require full rebuild (`pnpm dev` restart)
- Extension builds to `dist/` directory at repo root

## Critical Patterns

**Storage System:**
- Uses `@sync-your-cookie/storage` with Chrome storage API abstraction
- Storage types: Local, Sync, Session, Managed (see `packages/storage/lib/base.ts`)
- Key storages: `cookieStorage`, `domainConfigStorage`, `settingsStorage`

**Cookie Sync Architecture:**
- Background script (`chrome-extension/lib/background/`) handles cookie monitoring
- Cloudflare KV integration via `packages/shared/lib/cloudflare/`
- Protobuf encoding for cookie data transmission
- Domain-specific auto-push/merge rules support

**Cross-Browser Support:**
- Firefox compatibility via manifest transformation (`packages/dev-utils/lib/manifest-parser/`)
- Environment variables: `__DEV__`, `__FIREFOX__` control build behavior
- Use `webextension-polyfill` for API compatibility

**HMR System:**
- Custom hot reload via `@sync-your-cookie/hmr` package
- WebSocket-based communication for development
- Supports extension reload without manual refresh

## Development Rules

- Always use workspace references (`workspace:*`) for internal packages
- Extension permissions defined in `chrome-extension/manifest.js`
- UI components shared via `@sync-your-cookie/ui` package
- Tailwind config centralized in `packages/tailwind-config/`
- TypeScript configs extend from `@sync-your-cookie/tsconfig`

## Key Files to Understand

- `turbo.json` - Build orchestration and caching rules
- `chrome-extension/manifest.js` - Extension permissions and structure
- `packages/shared/lib/cloudflare/` - Cloudflare KV API integration
- `chrome-extension/lib/background/` - Core extension logic
- `packages/storage/` - Chrome extension storage abstraction layer

## Extension Testing

Load unpacked extension from `dist/` directory after running `pnpm build`.
For development, use `pnpm dev` and reload extension at `chrome://extensions`.
