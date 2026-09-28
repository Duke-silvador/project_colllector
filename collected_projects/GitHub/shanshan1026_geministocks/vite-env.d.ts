/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENROUTER_API_KEY: string
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_NEON_CONNECTION_STRING: string
  readonly MODE: string
  readonly PROD: boolean
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
