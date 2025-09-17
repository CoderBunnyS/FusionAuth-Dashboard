import { NextResponse } from "next/server";

// TEMP: until we wire real auth, reuse the /api/me stub to know roles/allowedTenants
async function readMe() {
  const res = await fetch("http://localhost:3003/api/me", { cache: "no-store" });
  return res.json() as Promise<{ roles: string[]; allowedTenants: string[] }>;
}

async function fa(path: string) {
  const base = process.env.FUSIONAUTH_BASE_URL!;
  const key  = process.env.FUSIONAUTH_API_KEY!;
  const res  = await fetch(`${base}${path}`, {
    headers: { Authorization: key }, // FusionAuth expects API key in Authorization header
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function GET() {
  try {
    const me = await readMe();

    // Fetch all tenants from FusionAuth
    // FusionAuth exposes tenant management under /api/tenant
    const data = await fa("/api/tenant");

    // Normalize: FA returns { tenants: [...] }
    let tenants: Array<{ id: string; name: string }> = data.tenants ?? [];

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
