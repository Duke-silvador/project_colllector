declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    APP_ORIGIN?: string;
    QLOO_MODE?: string;
    QLOO_API_KEY?: string;
    QLOO_BASE_URL?: string;
    QLOO_PUBLIC_LIVE_ENABLED?: string;
    QLOO_DAILY_REQUEST_LIMIT?: string;
    QLOO_MINUTE_REQUEST_LIMIT?: string;
    BUCKET?: R2Bucket;
  }
}
