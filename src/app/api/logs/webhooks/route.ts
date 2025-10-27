import { NextResponse } from "next/server";

const BASE = (process.env.FUSIONAUTH_BASE_URL ?? "").replace(/\/+$/, "");
const KEY  = process.env.FUSIONAUTH_API_KEY ?? "";

type WebhookEventResult = "Running" | "Succeeded" | "Failed";

interface WebhookAttempt {
  startInstant?: number;
  endInstant?: number;
  webhookCallResponse?: {
    statusCode?: number;
    url?: string;
  };
}

interface WebhookEventLog {
  id: string;
  insertInstant: number;
  eventType?: string;
  eventResult?: WebhookEventResult;
  attempts?: WebhookAttempt[];
}

interface WebhookEventLogSearchResponse {
  webhookEventLogs?: WebhookEventLog[];
  total?: number;
}

// GET /api/logs/webhooks?eventType=user.create&eventResult=Failed&start=...&end=...&limit=25&offset=0
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = new URLSearchParams({
    event:        searchParams.get("event") ?? "*", // body search
    eventType:    searchParams.get("eventType") ?? "",
    eventResult:  searchParams.get("eventResult") ?? "",
    start:        searchParams.get("start") ?? "",
    end:          searchParams.get("end") ?? "",
    numberOfResults: searchParams.get("limit") ?? "25",
    startRow:        searchParams.get("offset") ?? "0",
  });

  const r = await fetch(`${BASE}/api/system/webhook-event-log/search?${q.toString()}`, {
    headers: { Authorization: KEY },
    cache: "no-store",
  });

  const text = await r.text();
  let parsed: WebhookEventLogSearchResponse = {};
  try { parsed = text ? JSON.parse(text) as WebhookEventLogSearchResponse : {}; } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON from FusionAuth" }, { status: 502 });
  }
  if (!r.ok) return NextResponse.json({ ok: false, error: parsed }, { status: 502 });

  const list = parsed.webhookEventLogs ?? [];
  const items = list.map(w => ({
    id: w.id,
    ts: w.insertInstant,
    type: w.eventType ?? "",
    result: w.eventResult ?? "Running",
    attempts: (w.attempts ?? []).map(a => ({
      status: a.webhookCallResponse?.statusCode,
      url: a.webhookCallResponse?.url,
      start: a.startInstant,
      end: a.endInstant,
    })),
  }));

  return NextResponse.json({ ok: true, total: parsed.total ?? items.length, items });
}
