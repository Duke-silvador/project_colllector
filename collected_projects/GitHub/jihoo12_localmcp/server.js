import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";
const ROOT = path.resolve(process.env.CARGO_MCP_ROOT ?? process.cwd());
const MAX_OUTPUT = Number(process.env.CARGO_MCP_MAX_OUTPUT ?? 200_000);
const MAX_FILE = Number(process.env.CARGO_MCP_MAX_FILE ?? 1_000_000);
const TIMEOUT_MS = Number(process.env.CARGO_MCP_TIMEOUT_MS ?? 120_000);

function insideRoot(relative = ".") {
  if (path.isAbsolute(relative)) throw new Error("Absolute paths are not allowed");
  const resolved = path.resolve(ROOT, relative);
  const rel = path.relative(ROOT, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("Path escapes CARGO_MCP_ROOT");
  return resolved;
}

function textResult(text, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

async function runCargo(args, cwdRel = ".") {
  const cwd = insideRoot(cwdRel);
  const stat = await fs.stat(cwd);
  if (!stat.isDirectory()) throw new Error("cwd is not a directory");

  return await new Promise((resolve) => {
    const child = spawn("cargo", args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: { ...process.env, CARGO_TERM_COLOR: "never" },
    });
    let stdout = "";
    let stderr = "";
    let truncated = false;
    const append = (which, chunk) => {
      let s = chunk.toString("utf8");
      const current = which === "out" ? stdout : stderr;
      if (current.length >= MAX_OUTPUT) { truncated = true; return; }
      s = s.slice(0, MAX_OUTPUT - current.length);
      if (which === "out") stdout += s; else stderr += s;
      if (s.length < chunk.toString("utf8").length) truncated = true;
    };
    child.stdout.on("data", c => append("out", c));
    child.stderr.on("data", c => append("err", c));
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, TIMEOUT_MS);
    child.on("error", (err) => { clearTimeout(timer); resolve({ code: null, stdout, stderr: `${stderr}\n${err.message}`, timedOut, truncated }); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut, truncated }); });
  });
}

function formatRun(command, r) {
  return [
    `$ ${command}`,
    `exit_code: ${r.code ?? "null"}${r.timedOut ? " (timeout)" : ""}${r.truncated ? " (output truncated)" : ""}`,
    r.stdout ? `\nstdout:\n${r.stdout}` : "",
    r.stderr ? `\nstderr:\n${r.stderr}` : "",
  ].join("\n");
}

const cwdSchema = { cwd: z.string().default(".").describe("Workspace-relative directory containing Cargo.toml") };

function makeServer() {
  const server = new McpServer(
    { name: "cargo-desktop", version: "0.1.0" },
    { instructions: `Operate only inside the configured workspace root. Prefer cargo_check before cargo_test/build. Do not assume shell access exists.` }
  );

  server.registerTool("workspace_info", {
    title: "Workspace info",
    description: "Shows the configured workspace root and Cargo version.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => {
    const r = await runCargo(["--version"]);
    return textResult(`root: ${ROOT}\n${formatRun("cargo --version", r)}`, r.code !== 0);
  });

  server.registerTool("read_file", {
    title: "Read workspace file",
    description: "Reads a UTF-8 text file inside the configured workspace root.",
    inputSchema: { path: z.string().min(1) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ path: rel }) => {
    try {
      const p = insideRoot(rel);
      const st = await fs.stat(p);
      if (!st.isFile()) throw new Error("Not a file");
      if (st.size > MAX_FILE) throw new Error(`File exceeds ${MAX_FILE} bytes`);
      return textResult(await fs.readFile(p, "utf8"));
    } catch (e) { return textResult(String(e.message ?? e), true); }
  });

  server.registerTool("write_file", {
    title: "Write workspace file",
    description: "Creates or replaces a UTF-8 text file inside the configured workspace root. Creates parent directories.",
    inputSchema: { path: z.string().min(1), content: z.string().max(MAX_FILE) },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, async ({ path: rel, content }) => {
    try {
      const p = insideRoot(rel);
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, content, "utf8");
      return textResult(`Wrote ${Buffer.byteLength(content, "utf8")} bytes to ${rel}`);
    } catch (e) { return textResult(String(e.message ?? e), true); }
  });

  server.registerTool("list_files", {
    title: "List workspace files",
    description: "Lists a directory inside the configured workspace root.",
    inputSchema: { path: z.string().default(".") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ path: rel }) => {
    try {
      const entries = await fs.readdir(insideRoot(rel), { withFileTypes: true });
      return textResult(entries.map(e => `${e.isDirectory() ? "d" : "f"}\t${e.name}`).join("\n"));
    } catch (e) { return textResult(String(e.message ?? e), true); }
  });

  for (const [name, subcommand, title] of [
    ["cargo_check", "check", "Cargo check"],
    ["cargo_test", "test", "Cargo test"],
    ["cargo_build", "build", "Cargo build"],
  ]) {
    server.registerTool(name, {
      title,
      description: `Runs cargo ${subcommand} in a workspace-relative directory. Optional args are passed directly to Cargo without a shell.`,
      inputSchema: { ...cwdSchema, args: z.array(z.string()).max(32).default([]) },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async ({ cwd, args }) => {
      try {
        const full = [subcommand, ...args];
        const r = await runCargo(full, cwd);
        return textResult(formatRun(`cargo ${full.join(" ")}`, r), r.code !== 0);
      } catch (e) { return textResult(String(e.message ?? e), true); }
    });
  }
  return server;
}

const httpServer = createServer(async (req, res) => {
  if (!req.url) return res.writeHead(400).end("Missing URL");
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  if (req.method === "GET" && url.pathname === "/") return res.writeHead(200, { "content-type": "text/plain" }).end("cargo-mcp ok");
  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    return res.end();
  }
  if (url.pathname === MCP_PATH && ["POST", "GET", "DELETE"].includes(req.method ?? "")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    const server = makeServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { transport.close(); server.close(); });
    try { await server.connect(transport); await transport.handleRequest(req, res); }
    catch (e) { console.error(e); if (!res.headersSent) res.writeHead(500).end("Internal server error"); }
    return;
  }
  res.writeHead(404).end("Not Found");
});

httpServer.listen(PORT, "127.0.0.1", () => {
  console.log(`cargo-mcp listening on http://127.0.0.1:${PORT}${MCP_PATH}`);
  console.log(`workspace root: ${ROOT}`);
});
