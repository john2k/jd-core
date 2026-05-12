"use client";

import { Users, Wifi } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SummaryOk = {
  ok: true;
  clients: number;
  downloadBytesPerSec: number;
  uploadBytesPerSec: number;
};

type SummaryErr = { ok: false; error: string };

type Summary = SummaryOk | SummaryErr;

type ChartPoint = { idx: number; dl: number; ul: number };

/** UniFi expose `*-bytes-r` en octets/s ; affichage en Mb/s (décimal). */
function formatThroughput(bytesPerSec: number): string {
  const mbps = (bytesPerSec * 8) / 1_000_000;
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(2)} Gb/s`;
  if (mbps >= 1) return `${mbps.toFixed(2)} Mb/s`;
  if (mbps >= 0.001) return `${(mbps * 1000).toFixed(0)} kb/s`;
  return `${(bytesPerSec * 8).toFixed(0)} b/s`;
}

const chartColors = {
  grid: "rgba(255,255,255,0.06)",
  dl: "#34d399",
  ul: "#38bdf8",
  tooltipBg: "rgba(24,24,27,0.95)",
  tooltipBorder: "rgba(255,255,255,0.1)",
};

export function UnifiWidget() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<ChartPoint[]>([]);

  const fetchSummary = useCallback(async () => {
    const res = await fetch("/api/unifi", { cache: "no-store" });
    const data = (await res.json()) as Summary;
    setSummary(data);
    if (data.ok) {
      setHistory((prev) => {
        const lastIdx = prev.length ? prev[prev.length - 1].idx : 0;
        const next: ChartPoint = {
          idx: lastIdx + 1,
          dl: data.downloadBytesPerSec,
          ul: data.uploadBytesPerSec,
        };
        return [...prev, next].slice(-32);
      });
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
    const id = setInterval(() => void fetchSummary(), 30_000);
    return () => clearInterval(id);
  }, [fetchSummary]);

  const ok = summary?.ok === true;
  const err = summary && !summary.ok ? summary.error : null;

  return (
    <div className="jd-widget flex min-h-[240px] flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            <Wifi className="h-3.5 w-3.5 text-emerald-400/90" aria-hidden />
            UniFi
          </div>
          <p className="text-xs text-zinc-500">Contrôleur (variables serveur)</p>
        </div>
        <div
          role="status"
          aria-live="polite"
          className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.06] bg-zinc-900/80 px-2.5 py-1.5"
          title={
            ok
              ? "Connexion au contrôleur UniFi active"
              : err
                ? `Hors ligne : ${err}`
                : "Connexion au contrôleur…"
          }
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center" aria-hidden>
            {ok ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50" />
            ) : null}
            <span
              className={
                ok
                  ? "relative h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.95)]"
                  : err
                    ? "relative h-2 w-2 rounded-full bg-red-500/90 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    : "relative h-2 w-2 rounded-full bg-zinc-600"
              }
            />
          </span>
          <span className="text-[10px] font-medium text-zinc-500">
            {ok ? "En ligne" : err ? "Erreur" : "…"}
          </span>
        </div>
      </div>

      {err ? (
        <p className="mt-4 flex-1 rounded-xl border border-red-500/25 bg-red-950/40 px-3 py-2 text-sm text-red-200/90">
          {err}
        </p>
      ) : !summary ? (
        <p className="mt-6 text-sm text-zinc-500">Chargement…</p>
      ) : summary.ok ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/60 p-3 ring-1 ring-inset ring-white/[0.03]">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Réception</p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-emerald-300/95">
                {formatThroughput(summary.downloadBytesPerSec)}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/60 p-3 ring-1 ring-inset ring-white/[0.03]">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Émission</p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-sky-300/95">
                {formatThroughput(summary.uploadBytesPerSec)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-zinc-900/40 px-3 py-2.5">
            <Users className="h-4 w-4 text-zinc-500" aria-hidden />
            <span className="text-sm text-zinc-400">Clients connectés</span>
            <span className="ml-auto font-mono text-lg font-semibold text-zinc-100">{summary.clients}</span>
          </div>

          <div className="mt-4 h-[100px] w-full min-w-0">
            {history.length < 2 ? (
              <p className="flex h-full items-center justify-center text-xs text-zinc-600">
                Historique après quelques mesures…
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="unifiDl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColors.dl} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={chartColors.dl} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="unifiUl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColors.ul} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={chartColors.ul} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="idx" hide />
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#a1a1aa" }}
                    formatter={(value, name) => [
                      formatThroughput(typeof value === "number" ? value : Number(value) || 0),
                      name === "dl" ? "Réception" : "Émission",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="dl"
                    stroke={chartColors.dl}
                    strokeWidth={1.5}
                    fill="url(#unifiDl)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="ul"
                    stroke={chartColors.ul}
                    strokeWidth={1.5}
                    fill="url(#unifiUl)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
