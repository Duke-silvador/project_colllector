export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === "GET" || method === "HEAD") {
      if (url.pathname === "/") {
        const indexUrl = new URL("/index.html", url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }

      if (url.pathname === "/st-andrews") {
        const redirectUrl = new URL(url);
        redirectUrl.pathname = "/st-andrews/";
        return Response.redirect(redirectUrl.toString(), 308);
      }

      if (url.pathname === "/st-andrews/") {
        const indexUrl = new URL("/st-andrews/index.html", url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }

      if (
        url.pathname === "/travel/st-andrews.html" ||
        url.pathname === "/travel/st-andrews" ||
        url.pathname === "/travel/st-andrews/"
      ) {
        const redirectUrl = new URL(url);
        redirectUrl.pathname = "/st-andrews/";
        redirectUrl.hash = "";
        return Response.redirect(redirectUrl.toString(), 301);
      }

      if (url.pathname === "/edinburgh/places/adam-smith-grave.html") {
        const redirectUrl = new URL(url);
        redirectUrl.pathname = "/places/canongate-adam-smith.html";
        redirectUrl.hash = "";
        return Response.redirect(redirectUrl.toString(), 301);
      }

      const legacyPlaceRedirects = {
        "/edinburgh/places/city-chambers.html": "/places/royal-mile-city-chambers.html",
        "/edinburgh/places/mercat-cross.html": "/places/royal-mile-mercat-cross.html",
        "/places/canongate-overview.html": "/places/canongate.html",
        "/places/royal-mile-overview.html": "/places/royal-mile.html",
        "/places/canongate-horatius-bonar.html": "/places/canongate-kirkyard-stories.html",
        "/places/canongate-scrooge.html": "/places/canongate-kirkyard-stories.html",
        "/places/canongate-holyrood-end.html": "/places/canongate.html",
        "/scotland/places/melrose-abbey.html": "/scotland/places/melrose.html"
      };
      if (legacyPlaceRedirects[url.pathname]) {
        const redirectUrl = new URL(url);
        redirectUrl.pathname = legacyPlaceRedirects[url.pathname];
        redirectUrl.hash = "";
        return Response.redirect(redirectUrl.toString(), 301);
      }

      if (
        url.pathname === "/scotland" ||
        url.pathname === "/scotland/" ||
        url.pathname === "/scotland/index.html"
      ) {
        const redirectUrl = new URL(url);
        redirectUrl.pathname = "/edinburgh/places.html";
        redirectUrl.hash = "scotland";
        return Response.redirect(redirectUrl.toString(), 301);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
