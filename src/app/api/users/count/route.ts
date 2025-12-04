import { NextRequest, NextResponse } from "next/server";

const BASE = (process.env.FUSIONAUTH_BASE_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.FUSIONAUTH_API_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!BASE || !KEY) {
    return NextResponse.json({ ok: false, error: "Missing env vars" });
  }

  const tenantId = req.nextUrl.searchParams.get("tenantId");

  // If tenant-scoped, use user search; otherwise use report/totals
  if (tenantId) {
    return getTenantUserCount(tenantId);
  } else {
    return getGlobalUserCount();
  }
}

async function getGlobalUserCount() {
  const res = await fetch(`${BASE}/api/report/totals`, {
    headers: { Authorization: KEY },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: `FusionAuth returned ${res.status}` });
  }

  const data = await res.json();

  return NextResponse.json({ 
    ok: true, 
    total: data.globalRegistrations ?? 0,
    totalAllTime: data.totalGlobalRegistrations ?? 0,
    applicationTotals: data.applicationTotals ?? {},
    tenantId: "global",
  });
}

async function getTenantUserCount(tenantId: string) {
  // Use user search with tenant header and wildcard query
  // numberOfResults=0 just returns the total count
  const res = await fetch(`${BASE}/api/user/search`, {
    method: "POST",
    headers: { 
      Authorization: KEY,
      "Content-Type": "application/json",
      "X-FusionAuth-TenantId": tenantId,
    },
    cache: "no-store",
    body: JSON.stringify({
      search: {
        numberOfResults: 0,
        queryString: "*",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ ok: false, error: `FusionAuth returned ${res.status}` });
  }

  const data = await res.json();

  return NextResponse.json({ 
    ok: true, 
    total: data.total ?? 0,
    tenantId,
  });
}