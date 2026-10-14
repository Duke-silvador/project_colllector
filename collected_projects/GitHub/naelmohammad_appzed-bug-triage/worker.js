/**
 * AppZed bug-triage (managed=true). Analyze a bug report plus code excerpt,
 * return reproduction steps and the suspect area. Stateless.
 * Bindings: AI.
 */
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, solution: "bug-triage" });
    }
    if (request.method === "POST" && url.pathname === "/triage") {
      const body = await request.json().catch(() => null);
      if (!body || !body.report) return bad("bug report is required.");
      let out;
      try {
        out = await env.AI.run(MODEL, {
          messages: [
            { role: "system", content: "You triage bug reports. Reply in three sections: REPRO (numbered steps to reproduce, inferring reasonable ones), SUSPECT AREA (file/function pattern and why), QUESTIONS (up to 3 things to ask the reporter). Be concrete, no hedging preamble." },
            { role: "user", content: `Report: ${String(body.report).slice(0, 4000)}\n\nCode excerpt: ${(body.code || "none provided").slice(0, 8000)}` },
          ],
          max_tokens: 768,
        });
      } catch (err) {
        return Response.json({ error: String((err && err.message) || err) }, { status: 502 });
      }
      return Response.json({ triage: out.response || "" }, { status: 201 });
    }
    return new Response("Not found", { status: 404 });
  },
};

function bad(message) {
  return Response.json({ error: message }, { status: 400 });
}
