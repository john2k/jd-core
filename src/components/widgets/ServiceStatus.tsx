"use client";

/**
 * Affiche l’état des services (UP/DOWN, latence). Les pings HTTP réels sont
 * effectués côté serveur via GET /api/service-status (pas de CORS navigateur).
 */
import { Activity } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ServiceRow = {
  id: string;
  name: string;
  configured: boolean;
  up: boolean;
  ms: number | null;
  host: string | null;
};

type ApiOk = { ok: true; services: ServiceRow[] };
type ApiErr = { ok: false; error: string };

type ApiResponse = ApiOk | ApiErr;

const POLL_MS = 60_000;

export function ServiceStatus() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/service-status", { cache: "no-store" });
      const data = (await res.json()) as ApiResponse;
      if (!data.ok) {
        setError(data.error);
        setServices([]);
        return;
      }
      setServices(data.services);
    } catch {
      setError("Impossible de joindre l’API de statut.");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="jd-widget">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <Activity className="h-3.5 w-3.5 text-violet-400/90" aria-hidden />
          Services
        </div>
        {loading ? <span className="text-[10px] text-zinc-500">Vérification…</span> : null}
      </div>

      {error ? (
        <p className="text-sm text-red-300/90">{error}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {services.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/50 px-3 py-3 ring-1 ring-inset ring-white/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-100">{s.name}</p>
                {s.host ? (
                  <p className="truncate font-mono text-[11px] text-zinc-500" title={s.host}>
                    {s.host}
                  </p>
                ) : s.configured ? null : (
                  <p className="text-[11px] text-zinc-600">Non configuré (voir .env)</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    !s.configured
                      ? "border border-zinc-600 bg-zinc-800 text-zinc-400"
                      : s.up
                        ? "border border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
                        : "border border-red-500/40 bg-red-950/80 text-red-300"
                  }`}
                >
                  {!s.configured ? "—" : s.up ? "UP" : "DOWN"}
                </span>
                <span className="font-mono text-xs tabular-nums text-zinc-400">
                  {s.ms != null ? `${s.ms} ms` : "—"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
