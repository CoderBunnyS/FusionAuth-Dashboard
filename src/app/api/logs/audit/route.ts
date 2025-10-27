import { NextResponse } from "next/server";

const BASE = (process.env.FUSIONAUTH_BASE_URL ?? "").replace(/\/+$/, "");
const KEY  = process.env.FUSIONAUTH_API_KEY ?? "";

type EventLogType = "Information" | "Debug" | "Error";

interface EventLogEntry {
  id: string;
  insertInstant: number;
  type: EventLogType;
  message?: string;
}

interface EventLogSearchResponse {
  eventLogs?: EventLogEntry[];
  total?: number;
}

// GET /api/logs/events?type=Error|Debug|Information&message=*&start=...&end=...&limit=25&offset=0
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = new URLSearchParams({
    message: searchParams.get("message") ?? "*",
    type:    searchParams.get("type") ?? "",
    start:   searchParams.get("start") ?? "",
    end:     searchParams.get("end") ?? "",
    numberOfResults: searchParams.get("limit") ?? "25",
    startRow:        searchParams.get("offset") ?? "0",
  });

  const r = await fetch(`${BASE}/api/system/event-log/search?${q.toString()}`, {
    headers: { Authorization: KEY },
    cache: "no-store",
  });

  const text = await r.text();
  let parsed: EventLogSearchResponse = {};
  try { parsed = text ? JSON.parse(text) as EventLogSearchResponse : {}; } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON from FusionAuth" }, { status: 502 });
  }
  if (!r.ok) return NextResponse.json({ ok: false, error: parsed }, { status: 502 });

  const list = parsed.eventLogs ?? [];
  const items = list.map(l => ({
    id: l.id,
    ts: l.insertInstant,
    type: l.type,
    message: l.message ?? "",
  }));

  return NextResponse.json({ ok: true, total: parsed.total ?? items.length, items });
}
