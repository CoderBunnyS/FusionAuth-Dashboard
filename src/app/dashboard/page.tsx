"use client";
import { useEffect, useState, useMemo } from "react";

type SlimSystem = {
  up: boolean;
  http: number;
  version: string;
  db: string;
  search: string;
  runtimeMode: string;
};

type Me = { email: string; roles: string[]; allowedTenants: string[] };

type LoginItem = {
  ts: number;
  loginId: string;
  userId: string;
  appId: string;
  ip: string;
  success?: boolean;
  reason?: string;
};

type MauData = {
  total: number;
  perApp: { appId: string; count: number }[];
};

// Simple sparkline component (no external deps)
function Sparkline({ data, color = "#3b82f6" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const h = 32, w = 120;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

// Status indicator dot
function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

// Stat card component
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// Relative time helper
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [sys, setSys] = useState<SlimSystem | null>(null);
  const [sysError, setSysError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<{ id: string; name: string }[] | null>(null);
  const [tenantsErr, setTenantsErr] = useState<string | null>(null);
  const [logins, setLogins] = useState<LoginItem[] | null>(null);
  const [loginsErr, setLoginsErr] = useState<string | null>(null);
  const [mau, setMau] = useState<MauData | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [appCount, setAppCount] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/system").then(r => r.json())
      .then(j => j.ok ? setSys(j.data) : setSysError(JSON.stringify(j.error)))
      .catch(e => setSysError(String(e)));
  }, []);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(setMe).catch(e => setMeError(String(e)));
  }, []);

  useEffect(() => {
    fetch("/api/tenants").then(r => r.json())
      .then(j => j.tenants ? setTenants(j.tenants) : setTenantsErr(JSON.stringify(j.error)))
      .catch(e => setTenantsErr(String(e)));
  }, []);

  useEffect(() => {
    fetch("/api/login").then(r => r.json())
      .then(j => j.ok ? setLogins(j.items) : setLoginsErr(JSON.stringify(j.error)))
      .catch(e => setLoginsErr(String(e)));
  }, []);

  useEffect(() => {
    fetch("/api/mau").then(r => r.json())
      .then(j => j.ok && setMau({ total: j.total, perApp: j.perApp }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/users/count").then(r => r.json())
      .then(j => j.ok && setUserCount(j.total))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/applications").then(r => r.json())
      .then(j => j.ok && setAppCount(j.total))
      .catch(() => {});
  }, []);

  // Aggregate logins by hour for sparkline (last 24 buckets)
  const loginSparkData = useMemo(() => {
    if (!logins) return [];
    const now = Date.now();
    const buckets = Array(24).fill(0);
    logins.forEach(l => {
      const hoursAgo = Math.floor((now - l.ts) / 3600000);
      if (hoursAgo < 24) buckets[23 - hoursAgo]++;
    });
    return buckets;
  }, [logins]);

  const failedCount = useMemo(() => logins?.filter(l => l.success === false).length ?? 0, [logins]);
  const successCount = useMemo(() => logins?.filter(l => l.success !== false).length ?? 0, [logins]);

  const copy = (t: string) => navigator.clipboard.writeText(t);

  return (
    <main className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">FusionAuth Dashboard</h1>
        {sys && (
          <span className="text-xs px-2 py-1 bg-slate-200 rounded-full text-slate-600">
            v{sys.version}
          </span>
        )}
      </div>

      {/* Stats row - MAU featured prominently */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 text-white shadow-md">
          <p className="text-xs uppercase tracking-wide opacity-80">Monthly Active Users</p>
          <p className="text-3xl font-bold mt-1">{mau?.total.toLocaleString() ?? "—"}</p>
          <p className="text-xs opacity-70 mt-1">billing metric</p>
        </div>
        <StatCard label="Total Users" value={userCount?.toLocaleString() ?? "—"} />
        <StatCard label="Applications" value={appCount ?? "—"} />
        <StatCard label="Tenants" value={tenants?.length ?? "—"} />
        <StatCard label="Recent Activity" value={logins?.length ?? "—"} sub="last 50 events" />
      </div>

      {/* System + Profile row */}
      <div className="grid grid-cols-3 gap-4">
        <section className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">System Health</h2>
          {sysError && <p className="text-red-600 text-xs">{sysError}</p>}
          {!sys && !sysError && <p className="text-sm text-slate-400">Loading…</p>}
          {sys && (
            <div className="space-y-2">
              <StatusDot ok={sys.up} label={sys.up ? "All Systems Healthy" : "System Down"} />
              {sys.up && (
                <p className="text-xs text-slate-500 pl-4">API, Database, Search all responding</p>
              )}
              <div className="pt-2 border-t mt-3 text-xs text-slate-500">
                Mode: <span className="font-medium">{sys.runtimeMode}</span>
              </div>
            </div>
          )}
        </section>

        <section className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Your Profile</h2>
          {meError && <p className="text-red-600 text-xs">{meError}</p>}
          {!me && !meError && <p className="text-sm text-slate-400">Loading…</p>}
          {me && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                  {me.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-800">{me.email}</p>
                  <p className="text-xs text-slate-500">{me.roles.join(", ")}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 pt-2">
                Access to {me.allowedTenants.length} tenant{me.allowedTenants.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </section>

        <section className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Tenants</h2>
            {tenants && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{tenants.length}</span>}
          </div>
          {tenantsErr && <p className="text-red-600 text-xs">{tenantsErr}</p>}
          {!tenants && !tenantsErr && <p className="text-sm text-slate-400">Loading…</p>}
          {tenants && (
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
              {tenants.map(t => (
                <span key={t.id} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md truncate max-w-[140px]" title={t.id}>
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Login Activity */}
      <section className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-700">Login Activity</h2>
            {logins && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{successCount} success</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{failedCount} failed</span>
              </div>
            )}
          </div>
          {logins && loginSparkData.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>24h trend</span>
              <Sparkline data={loginSparkData} />
            </div>
          )}
        </div>
        {loginsErr && <p className="text-red-600 text-xs">{loginsErr}</p>}
        {!logins && !loginsErr && <p className="text-sm text-slate-400">Loading…</p>}
        {logins && logins.length === 0 && <p className="text-sm text-slate-500">No recent logins.</p>}
        {logins && logins.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b">
                  <th className="py-2 px-3 font-medium w-8"></th>
                  <th className="py-2 px-3 font-medium">Time</th>
                  <th className="py-2 px-3 font-medium">User</th>
                  <th className="py-2 px-3 font-medium">IP</th>
                  <th className="py-2 px-3 font-medium">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logins.map((l, i) => (
                  <tr key={i} className={`hover:bg-slate-50 transition-colors ${l.success === false ? "bg-red-50/50" : ""}`}>
                    <td className="py-2.5 px-3">
                      <span className={`w-2 h-2 rounded-full inline-block ${l.success === false ? "bg-red-500" : "bg-green-500"}`} title={l.success === false ? l.reason || "Failed" : "Success"} />
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-slate-800">{mounted ? timeAgo(l.ts) : "—"}</span>
                      <span className="text-slate-400 text-xs ml-2">
                        {mounted ? new Date(l.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{l.loginId || "—"}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600">{l.ip || "—"}</td>
                    <td className="py-2.5 px-3">
                      {l.userId ? (
                        <button onClick={() => copy(l.userId)} className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline" title={l.userId}>
                          {l.userId.slice(0, 8)}…
                        </button>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}