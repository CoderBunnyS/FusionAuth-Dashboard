"use client";
import { useEffect, useState } from "react";

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
};

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/system")
      .then(r => r.json())
      .then(j => j.ok ? setSys(j.data as SlimSystem) : setSysError(JSON.stringify(j.error)))
      .catch(e => setSysError(String(e)));
  }, []);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(setMe).catch(e => setMeError(String(e)));
  }, []);

  useEffect(() => {
    fetch("/api/tenants")
      .then(r => r.json())
      .then(j => j.tenants ? setTenants(j.tenants) : setTenantsErr(JSON.stringify(j.error)))
      .catch(e => setTenantsErr(String(e)));
  }, []);

  useEffect(() => {
    fetch("/api/login")
      .then(r => r.json())
      .then(j => j.ok ? setLogins(j.items) : setLoginsErr(JSON.stringify(j.error)))
      .catch(e => setLoginsErr(String(e)));
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">FusionAuth Dashboard (v0)</h1>

      {/* Top row - System, You, Tenants in 3 columns */}
      <div className="grid grid-cols-3 gap-4">
        <section className="p-4 rounded-xl border">
          <h2 className="text-base font-semibold mb-2">System</h2>
          {!sys && !sysError && <p className="text-sm">Loading…</p>}
          {sysError && <pre className="text-red-600 text-xs">{sysError}</pre>}
          {sys && (
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Status:</span> {sys.up ? "UP" : "DOWN"} ({sys.http})</p>
              <p><span className="font-medium">Version:</span> {sys.version}</p>
              <p><span className="font-medium">Runtime:</span> {sys.runtimeMode}</p>
              <p><span className="font-medium">Database:</span> {sys.db}</p>
              <p><span className="font-medium">Search:</span> {sys.search}</p>
            </div>
          )}
        </section>

        <section className="p-4 rounded-xl border">
          <h2 className="text-base font-semibold mb-2">You</h2>
          {!me && !meError && <p className="text-sm">Loading…</p>}
          {meError && <pre className="text-red-600 text-xs">{meError}</pre>}
          {me && (
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Email:</span> {me.email}</p>
              <p><span className="font-medium">Roles:</span> {me.roles.join(", ")}</p>
              <p><span className="font-medium">Tenants:</span> {me.allowedTenants.length}</p>
            </div>
          )}
        </section>

        <section className="p-4 rounded-xl border">
          <h2 className="text-base font-semibold mb-2">Tenants</h2>
          {!tenants && !tenantsErr && <p className="text-sm">Loading…</p>}
          {tenantsErr && <pre className="text-red-600 text-xs">{tenantsErr}</pre>}
          {tenants && (
            <div className="text-sm">
              <p className="font-medium mb-1">{tenants.length} total</p>
              <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                {tenants.map(t => (
                  <div key={t.id} className="truncate" title={`${t.name} (${t.id})`}>
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Full width - Recent Logins */}
      <section className="p-4 rounded-xl border">
        <h2 className="text-base font-semibold mb-3">Recent Logins</h2>
        {!logins && !loginsErr && <p className="text-sm">Loading…</p>}
        {loginsErr && <pre className="text-red-600 text-xs">{loginsErr}</pre>}
        {logins && (
          logins.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold">Time</th>
                    <th className="text-left py-2 px-3 font-semibold">Login ID</th>
                    <th className="text-left py-2 px-3 font-semibold">IP Address</th>
                    <th className="text-left py-2 px-3 font-semibold">User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logins.map((login, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2 px-3 whitespace-nowrap text-xs">
                        {mounted ? new Date(login.ts).toLocaleString() : new Date(login.ts).toISOString()}
                      </td>
                      <td className="py-2 px-3 text-xs">{login.loginId}</td>
                      <td className="py-2 px-3 font-mono text-xs">{login.ip}</td>
                      <td className="py-2 px-3">
                        {login.userId ? (
                          <button
                            onClick={() => copyToClipboard(login.userId)}
                            className="font-mono text-xs text-blue-600 hover:underline"
                            title={`Click to copy: ${login.userId}`}
                          >
                            {login.userId.substring(0, 8)}...
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-gray-500">No recent logins.</p>
        )}
      </section>
    </main>
  );
}