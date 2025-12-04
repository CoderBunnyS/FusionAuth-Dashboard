import { NextRequest, NextResponse } from "next/server";

const BASE = (process.env.FUSIONAUTH_BASE_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.FUSIONAUTH_API_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!BASE || !KEY) {
    return NextResponse.json({ ok: false, error: "Missing env vars" });
  }

  // Optional tenant scoping
  const tenantId = req.nextUrl.searchParams.get("tenantId");

  // Current month boundaries
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const url = `${BASE}/api/report/monthly-active-user?start=${startOfMonth}&end=${endOfMonth}`;

  const headers: Record<string, string> = { Authorization: KEY };
  if (tenantId) {
    headers["X-FusionAuth-TenantId"] = tenantId;
  }

  const res = await fetch(url, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ 
      ok: false, 
      error: `FusionAuth returned ${res.status}: ${text.substring(0, 100)}` 
    });
  }

  const data = await res.json();

  // Response: { total: number, monthlyActiveUsers: [{ count, interval }] }
  const mauList = data.monthlyActiveUsers ?? [];
  const currentMonth = mauList.length > 0 ? mauList[mauList.length - 1].count : 0;

  return NextResponse.json({
    ok: true,
    total: currentMonth,
    period: {
      start: startOfMonth,
      end: endOfMonth,
      month: now.toLocaleString("default", { month: "long", year: "numeric" }),
    },
    tenantId: tenantId ?? "global",
  });
}