import type { NextConfig } from "next";
import { derivation, factsVersion } from "./scripts/derivation.mjs";

// BP-001's own file (`code:` glob `next.config.ts`). WO-001 step 3 and the
// file plan: typed config; `serverExternalPackages` for the Supabase admin
// client; no `ignoreBuildErrors` and no `ignoreDuringBuilds` — a build that
// hides a type error defeats the pins-first CI order BP-005's NFR budget
// states, so neither key is set (their default is `false`).
// ADR-002 / REQ-001 c8 (issue #13): "Every response from /scan/{domain} —
// report, removal line, malformed line, refusal, cooldown, progress —
// carries `noindex` as both a meta tag and an `X-Robots-Tag` header, and
// no sitemap the product publishes names a report address." The meta half
// is the route's own `metadata` export; this is the header half, declared
// here rather than in `src/middleware.ts` so the authorisation allow-list
// keeps one job. It applies to every response the path produces, the 308
// included, which is what "every response" asks for.
//
// One value, now on two sources: `/veto/:token` (issue #144) carries a
// single-use stop token in its path, and an indexed one is a stop link
// published to everyone. Hence the name is the header's, not the report's.
const NOINDEX = "noindex, nofollow" as const;

// ── Issue #331: the response headers every ReachKit-served byte carries ──
//
// Four of the five headers this issue names are the same on every request,
// so they are declared here, where they reach *everything* the deployment
// serves — the routed responses, the `/_next/static` bundles and the
// favicon alike. `src/middleware.ts` never sees those last two (its
// `matcher` excludes them on Next's own recommendation), which is why this
// is the right home for a fixed header and the wrong one for a per-request
// value.
//
// **The fifth, the CSP, is not here, and cannot be.** The issue asks for a
// *nonce-based* policy: a fresh, unpredictable `'nonce-…'` per request, so
// that the only inline script a browser will run is the one this server
// emitted. `headers()` is evaluated once, at build, for every request
// alike, so a nonce written here would be a constant — which is to say not
// a nonce at all. Next's own guide puts it in the proxy for exactly this
// reason ("Proxy enables you to add headers and generate nonces before the
// page renders", `01-app/02-guides/content-security-policy.md`), and the
// renderer reads the nonce back off the *request* header the proxy set
// (`next/dist/server/app-render/app-render.js`, `parseRequestHeaders`).
// So `src/middleware.ts` owns the CSP — including its `frame-ancestors` —
// and this file owns `X-Frame-Options`, that directive's legacy twin,
// which does reach the static bundles.
//
// Every value below is internal (rule 1.1): a header's wire name and its
// attributes. None is a sentence anybody reads, so none is a copy key.

/** Two years, subdomains included. `preload` is deliberately absent: the
 *  browser preload list is a one-way door owned by whoever runs the
 *  domain, not by this file, and the header earns its keeping without it.
 *  The value is written once, here, and read nowhere else — the same
 *  grounds `src/middleware.ts`'s own read deadline is a local constant
 *  rather than a pin. */
const HSTS = "max-age=63072000; includeSubDomains" as const;

/** The origin, never the path, and nothing at all cross-scheme. This is
 *  also what a customer's own `content.` host sends when a visitor clicks
 *  out of their published page. */
const REFERRER_POLICY = "strict-origin-when-cross-origin" as const;

/** Every powerful feature this product does not use, denied to itself and
 *  to anything it embeds. The list is the recognised feature names only —
 *  an unrecognised one is not stricter, it is a console error on every
 *  route. */
const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "camera=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

/** The headers every response carries, whatever it is. Exported so
 *  `tests/app/security-headers.test.ts` asserts the set itself rather than
 *  a paraphrase of it. */
export const SECURITY_HEADERS: readonly { key: string; value: string }[] = [
  { key: "Strict-Transport-Security", value: HSTS },
  { key: "Referrer-Policy", value: REFERRER_POLICY },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  // `frame-ancestors 'none'`'s twin, for the responses the CSP does not
  // reach and for anything that still reads only this one.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
];

const nextConfig: NextConfig = {
  // The Tailwind compiler and its native addons are required as they ship, never bundled: the
  // hosted `/style.css` route runs them once, during `next build`.
  serverExternalPackages: ["@supabase/supabase-js", "@tailwindcss/postcss", "@tailwindcss/oxide", "lightningcss"],
  // Issue 1481: the deployment's derivation — a fingerprint of the files the
  // re-score reads a scan with. The `scan/rescore` tick asks for a dry run
  // and an apply by itself when it finds no run at this value. The facts
  // version keys the stored page facts it scores from (`fetch_facts`).
  env: { RK_DERIVATION: derivation(), RK_FACTS_VERSION: factsVersion() },
  // Issue 1514: each route group has its own root layout, so a hosted page
  // can state its site's language on `<html>`. An address no route matches
  // then has no root layout to render in; `src/app/global-not-found.tsx` is
  // Next's file for exactly that case.
  experimental: { globalNotFound: true },
  // Issue #782: the waiting screen is gone — a founder waits for their pass
  // inside the app, where the side panel says which step is running. An old
  // tab or a saved link still reaches the app.
  async redirects() {
    return [{ source: "/setup/waiting", destination: "/app", permanent: false }];
  },
  async headers() {
    return [
      // Issue #331: every path, every response.
      {
        source: "/(.*)",
        headers: [...SECURITY_HEADERS],
      },
      {
        source: "/scan/:domain",
        headers: [{ key: "X-Robots-Tag", value: NOINDEX }],
      },
      // Issue #144: the veto link's address, on the same footing and for a
      // stricter reason — an indexed `/veto/{token}` is a stop link
      // published to everyone who can read a search result. The meta half
      // is the route's own `metadata` export.
      {
        source: "/veto/:token",
        headers: [{ key: "X-Robots-Tag", value: NOINDEX }],
      },
    ];
  },
};

export default nextConfig;
