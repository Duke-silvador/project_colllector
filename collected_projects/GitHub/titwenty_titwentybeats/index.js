const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

function auth(request, env) {
  const h = request.headers.get("authorization") || "";
  return env.ADMIN_PASSWORD && h === `Bearer ${env.ADMIN_PASSWORD}`;
}

function clean(s, max = 120) {
  return String(s || "").trim().slice(0, max);
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization"
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      if (url.pathname === "/api/beats" && request.method === "GET") {
        const listed = await env.BEATS.list({ prefix: "beats/" });
        const beats = listed.objects.map(o => ({
          id: o.key.replace(/^beats\//, ""),
          name: o.customMetadata?.name || o.key.split("/").pop(),
          genre: o.customMetadata?.genre || "Beat",
          bpm: o.customMetadata?.bpm || "",
          key: o.customMetadata?.key || "",
          size: o.size,
          uploadedAt: o.uploaded.toISOString(),
          url: `/media/${encodeURIComponent(o.key)}`
        }));
        beats.sort((a,b) => b.uploadedAt.localeCompare(a.uploadedAt));
        return new Response(JSON.stringify({ beats }), {
          headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders() }
        });
      }

      if (url.pathname.startsWith("/media/") && request.method === "GET") {
        const key = decodeURIComponent(url.pathname.slice("/media/".length));
        if (!key.startsWith("beats/")) return new Response("Not found", {status:404});
        const object = await env.BEATS.get(key);
        if (!object) return new Response("Not found", {status:404});
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("cache-control", "public, max-age=31536000, immutable");
        headers.set("accept-ranges", "bytes");
        return new Response(object.body, { headers });
      }

      if (url.pathname === "/api/upload" && request.method === "POST") {
        if (!auth(request, env)) return json({error:"Неверный пароль администратора."}, 401);

        const name = clean(url.searchParams.get("name"), 100);
        const genre = clean(url.searchParams.get("genre"), 40);
        const bpm = clean(url.searchParams.get("bpm"), 10);
        const keyName = clean(url.searchParams.get("key"), 40);
        const filename = clean(url.searchParams.get("filename"), 100).replace(/[^a-zA-Z0-9._-]+/g, "-");
        const contentType = request.headers.get("content-type") || "audio/mpeg";

        if (!name) return json({error:"Название бита обязательно."}, 400);
        if (!request.body) return json({error:"Аудиофайл не передан."}, 400);

        const objectKey = `beats/${crypto.randomUUID()}-${filename || "beat.mp3"}`;
        await env.BEATS.put(objectKey, request.body, {
          httpMetadata: { contentType },
          customMetadata: { name, genre, bpm, key: keyName }
        });

        return json({ok:true, id: objectKey.replace("beats/","")});
      }

      if (url.pathname.startsWith("/api/beats/") && request.method === "DELETE") {
        if (!auth(request, env)) return json({error:"Неверный пароль администратора."}, 401);
        const id = decodeURIComponent(url.pathname.slice("/api/beats/".length));
        const key = `beats/${id}`;
        await env.BEATS.delete(key);
        return json({ok:true});
      }

      return env.ASSETS.fetch(request);
    } catch (e) {
      return json({error: e?.message || "Ошибка сервера."}, 500);
    }
  }
};
