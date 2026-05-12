import "server-only";
import { Agent, fetch as undiciFetch } from "undici";

import {
  getUnifiIp,
  getUnifiPass,
  getUnifiPort,
  getUnifiSiteName,
  getUnifiUser,
} from "@/lib/env.server";

const insecureAgent = new Agent({
  connect: { rejectUnauthorized: false },
});

export type UnifiSummaryResult =
  | {
      ok: true;
      clients: number;
      /** Octets/s (champs UniFi `*-bytes-r`). */
      downloadBytesPerSec: number;
      uploadBytesPerSec: number;
    }
  | { ok: false; error: string };

type UndiciResponse = Awaited<ReturnType<typeof undiciFetch>>;

function cookieHeaderFromResponse(res: UndiciResponse): string {
  const headers = res.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    return headers
      .getSetCookie()
      .map((c) => c.split(";")[0]?.trim())
      .filter(Boolean)
      .join("; ");
  }
  const single = res.headers.get("set-cookie");
  if (!single) return "";
  return single
    .split(/,(?=[^=]+=)/)
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

type Auth =
  | { mode: "legacy"; base: string; cookie: string }
  | { mode: "unos"; base: string; token: string };

async function authLegacy(
  host: string,
  port: string,
  user: string,
  pass: string,
): Promise<Auth | null> {
  const base = `https://${host}:${port}`;
  const res = await undiciFetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass, remember: true }),
    dispatcher: insecureAgent,
  });
  let j: { meta?: { rc?: string } } = {};
  try {
    j = (await res.json()) as { meta?: { rc?: string } };
  } catch {
    return null;
  }
  if (!res.ok || j.meta?.rc !== "ok") return null;
  const cookie = cookieHeaderFromResponse(res);
  if (!cookie) return null;
  return { mode: "legacy", base, cookie };
}

async function authUnifiOS(host: string, user: string, pass: string): Promise<Auth | null> {
  const base = `https://${host}`;
  const res = await undiciFetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass, remember: true }),
    dispatcher: insecureAgent,
  });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    meta?: { rc?: string };
    data?: Array<{ token?: string }>;
  };
  const token = j.data?.[0]?.token;
  if (!token || j.meta?.rc === "error") return null;
  return { mode: "unos", base, token };
}

async function resolveSiteKey(auth: Auth, siteFromEnv: string | undefined): Promise<string> {
  if (siteFromEnv) return siteFromEnv;
  if (auth.mode === "legacy") {
    const res = await undiciFetch(`${auth.base}/api/self/sites`, {
      headers: { Cookie: auth.cookie },
      dispatcher: insecureAgent,
    });
    const j = (await res.json()) as { data?: Array<{ name?: string }> };
    return j.data?.[0]?.name ?? "default";
  }
  return "default";
}

async function fetchUnifiJson(auth: Auth, site: string, path: string): Promise<unknown> {
  const rel = path.replace("{site}", encodeURIComponent(site));
  const url =
    auth.mode === "legacy"
      ? `${auth.base}${rel}`
      : `${auth.base}/proxy/network${rel}`;
  const headers: Record<string, string> =
    auth.mode === "legacy"
      ? { Cookie: auth.cookie }
      : { Authorization: `Bearer ${auth.token}` };
  const res = await undiciFetch(url, { headers, dispatcher: insecureAgent });
  return res.json();
}

function countClients(sta: unknown): number {
  if (!sta || typeof sta !== "object" || !("data" in sta)) return 0;
  const data = (sta as { data: unknown }).data;
  return Array.isArray(data) ? data.length : 0;
}

function sumStaRates(sta: unknown): { down: number; up: number } {
  if (!sta || typeof sta !== "object" || !("data" in sta)) return { down: 0, up: 0 };
  const data = (sta as { data: unknown[] }).data;
  if (!Array.isArray(data)) return { down: 0, up: 0 };
  let down = 0;
  let up = 0;
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, number | undefined>;
    down += r["rx_bytes-r"] ?? 0;
    up += r["tx_bytes-r"] ?? 0;
  }
  return { down, up };
}

function ratesFromGw(gw: unknown): { down: number; up: number } {
  if (!gw || typeof gw !== "object" || !("data" in gw)) return { down: 0, up: 0 };
  const data = (gw as { data: unknown[] }).data;
  if (!Array.isArray(data)) return { down: 0, up: 0 };
  let down = 0;
  let up = 0;
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const stat = (o.stat as Record<string, number | undefined> | undefined) ?? o;
    const d =
      (stat["rx_bytes-r"] as number | undefined) ??
      (o["rx_bytes-r"] as number | undefined) ??
      0;
    const u =
      (stat["tx_bytes-r"] as number | undefined) ??
      (o["tx_bytes-r"] as number | undefined) ??
      0;
    down += d;
    up += u;
  }
  return { down, up };
}

export async function getUnifiSummary(): Promise<UnifiSummaryResult> {
  const host = getUnifiIp();
  const user = getUnifiUser();
  const pass = getUnifiPass();
  const siteEnv = getUnifiSiteName();
  const port = getUnifiPort();

  if (!host || !user || !pass) {
    return {
      ok: false,
      error: "Variables UNIFI_IP, UNIFI_USER et UNIFI_PASS manquantes ou incomplètes.",
    };
  }

  let auth: Auth | null = await authLegacy(host, port, user, pass);
  if (!auth) {
    auth = await authUnifiOS(host, user, pass);
  }
  if (!auth) {
    return {
      ok: false,
      error: "Connexion au contrôleur UniFi impossible (identifiants ou URL).",
    };
  }

  const site = await resolveSiteKey(auth, siteEnv);

  const [sta, gw] = await Promise.all([
    fetchUnifiJson(auth, site, `/api/s/{site}/stat/sta`),
    fetchUnifiJson(auth, site, `/api/s/{site}/stat/gw`),
  ]);

  const clients = countClients(sta);
  let { down, up } = ratesFromGw(gw);
  if (down === 0 && up === 0) {
    const fromSta = sumStaRates(sta);
    down = fromSta.down;
    up = fromSta.up;
  }

  return { ok: true, clients, downloadBytesPerSec: down, uploadBytesPerSec: up };
}
