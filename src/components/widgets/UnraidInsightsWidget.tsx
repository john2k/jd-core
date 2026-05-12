"use client";

import { Cpu, Database, Layers } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Ok = {
  ok: true;
  arrayState: "started" | "stopped" | "unknown";
  poolMount: string;
  poolUsedPct: number | null;
  cpuTempC: number | null;
};

type Err = { ok: false; error: string };

type Payload = Ok | Err;

function arrayLabel(s: Ok["arrayState"]): string {
  if (s === "started") return "Démarré";
  if (s === "stopped") return "Arrêté";
  return "Inconnu";
}

const POLL_MS = 90_000;

export function UnraidInsightsWidget() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/unraid-insights", { cache: "no-store" });
      const j = (await res.json()) as Payload;
      setData(j);
    } catch {
      setData({ ok: false, error: "Impossible de joindre l’API Unraid." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const err = data && !data.ok ? data.error : null;
  const ok = data?.ok === true;

  return (
    <div className="jd-widget flex min-h-[200px] flex-col">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <Layers className="h-3.5 w-3.5 text-orange-400/90" aria-hidden />
          Unraid (Prometheus)
        </div>
        {loading ? <span className="text-[10px] text-zinc-500">Chargement…</span> : null}
      </div>

      {err ? (
        <p className="text-sm leading-relaxed text-amber-200/85">{err}</p>
      ) : ok ? (
        <ul className="flex flex-col gap-3">
          <li className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/50 px-3 py-3">
            <div className="flex items-center gap-2 text-zinc-500">
              <Layers className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-sm text-zinc-400">Array</span>
            </div>
            <span
              className={`text-sm font-semibold ${
                data.arrayState === "started"
                  ? "text-emerald-300"
                  : data.arrayState === "stopped"
                    ? "text-red-300"
                    : "text-zinc-400"
              }`}
            >
              {arrayLabel(data.arrayState)}
            </span>
          </li>
          <li className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/50 px-3 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-zinc-500">
              <Database className="h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm text-zinc-400">Stockage (pool)</p>
                <p className="truncate font-mono text-[10px] text-zinc-600" title={data.poolMount}>
                  {data.poolMount}
                </p>
              </div>
            </div>
            <span className="shrink-0 font-mono text-sm font-semibold text-sky-300">
              {data.poolUsedPct != null ? `${data.poolUsedPct.toFixed(1)} %` : "—"}
            </span>
          </li>
          <li className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/50 px-3 py-3">
            <div className="flex items-center gap-2 text-zinc-500">
              <Cpu className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-sm text-zinc-400">Temp. CPU (métriques)</span>
            </div>
            <span className="font-mono text-sm font-semibold text-orange-200/95">
              {data.cpuTempC != null ? `${data.cpuTempC.toFixed(1)} °C` : "—"}
            </span>
          </li>
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">…</p>
      )}
    </div>
  );
}
