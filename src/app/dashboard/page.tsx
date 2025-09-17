"use client";
import { useEffect, useState } from "react";
import type { SystemOverview } from "@/types/system";

type Me = {
  email: string;
  roles: string[];
  allowedTenants: string[];
};

export default function DashboardPage() {
  const [sys, setSys] = useState<SystemOverview | null>(null);
  const [sysError, setSysError] = useState<string | null>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/system")
      .then(r => r.json())
      .then(j => {
        if (j.ok) {
          setSys(j.data as SystemOverview);
        } else {
          setSysError(JSON.stringify(j.error));
        }
      })
      .catch(e => setSysError(String(e)));
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then(r => r.json())
      .then(j => {
        // depending on your /api/me stub, may respond with object directly
        setMe(j);
      })
      .catch(e => setMeError(String(e)));
  }, []);

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">FusionAuth Dashboard (v0)</h1>

      {/* System Card */}
      <section className="p-4 rounded-xl border">
        <h2 className="text-lg font-medium mb-2">System</h2>
        {!sys && !sysError && <p>Loading system...</p>}
        {sysError && <pre className="text-red-600">{sysError}</pre>}
        {sys && (
          <>
            <p>Runtime: {sys.health.runtimeMode}</p>
            <p>Version: {sys.version.version}</p>
            <p>Database: {sys.health.database.state}</p>
            <p>Search: {sys.health.searchEngine.state}</p>
          </>
        )}
      </section>

      {/* Me Card */}
      <section className="p-4 rounded-xl border space-y-1">
        <h2 className="text-lg font-medium">You</h2>
        {!me && !meError && <p>Loading you...</p>}
        {meError && <pre className="text-red-600">{meError}</pre>}
        {me && (
          <ul className="text-sm">
            <li><strong>Email:</strong> {me.email}</li>
            <li><strong>Roles:</strong> {me.roles.join(", ")}</li>
            <li><strong>Allowed Tenants:</strong> {me.allowedTenants.join(", ")}</li>
          </ul>
        )}
      </section>
    </main>
  );
}
