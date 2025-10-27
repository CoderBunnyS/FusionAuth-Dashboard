import { NextResponse } from "next/server";

const BASE = (process.env.FUSIONAUTH_BASE_URL ?? "").replace(/\/+$/, "");
const KEY  = process.env.FUSIONAUTH_API_KEY ?? "";

interface LoginRecord {
  applicationId?: string;
  instant: number;
  ipAddress?: string;
  loginId?: string;
  userId?: string;
}

interface LoginRecordSearchResponse {
  logins?: LoginRecord[];
  total?: number;
}

export async function GET() {
  if (!BASE || !KEY) {
    return NextResponse.json({ 
      ok: false, 
      error: "Missing env vars" 
    });
  }

  const url = `${BASE}/api/system/login-record/search?numberOfResults=25&startRow=0`;
  
  console.log("🔍 Fetching from:", url);
  
  const r = await fetch(url, {
    headers: { Authorization: KEY },
    cache: "no-store",
  });

  const text = await r.text();
  
  console.log("📊 Status:", r.status);
  console.log("📄 Response:", text);
  
  try { 
    const parsed = JSON.parse(text) as LoginRecordSearchResponse;
    const items = (parsed.logins ?? []).map(l => ({
      ts: l.instant,
      loginId: l.loginId ?? "",
      userId: l.userId ?? "",
      appId: l.applicationId ?? "",
      ip: l.ipAddress ?? "",
    }));
    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ 
      ok: false, 
      error: `Bad response from FusionAuth: ${text.substring(0, 100)}` 
    });
  }
}