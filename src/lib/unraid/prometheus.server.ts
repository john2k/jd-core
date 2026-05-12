import "server-only";
import { Agent, fetch as undiciFetch } from "undici";

import {
  getServiceCheckFetchTimeoutMs,
  getUnraidPoolMountpoint,
  getUnraidPrometheusUrl,
} from "@/lib/env.server";

const insecureAgent = new Agent({
  connect: { rejectUnauthorized: false },
});

export type UnraidInsightPayload =
  | {
      ok: true;
      arrayState: "started" | "stopped" | "unknown";
      poolMount: string;
      poolUsedPct: number | null;
      cpuTempC: number | null;
    }
  | { ok: false; error: string };

function parseMetricLine(line: string): { name: string; labels: string; value: number } | null {
  const t = line.trim();
  if (!t || t.startsWith("#")) return null;
  const idxBrace = t.indexOf("{");
  if (idxBrace === -1) {
    const m = t.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\s+(-?[0-9.eE+-]+)\s*$/);
    if (!m) return null;
    return { name: m[1], labels: "", value: Number(m[2]) };
  }
  const idxEnd = t.indexOf("}", idxBrace);
  if (idxEnd === -1) return null;
  const name = t.slice(0, idxBrace);
  const labels = t.slice(idxBrace, idxEnd + 1);
  const rest = t.slice(idxEnd + 1).trim();
  const mv = rest.match(/^(-?[0-9.eE+-]+)/);
  if (!mv || !/^[a-zA-Z_:][a-zA-Z0-9_:]*$/.test(name)) return null;
  return { name, labels, value: Number(mv[1]) };
}

function labelValue(labels: string, key: string): string | undefined {
  const re = new RegExp(`${key}="([^"]*)"`);
  const m = labels.match(re);
  return m?.[1];
}

function inferArrayState(
  samples: Array<{ name: string; labels: string; value: number }>,
): "started" | "stopped" | "unknown" {
  for (const s of samples) {
    const n = s.name.toLowerCase();
    if (n.includes("unraid") && (n.includes("array") || n.includes("parity"))) {
      const v = Math.round(s.value);
      if (v === 1 || v === 2) return "started";
      if (v === 0) return "stopped";
    }
  }
  for (const s of samples) {
    if (s.name === "node_md_state" && s.labels.includes('device="md1"')) {
      return s.value >= 1 ? "started" : "stopped";
    }
  }
  return "unknown";
}

function poolUsagePct(
  samples: Array<{ name: string; labels: string; value: number }>,
  mount: string,
): number | null {
  let size: number | null = null;
  let avail: number | null = null;
  for (const s of samples) {
    if (s.name !== "node_filesystem_size_bytes" && s.name !== "node_filesystem_avail_bytes") continue;
    const mp = labelValue(s.labels, "mountpoint");
    if (mp !== mount) continue;
    if (s.name === "node_filesystem_size_bytes") size = s.value;
    if (s.name === "node_filesystem_avail_bytes") avail = s.value;
  }
  if (size == null || avail == null || size <= 0) return null;
  const used = size - avail;
  return Math.min(100, Math.max(0, (used / size) * 100));
}

function maxCpuTempC(samples: Array<{ name: string; labels: string; value: number }>): number | null {
  const names = new Set([
    "node_hwmon_temp_celsius",
    "node_thermal_zone_temp",
    "node_cpu_package_temp",
  ]);
  let max: number | null = null;
  for (const s of samples) {
    if (!names.has(s.name)) continue;
    if (!Number.isFinite(s.value) || s.value <= 0 || s.value > 125) continue;
    if (max == null || s.value > max) max = s.value;
  }
  return max;
}

export async function fetchUnraidInsights(): Promise<UnraidInsightPayload> {
  const url = getUnraidPrometheusUrl()?.trim();
  if (!url) {
    return {
      ok: false,
      error:
        "Définissez UNRAID_PROMETHEUS_URL dans .env (URL complète du endpoint /metrics, ex. node_exporter ou plugin Unraid).",
    };
  }
  const mount = getUnraidPoolMountpoint().trim() || "/mnt/user";
  const timeoutMs = getServiceCheckFetchTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await undiciFetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      dispatcher: insecureAgent,
      headers: { Accept: "text/plain" },
    });
    if (!res.ok) {
      return { ok: false, error: `Métriques HTTP ${res.status}` };
    }
    const text = await res.text();
    const samples: Array<{ name: string; labels: string; value: number }> = [];
    for (const line of text.split("\n")) {
      const p = parseMetricLine(line);
      if (p) samples.push(p);
    }
    return {
      ok: true,
      arrayState: inferArrayState(samples),
      poolMount: mount,
      poolUsedPct: poolUsagePct(samples, mount),
      cpuTempC: maxCpuTempC(samples),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur réseau";
    return { ok: false, error: msg.includes("abort") ? "Timeout ou réseau vers Unraid" : msg };
  } finally {
    clearTimeout(timeoutId);
  }
}
