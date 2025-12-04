import { NextRequest, NextResponse } from "next/server";

const BASE = (process.env.FUSIONAUTH_BASE_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.FUSIONAUTH_API_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!BASE || !KEY) {
    return NextResponse.json({ ok: false, error: "Missing env vars" });
  }

  const tenantId = req.nextUrl.searchParams.get("tenantId");

  const headers: Record<string, string> = { 
    Authorization: KEY,
    "Content-Type": "application/json",
  };
  if (tenantId) {
    headers["X-FusionAuth-TenantId"] = tenantId;
  }

  // Use search endpoint to get all apps with total count
  const res = await fetch(`${BASE}/api/application/search`, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      search: {
        numberOfResults: 100,  // Adjust if you have more apps
        startRow: 0,
        state: "Active",       // Only active apps
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ ok: false, error: `FusionAuth returned ${res.status}` });
  }

  const data = await res.json();

  const apps = (data.applications ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    state: a.state,
    tenantId: a.tenantId,
  }));

  return NextResponse.json({ 
    ok: true, 
    apps, 
    total: data.total ?? apps.length,
    tenantId: tenantId ?? "global",
  });
}