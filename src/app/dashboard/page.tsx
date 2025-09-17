"use client";
import { useEffect, useState } from "react";

type SlimSystem = {
  up: boolean;        // from /api/health
  http: number;       // 200|500
  version: string;    // from /api/system/version (fallback status)
  db: string;         // normalized
  search: string;     // normalized
  runtimeMode: string;
};

type Me = { email: string; roles: string[]; allowedTenants: string[] };

export default function DashboardPage() {
  // --- System card state (changed type)
  const [sys, setSys] = useState<SlimSystem | null>(null);
  const [sysError, setSysError] = useState<string | null>(null);

  // --- Existing state (unchanged)
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<{ id: string; name: string }[] | null>(null);
  const [tenantsErr, setTenantsErr] = useState<string | null>(null);

  // --- System fetch (keep, but cast to SlimSystem)
  useEffect(() => {
    fetch("/api/system")
      .then(r => r.json())
      .then(j => j.ok ? setSys(j.data as SlimSystem) : setSysError(JSON.stringify(j.error)))
      .catch(e => setSysError(String(e)));
  }, []);

  // --- Me fetch (unchanged)
  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(setMe).catch(e => setMeError(String(e)));
  }, []);

  // --- Tenants fetch (unchanged)
  useEffect(() => {
    fetch("/api/tenants")
      .then(r => r.json())
      .then(j => j.tenants ? setTenants(j.tenants) : setTenantsErr(JSON.stringify(j.error)))
      .catch(e => setTenantsErr(String(e)));
  }, []);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">FusionAuth Dashboard (v0)</h1>

      {/* System Card */}
      <section className="p-4 rounded-xl border">
        <h2 className="text-lg font-medium mb-2">System</h2>
        {!sys && !sysError && <p>Loading system…</p>}
        {sysError && <pre className="text-red-600">{sysError}</pre>}
        {sys && (
          <>
            <p>Overall: {sys.up ? "UP" : "DOWN"} ({sys.http})</p>
            <p>Version: {sys.version}</p>
            <p>Runtime: {sys.runtimeMode}</p>
            <p>Database: {sys.db}</p>
            <p>Search: {sys.search}</p>
          </>
        )}
      </section>

      {/* Me Card (unchanged) */}
      <section className="p-4 rounded-xl border space-y-1">
        <h2 className="text-lg font-medium">You</h2>
        {!me && !meError && <p>Loading you…</p>}
        {meError && <pre className="text-red-600">{meError}</pre>}
        {me && (
          <ul className="text-sm">
            <li><strong>Email:</strong> {me.email}</li>
            <li><strong>Roles:</strong> {me.roles.join(", ")}</li>
            <li><strong>Allowed Tenants:</strong> {me.allowedTenants.join(", ")}</li>
          </ul>
        )}
      </section>

      {/* Tenants (unchanged) */}
      <section className="p-4 rounded-xl border">
        <h2 className="text-lg font-medium">Tenants (scoped)</h2>
        {!tenants && !tenantsErr && <p>Loading…</p>}
        {tenantsErr && <pre className="text-red-600">{tenantsErr}</pre>}
        {tenants && (
          tenants.length ? (
            <ul className="text-sm list-disc pl-5">
              {tenants.map(t => (
                <li key={t.id}>{t.name} <span className="text-gray-500">({t.id})</span></li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500">No tenants available for your account.</p>
        )}
      </section>
    </main>
  );
}
