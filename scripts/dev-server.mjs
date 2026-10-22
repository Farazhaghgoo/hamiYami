/*
 * Local preview server: serves public/ and a development-only POST /api/signup that runs the
 * same validation as production but stores signups in .data/signups.local.json.
 * Never deploy this file. Usage: npm run dev → http://localhost:4321
 */
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handleSignup } from "../lib/signup.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const dataFile = join(root, ".data", "signups.local.json");
const port = Number(process.env.PORT) || 4321;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

// Upserts by (email, audience), like the Supabase table's unique constraint.
const localStore = {
  async upsert(record) {
    let rows = [];
    try {
      rows = JSON.parse(await readFile(dataFile, "utf8"));
    } catch (_) {
      rows = [];
    }
    const index = rows.findIndex((row) => row.email === record.email && row.audience === record.audience);
    if (index === -1) rows.push({ marketing_consent: false, created_at: record.updated_at, ...record });
    else rows[index] = { ...rows[index], ...record };
    await mkdir(dirname(dataFile), { recursive: true });
    await writeFile(dataFile, JSON.stringify(rows, null, 2));
  },
};

async function readBody(req, limit = 10000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": TYPES[".json"], "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/signup") {
    if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    let body = null;
    try {
      body = JSON.parse((await readBody(req)) ?? "");
    } catch (_) {
      body = null;
    }
    const result = await handleSignup({ body, origin: req.headers.origin, store: localStore });
    console.log(`[signup] ${result.status} audience=${body && body.audience}`);
    return sendJson(res, result.status, result.json);
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (_) {
    res.writeHead(400).end();
    return;
  }
  if (pathname.endsWith("/")) pathname += "index.html";
  const filePath = normalize(join(publicDir, pathname));
  if (!filePath.startsWith(publicDir + sep)) {
    res.writeHead(403).end();
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  } catch (_) {
    res.writeHead(404, { "Content-Type": TYPES[".txt"] }).end("Not found");
  }
}).listen(port, () => {
  console.log(`HamiYami preview running at http://localhost:${port}`);
  console.log("Local signups (development only) are written to .data/signups.local.json");
});
