import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const MAX_EVENTS = 500;

// Event categories and their files
const CATEGORIES = {
  security: ["user.login.failed", "user.login.suspicious", "user.login.new-device", "user.password.breach"],
  logins: ["user.login.success", "user.login.failed"],
  users: ["user.create", "user.create.complete", "user.delete", "user.deactivate", "user.reactivate", "user.bulk.create"],
  registrations: ["user.registration.create", "user.registration.create.complete", "user.registration.delete", "user.registration.verified"],
  passwords: ["user.password.reset.send", "user.password.reset.start", "user.password.reset.success", "user.password.update", "user.password.breach"],
  mfa: ["user.two-factor.method.add", "user.two-factor.method.remove"],
  groups: ["group.create", "group.delete", "group.member.add", "group.member.remove"],
  identity: ["user.identity-provider.link", "user.identity-provider.unlink", "user.email.verified", "user.identity.verified"],
} as const;

type Category = keyof typeof CATEGORIES;

interface StoredEvent {
  ts: number;
  type: string;
  tenantId: string;
  userId?: string;
  loginId?: string;
  appId?: string;
  ip?: string;
  data?: Record<string, unknown>;
}

// FusionAuth webhook event structure
interface FusionAuthEvent {
  type: string;
  createInstant?: number;
  tenantId?: string;
  applicationId?: string;
  userId?: string;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  info?: {
    ipAddress?: string;
    userAgent?: string;
    location?: {
      city?: string;
      country?: string;
      region?: string;
    };
  };
  reason?: {
    code?: string;
  };
  method?: {
    method?: string;
  };
  identityProviderLink?: {
    identityProviderId?: string;
  };
}

async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

async function getEvents(category: Category): Promise<StoredEvent[]> {
  try {
    const data = await readFile(path.join(DATA_DIR, `${category}.json`), "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function storeEvent(category: Category, event: StoredEvent) {
  await ensureDataDir();
  const events = await getEvents(category);
  events.unshift(event);
  const trimmed = events.slice(0, MAX_EVENTS);
  await writeFile(path.join(DATA_DIR, `${category}.json`), JSON.stringify(trimmed, null, 2));
}

function getCategoriesForEvent(eventType: string): Category[] {
  return (Object.entries(CATEGORIES) as [Category, readonly string[]][])
    .filter(([_, types]) => types.includes(eventType))
    .map(([cat]) => cat);
}

function parseEvent(event: FusionAuthEvent): StoredEvent {
  return {
    ts: event.createInstant ?? Date.now(),
    type: event.type,
    tenantId: event.tenantId ?? "",
    userId: event.user?.id ?? event.userId,
    loginId: event.user?.email ?? event.user?.username ?? "",
    appId: event.applicationId,
    ip: event.info?.ipAddress,
    data: {
      // Include relevant extra data based on event type
      reason: event.reason?.code,
      method: event.method?.method, // for MFA events
      identityProvider: event.identityProviderLink?.identityProviderId,
      userAgent: event.info?.userAgent,
      location: event.info?.location,
    },
  };
}

// POST - Receive webhooks from FusionAuth
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = body.event;

    if (!event?.type) {
      return NextResponse.json({ error: "No event type" }, { status: 400 });
    }

    const parsed = parseEvent(event);
    const categories = getCategoriesForEvent(event.type);

    // Store in all relevant categories
    for (const category of categories) {
      await storeEvent(category, parsed);
    }

    console.log(`[Webhook] ${event.type} → [${categories.join(", ")}]`);
    return NextResponse.json({ received: true, categories });
  } catch (err) {
    console.error("[Webhook] Error:", err);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}

// GET - Query stored events by category
export async function GET(req: NextRequest) {
  const category = (req.nextUrl.searchParams.get("category") ?? "logins") as Category;
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");

  if (!CATEGORIES[category]) {
    return NextResponse.json({ 
      ok: false, 
      error: `Invalid category. Valid: ${Object.keys(CATEGORIES).join(", ")}` 
    }, { status: 400 });
  }

  let events = await getEvents(category);

  // Filter by tenant if specified
  if (tenantId) {
    events = events.filter(e => e.tenantId === tenantId);
  }

  const items = events.slice(0, limit);

  // Build stats based on category
  const stats = buildStats(category, items);

  return NextResponse.json({
    ok: true,
    category,
    items,
    stats,
    tenantId: tenantId ?? "global",
  });
}

function buildStats(category: Category, items: StoredEvent[]) {
  switch (category) {
    case "logins":
      const success = items.filter(i => i.type === "user.login.success").length;
      const failed = items.filter(i => i.type === "user.login.failed").length;
      return {
        total: items.length,
        success,
        failed,
        failureRate: items.length > 0 ? Math.round((failed / items.length) * 100) : 0,
      };

    case "security":
      return {
        total: items.length,
        suspicious: items.filter(i => i.type === "user.login.suspicious").length,
        newDevice: items.filter(i => i.type === "user.login.new-device").length,
        breached: items.filter(i => i.type === "user.password.breach").length,
        failed: items.filter(i => i.type === "user.login.failed").length,
      };

    case "mfa":
      return {
        total: items.length,
        added: items.filter(i => i.type === "user.two-factor.method.add").length,
        removed: items.filter(i => i.type === "user.two-factor.method.remove").length,
      };

    case "registrations":
      return {
        total: items.length,
        created: items.filter(i => i.type.includes("create")).length,
        verified: items.filter(i => i.type.includes("verified")).length,
      };

    default:
      return { total: items.length };
  }
}