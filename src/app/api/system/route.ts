// src/app/api/system/route.ts
import { NextResponse } from "next/server";

const BASE = (process.env.FUSIONAUTH_BASE_URL ?? "").replace(/\/+$/, "");
const KEY  = process.env.FUSIONAUTH_API_KEY ?? "";

async function fa(path: string, parseJson = true) {
  const r = await fetch(`${BASE}${path}`, {
    headers: path === "/api/health" ? undefined : { Authorization: KEY },
    cache: "no-store",
  });
  const text = await r.text();
  const data = parseJson && text ? JSON.parse(text) : null;
  return { ok: r.ok, status: r.status, data };
}

export async function GET() {
  const [health, status, version] = await Promise.all([
    fa("/api/health", /*parseJson*/ false),   // 200/500 only
    fa("/api/status"),                        // JSON w/ metrics when authed
    fa("/api/system/version")                 // JSON { version: "x.y.z" }
  ]);

  const payload = {
    up: !!health.ok,                          // simple boolean for the UI
    http: health.status,                      // 200 or 500
    version: version.data?.version ?? status.data?.version ?? "unknown",
    db: status.data?.database?.state ?? "unknown",
    search: status.data?.search?.state ?? "unknown",
    runtimeMode: status.data?.runtimeMode ?? "unknown"
  };

  // if either call failed (404/401/etc.), surface a minimal error for debugging
  const ok = health.ok && status.ok;
  return NextResponse.json(ok ? { ok: true, data: payload }
                              : { ok: false, error: { status, version } },
                           { status: ok ? 200 : 502 });
}
