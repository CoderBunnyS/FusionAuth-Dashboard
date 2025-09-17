import { NextResponse } from "next/server";

const BASE = (process.env.FUSIONAUTH_BASE_URL ?? "").replace(/\/+$/, "");
const KEY  = process.env.FUSIONAUTH_API_KEY ?? "";

type Me = { roles: string[]; allowedTenants: string[] };

async function readMe(): Promise<Me> {
  // NOTE: temp — uses your stubbed /api/me.
  // When we wire real login, replace this with cookie/JWT claims.
  const r = await fetch("http://localhost:3003/api/me", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to read /api/me");
  return r.json();
}

export async function GET() {
  try {
    const me = await readMe();

    // Call FusionAuth: GET /api/tenant (requires API key)
    const r = await fetch(`${BASE}/api/tenant`, {
      headers: { Authorization: KEY }, // raw key in Authorization header
      cache: "no-store",
    });
    const data = await r.json();
    if (!r.ok) throw data;

    // Normalize
    let tenants: Array<{ id: string; name: string }> =
      (data.tenants ?? []).map((t: any) => ({ id: t.id, name: t.name }));

    // Scope: super-admin sees all; viewers see intersection with allowedTenants
    const isSuper = me.roles.includes("super-admin");
    if (!isSuper) {
      const allow = new Set(me.allowedTenants ?? []);
      tenants = tenants.filter(t => allow.has(t.id));
    }

    return NextResponse.json({ tenants });
  } catch (err: any) {
    return NextResponse.json({ error: err }, { status: 502 });
  }
}
