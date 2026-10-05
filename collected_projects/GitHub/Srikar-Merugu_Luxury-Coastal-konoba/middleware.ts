import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, type Locale } from "./lib/i18n";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin")) return refreshAdminSession(req);

  // "/" → best locale from Accept-Language (hr, de, else en).
  const header = req.headers.get("accept-language") ?? "";
  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase())
    .find(isLocale) as Locale | undefined;
  return NextResponse.redirect(new URL(`/${preferred ?? defaultLocale}`, req.url), 307);
}

/** Keeps the Supabase auth cookie fresh, since server components can't write cookies. */
async function refreshAdminSession(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let res = NextResponse.next({ request: req });
  if (!url || !key) return res;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return res;
}

export const config = { matcher: ["/", "/admin/:path*"] };
